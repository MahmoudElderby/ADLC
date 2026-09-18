import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  agentVersions,
  agents,
  workspaceConnectors,
  workspaceEnvironmentSettings,
  workspaceSecrets,
  workspaceUsers,
  workspaces,
} from "@adlc/database";
import { and, eq, sql } from "drizzle-orm";
import { RedactionService } from "../security/redaction.service.js";
import { SecretVaultService } from "../security/secret-vault.service.js";
import { DATABASE, type Database } from "./database.tokens.js";
import { hashPassword, hashSessionToken } from "../auth/session-policy.js";

const defaultWorkspacePath = process.env.ADLC_WORKSPACE_PATH ?? "/workspace/adlc";

export type WorkspaceGraph = {
  workspaceId: string;
  operatorId?: string;
  connectorId: string;
  environmentId: string;
  workspacePath: string;
  connectorVersion: string;
  connectorStatus: "offline" | "online" | "degraded";
  healthJson: Record<string, unknown>;
};

@Injectable()
export class WorkspaceBootstrap {
  private readonly logger = new Logger(WorkspaceBootstrap.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(SecretVaultService) private readonly vault: SecretVaultService,
    @Inject(RedactionService) private readonly redaction: RedactionService,
  ) {}

  async ensurePlatformWorkspace(): Promise<WorkspaceGraph> {
    const workspaceName = process.env.ADLC_WORKSPACE_NAME ?? "ADLC workspace";
    const operatorEmail = (process.env.ADLC_OPERATOR_EMAIL ?? "operator@adlc.local")
      .trim()
      .toLowerCase();
    const operatorPassword = process.env.ADLC_OPERATOR_PASSWORD ?? "ChangeMeOperatorPass1";
    const operatorDisplayName = process.env.ADLC_OPERATOR_DISPLAY_NAME ?? "Operator";
    const connectorToken = process.env.ADLC_CONNECTOR_TOKEN;

    const [existingOperator] = await this.db
      .select({
        id: workspaceUsers.id,
        workspaceId: workspaceUsers.workspaceId,
      })
      .from(workspaceUsers)
      .where(sql`lower(${workspaceUsers.email}) = ${operatorEmail}`)
      .limit(1);

    let workspace;
    let operatorId = existingOperator?.id;
    if (existingOperator) {
      const [owned] = await this.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, existingOperator.workspaceId))
        .limit(1);
      workspace = owned;
    }

    if (!workspace) {
      const [named] = await this.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.name, workspaceName))
        .limit(1);
      const [first] = named ? [named] : await this.db.select().from(workspaces).limit(1);
      const [occupant] = first
        ? await this.db
            .select({ id: workspaceUsers.id })
            .from(workspaceUsers)
            .where(eq(workspaceUsers.workspaceId, first.id))
            .limit(1)
        : [];
      workspace =
        first && !occupant
          ? first
          : (
              await this.db
                .insert(workspaces)
                .values({
                  name: workspaceName,
                  openaiProjectId: "proj_walking_skeleton",
                })
                .returning()
            )[0];
    }

    if (!operatorId) {
      const passwordHash = await hashPassword(operatorPassword);
      const [user] = await this.db
        .insert(workspaceUsers)
        .values({
          workspaceId: workspace.id,
          email: operatorEmail,
          displayName: operatorDisplayName,
          passwordHash,
        })
        .returning({ id: workspaceUsers.id });
      operatorId = user.id;
    }

    const [existingConnector] = await this.db
      .select()
      .from(workspaceConnectors)
      .where(eq(workspaceConnectors.workspaceId, workspace.id))
      .limit(1);

    let connector = existingConnector;
    if (!connector) {
      const encrypted = this.vault.encrypt("executor-placeholder");
      const [secret] = await this.db
        .insert(workspaceSecrets)
        .values({
          workspaceId: workspace.id,
          type: "openai_executor_key",
          encryptedValue: encrypted.ciphertext,
          keyVersion: encrypted.keyVersion,
          fingerprint: encrypted.fingerprint,
        })
        .returning();

      const tokenHash = hashSessionToken(connectorToken ?? "replace-with-one-time-connector-token-min-24");
      const [created] = await this.db
        .insert(workspaceConnectors)
        .values({
          workspaceId: workspace.id,
          name: "self-hosted-connector",
          authTokenHash: tokenHash,
          hostFingerprint: "unregistered",
          status: "offline",
          version: "0.1.0",
          capabilitiesJson: { filesystem: true, network: true },
          lastHeartbeatAt: null,
        })
        .returning();
      connector = created;

      const healthJson = this.redaction.redact({
        status: "unavailable",
        connector: "offline",
        canProbeReachability: false,
        filesystem: "unknown",
        executor: "unknown",
        checkedAt: new Date().toISOString(),
        issues: ["Workspace connector has not checked in."],
      });

      await this.db.insert(workspaceEnvironmentSettings).values({
        workspaceId: workspace.id,
        type: "self_hosted",
        workspacePath: defaultWorkspacePath,
        connectorId: connector.id,
        openaiExecutorSecretId: secret.id,
        status: "pending_validation",
        healthJson,
        validatedAt: null,
      });
    }

    const [environment] = await this.db
      .select()
      .from(workspaceEnvironmentSettings)
      .where(eq(workspaceEnvironmentSettings.workspaceId, workspace.id))
      .limit(1);

    if (operatorId) {
      await this.seedPublishedAgent(workspace.id, operatorId);
    }

    return {
      workspaceId: workspace.id,
      operatorId,
      connectorId: connector.id,
      environmentId: environment?.id ?? connector.id,
      workspacePath: environment?.workspacePath ?? defaultWorkspacePath,
      connectorVersion: connector.version,
      connectorStatus: connector.status,
      healthJson: (environment?.healthJson ?? {}) as Record<string, unknown>,
    };
  }

  async ensureWorkspace(workspaceId?: string): Promise<WorkspaceGraph> {
    const platform = await this.ensurePlatformWorkspace();
    if (!workspaceId || workspaceId === platform.workspaceId) {
      return platform;
    }

    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    if (!workspace) {
      throw new Error("Workspace does not exist.");
    }

    const [environment] = await this.db
      .select()
      .from(workspaceEnvironmentSettings)
      .where(eq(workspaceEnvironmentSettings.workspaceId, workspaceId))
      .limit(1);
    if (!environment) {
      return platform;
    }
    const [connector] = await this.db
      .select()
      .from(workspaceConnectors)
      .where(eq(workspaceConnectors.id, environment.connectorId))
      .limit(1);
    return {
      workspaceId,
      connectorId: environment.connectorId,
      environmentId: environment.id,
      workspacePath: environment.workspacePath,
      connectorVersion: connector?.version ?? "0.1.0",
      connectorStatus: (connector?.status ?? "offline") as WorkspaceGraph["connectorStatus"],
      healthJson: (environment.healthJson ?? {}) as Record<string, unknown>,
    };
  }

  private async seedPublishedAgent(workspaceId: string, createdBy: string): Promise<void> {
    const name = "Seeded published agent";
    const [existing] = await this.db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.workspaceId, workspaceId), eq(agents.name, name)))
      .limit(1);
    if (existing) {
      return;
    }

    const [agent] = await this.db
      .insert(agents)
      .values({
        workspaceId,
        name,
        description: "Seeded published agent for capability delete-guard demonstrations.",
        status: "published",
        createdBy,
      })
      .returning();

    const [version] = await this.db
      .insert(agentVersions)
      .values({
        agentId: agent.id,
        versionNumber: 1,
        lifecycle: "published",
        name,
        description: agent.description,
        model: "gpt-5.6-terra",
        instructions: "Seeded agent. No capability attachments until attachCapabilityToSeededAgent.",
        approvalMode: "always_allow",
        publishedAt: new Date(),
        createdBy,
      })
      .returning();

    await this.db
      .update(agents)
      .set({
        currentPublishedVersionId: version.id,
        currentDraftVersionId: null,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agent.id));
  }
}
