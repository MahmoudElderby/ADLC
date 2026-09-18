import { Inject, Injectable } from "@nestjs/common";
import { createHmac } from "node:crypto";
import { RedactionService } from "../../platform/security/redaction.service.js";
import { SecretVaultService } from "../../platform/security/secret-vault.service.js";
import { DATABASE, type Database } from "../../platform/database/database.module.js";
import {
  workspaceConnectors,
  workspaceEnvironmentSettings,
  workspaceSecrets,
  workspaces,
} from "@adlc/database";
import { eq } from "drizzle-orm";

const defaultWorkspacePath = process.env.ADLC_WORKSPACE_PATH ?? "/workspace/adlc";

export type WorkspaceGraph = {
  workspaceId: string;
  connectorId: string;
  environmentId: string;
  workspacePath: string;
  connectorVersion: string;
  connectorStatus: "offline" | "online" | "degraded";
  healthJson: Record<string, unknown>;
};

@Injectable()
export class WorkspaceBootstrap {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly vault: SecretVaultService,
    private readonly redaction: RedactionService,
  ) {}

  async ensureWorkspace(workspaceId: string): Promise<WorkspaceGraph> {
    const existing = await this.db
      .select()
      .from(workspaceEnvironmentSettings)
      .where(eq(workspaceEnvironmentSettings.workspaceId, workspaceId))
      .limit(1);
    if (existing[0]) {
      const connector = await this.db
        .select()
        .from(workspaceConnectors)
        .where(eq(workspaceConnectors.id, existing[0].connectorId))
        .limit(1);
      return {
        workspaceId,
        connectorId: existing[0].connectorId,
        environmentId: existing[0].id,
        workspacePath: existing[0].workspacePath,
        connectorVersion: connector[0]?.version ?? "0.1.0",
        connectorStatus: (connector[0]?.status ?? "offline") as WorkspaceGraph["connectorStatus"],
        healthJson: (existing[0].healthJson ?? {}) as Record<string, unknown>,
      };
    }

    await this.db
      .insert(workspaces)
      .values({
        id: workspaceId,
        name: "ADLC workspace",
        openaiProjectId: "proj_walking_skeleton",
      })
      .onConflictDoNothing();

    const encrypted = this.vault.encrypt("executor-placeholder");
    const [secret] = await this.db
      .insert(workspaceSecrets)
      .values({
        workspaceId,
        type: "openai_executor_key",
        encryptedValue: encrypted.ciphertext,
        keyVersion: encrypted.keyVersion,
        fingerprint: encrypted.fingerprint,
      })
      .returning();

    const tokenHash = createHmac(
      "sha256",
      process.env.CONNECTOR_TOKEN_SALT ?? "adlc-dev-salt",
    )
      .update("connector-dev-token")
      .digest("hex");

    const [connector] = await this.db
      .insert(workspaceConnectors)
      .values({
        workspaceId,
        name: "self-hosted-connector",
        authTokenHash: tokenHash,
        hostFingerprint: "dev-host",
        status: "online",
        version: "0.1.0",
        capabilitiesJson: { filesystem: true, network: true },
        lastHeartbeatAt: new Date(),
      })
      .returning();

    const healthJson = this.redaction.redact({
      status: "healthy",
      connector: "online",
      filesystem: "healthy",
      executor: "available",
      checkedAt: new Date().toISOString(),
      issues: [],
    });

    const [environment] = await this.db
      .insert(workspaceEnvironmentSettings)
      .values({
        workspaceId,
        type: "self_hosted",
        workspacePath: defaultWorkspacePath,
        connectorId: connector.id,
        openaiExecutorSecretId: secret.id,
        status: "valid",
        healthJson,
        validatedAt: new Date(),
      })
      .returning();

    return {
      workspaceId,
      connectorId: connector.id,
      environmentId: environment.id,
      workspacePath: environment.workspacePath,
      connectorVersion: connector.version,
      connectorStatus: connector.status,
      healthJson: healthJson as Record<string, unknown>,
    };
  }
}
