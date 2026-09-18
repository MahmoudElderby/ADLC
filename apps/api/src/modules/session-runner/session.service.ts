import { createHash } from "node:crypto";
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Session, SessionStartRequest, SessionStatus } from "@adlc/contracts";
import {
  agentSessions,
  liveFleetSessions,
  sessionRuntimeSecrets,
  workspaceConnectorCommands,
} from "@adlc/database";
import { and, eq } from "drizzle-orm";
import { OpenAISessionAdapter } from "../../integrations/openai/openai-session.adapter.js";
import { DATABASE, type Database } from "../../platform/database/database.module.js";
import { WorkspaceBootstrap } from "../../platform/database/workspace-bootstrap.js";
import { RedactionService } from "../../platform/security/redaction.service.js";
import { SecretVaultService } from "../../platform/security/secret-vault.service.js";
import { AgentRegistryService } from "../agent-registry/agent-registry.service.js";
import { CapabilityRegistryService } from "../capability-registry/capability-registry.service.js";
import { AuditService } from "../observability-governance/audit.service.js";
import { WorkspaceEnvironmentService } from "../workspace-environment/workspace-environment.service.js";
import { SessionReadinessService } from "./session-readiness.service.js";

const terminalStatuses = new Set<SessionStatus>(["completed", "failed", "canceled", "interrupted"]);

@Injectable()
export class SessionService {
  private liveFleetProjector?: {
    sync: (session: Session & { workspaceId: string }) => Promise<void> | void;
    update?: (sessionId: string, summary: string) => Promise<void> | void;
  };

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly bootstrap: WorkspaceBootstrap,
    public readonly agentRegistryService: AgentRegistryService,
    public readonly capabilityRegistryService: CapabilityRegistryService,
    private readonly readinessService: SessionReadinessService,
    public readonly workspaceEnvironmentService: WorkspaceEnvironmentService,
    private readonly openAISessionAdapter: OpenAISessionAdapter,
    private readonly auditService: AuditService,
    private readonly redactionService: RedactionService,
    private readonly secretVault: SecretVaultService,
  ) {}

  async startSession(
    workspaceId: string,
    actorId: string,
    request: SessionStartRequest,
  ): Promise<Session> {
    const published = await this.readinessService.assertReady(workspaceId, request);
    const graph = await this.bootstrap.ensureWorkspace(workspaceId);
    const environment = await this.workspaceEnvironmentService.getEnvironment(workspaceId);
    const snapshot = await this.buildSnapshot(workspaceId, published, request.input, graph);

    const [row] = await this.db
      .insert(agentSessions)
      .values({
        workspaceId,
        agentId: published.agent.id,
        agentVersionId: published.versionId,
        status: "creating",
        executorStatus: "not_requested",
        initialInput: request.input,
        effectiveConfigSnapshotJson: snapshot,
        createdBy: actorId,
      })
      .returning();
    let session = this.toSession(row);
    await this.liveFleetProjector?.sync(session);
    await this.auditService.record({
      workspaceId,
      actorId,
      action: "session.started",
      entityType: "session",
      entityId: session.id,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { agentId: session.agentId },
    });

    const openaiSession = await this.openAISessionAdapter.createSession({
      agentId: published.agent.id,
      model: published.config.model,
      instructions: published.config.instructions,
      approvalMode: "always_allow",
      capabilities: published.config.capabilities,
      input: request.input,
    });
    const encrypted = this.secretVault.encrypt(openaiSession.remoteUrl);
    await this.db.insert(sessionRuntimeSecrets).values({
      sessionId: session.id,
      remoteUrlEncrypted: encrypted.ciphertext,
      keyVersion: encrypted.keyVersion,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const [updated] = await this.db
      .update(agentSessions)
      .set({
        status: "provisioning",
        executorStatus: "requested",
        openaiSessionId: openaiSession.sessionId,
        openaiEnvironmentId: openaiSession.environmentId,
        startedAt: new Date(),
        lastEventAt: new Date(),
      })
      .where(eq(agentSessions.id, session.id))
      .returning();
    session = this.toSession(updated);
    await this.db.insert(workspaceConnectorCommands).values({
      connectorId: environment.connectorId,
      sessionId: session.id,
      commandType: "start_executor",
      status: "pending",
      payloadRedactedJson: this.redactionService.redact({
        environmentId: openaiSession.environmentId,
        workspacePath: environment.workspacePath,
      }),
    });
    await this.liveFleetProjector?.sync(session);
    await this.auditService.record({
      workspaceId,
      actorId,
      action: "session.provisioned",
      entityType: "session",
      entityId: session.id,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { openai: openaiSession.responseRedacted },
    });
    return session;
  }

  async listSessions(workspaceId: string, status?: SessionStatus): Promise<Session[]> {
    const rows = await this.db
      .select()
      .from(agentSessions)
      .where(eq(agentSessions.workspaceId, workspaceId));
    return rows
      .map((row) => this.toSession(row))
      .filter((session) => !status || session.status === status);
  }

  async getSession(workspaceId: string, sessionId: string): Promise<Session> {
    return this.getStoredSession(workspaceId, sessionId);
  }

  async findSessionById(sessionId: string): Promise<(Session & { workspaceId: string }) | undefined> {
    const [row] = await this.db
      .select()
      .from(agentSessions)
      .where(eq(agentSessions.id, sessionId))
      .limit(1);
    return row ? this.toSession(row) : undefined;
  }

  async cancelSession(workspaceId: string, actorId: string, sessionId: string): Promise<Session> {
    const session = await this.getStoredSession(workspaceId, sessionId);
    if (terminalStatuses.has(session.status)) {
      throw new ConflictException("Terminal sessions cannot be canceled again.");
    }
    const environment = await this.workspaceEnvironmentService.getEnvironment(workspaceId);
    await this.db.insert(workspaceConnectorCommands).values({
      connectorId: environment.connectorId,
      sessionId,
      commandType: "stop_executor",
      status: "pending",
      payloadRedactedJson: this.redactionService.redact({ reason: "user_canceled" }),
    });
    return this.transition(workspaceId, actorId, sessionId, "canceled", "User canceled session.");
  }

  async transition(
    workspaceId: string,
    actorId: string,
    sessionId: string,
    status: SessionStatus,
    failureSummary?: string,
  ): Promise<Session> {
    const session = await this.getStoredSession(workspaceId, sessionId);
    if (terminalStatuses.has(session.status)) {
      return session;
    }
    const terminal = terminalStatuses.has(status);
    const mapped = await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(agentSessions)
        .set({
          status,
          executorStatus: terminal
            ? "stopped"
            : status === "running"
              ? "connected"
              : session.executorStatus,
          terminalAt: terminal ? new Date() : null,
          failureSummary: failureSummary ?? session.failureSummary,
          lastEventAt: new Date(),
        })
        .where(and(eq(agentSessions.id, sessionId), eq(agentSessions.workspaceId, workspaceId)))
        .returning();
      if (terminal) {
        await tx.delete(liveFleetSessions).where(eq(liveFleetSessions.sessionId, sessionId));
      }
      return this.toSession(updated);
    });
    if (!terminal) {
      await this.liveFleetProjector?.sync(mapped);
    }
    await this.auditService.record({
      workspaceId,
      actorId,
      action: "session.state_changed",
      entityType: "session",
      entityId: sessionId,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { previous: session.status, current: status },
    });
    return mapped;
  }

  setLiveFleetProjector(projector: {
    sync: (session: Session & { workspaceId: string }) => Promise<void> | void;
    update?: (sessionId: string, summary: string) => Promise<void> | void;
  }): void {
    this.liveFleetProjector = projector;
  }

  async updateLiveFleet(sessionId: string, summary: string): Promise<void> {
    await this.liveFleetProjector?.update?.(sessionId, summary);
  }

  async getRuntimeSecret(sessionId: string): Promise<string | undefined> {
    const [row] = await this.db
      .select()
      .from(sessionRuntimeSecrets)
      .where(eq(sessionRuntimeSecrets.sessionId, sessionId))
      .limit(1);
    if (!row) {
      return undefined;
    }
    return this.secretVault.decrypt({
      ciphertext: row.remoteUrlEncrypted,
      fingerprint: createHash("sha256").update(row.remoteUrlEncrypted).digest("hex").slice(0, 16),
      keyVersion: row.keyVersion,
    });
  }

  async claimRuntimeSecret(sessionId: string): Promise<string | undefined> {
    const secret = await this.getRuntimeSecret(sessionId);
    if (secret) {
      await this.db
        .delete(sessionRuntimeSecrets)
        .where(eq(sessionRuntimeSecrets.sessionId, sessionId));
    }
    return secret;
  }

  private async getStoredSession(
    workspaceId: string,
    sessionId: string,
  ): Promise<Session & { workspaceId: string }> {
    const [row] = await this.db
      .select()
      .from(agentSessions)
      .where(and(eq(agentSessions.id, sessionId), eq(agentSessions.workspaceId, workspaceId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException("Session not found.");
    }
    return this.toSession(row);
  }

  private toSession(row: typeof agentSessions.$inferSelect): Session & { workspaceId: string } {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      agentId: row.agentId,
      agentVersionId: row.agentVersionId,
      status: row.status,
      executorStatus: row.executorStatus,
      input: row.initialInput,
      snapshotSummary: (row.effectiveConfigSnapshotJson ?? { schemaVersion: 1 }) as Session["snapshotSummary"],
      createdAt: row.createdAt.toISOString(),
      startedAt: row.startedAt?.toISOString() ?? null,
      terminalAt: row.terminalAt?.toISOString() ?? null,
      failureSummary: row.failureSummary,
    };
  }

  private async buildSnapshot(
    workspaceId: string,
    published: Awaited<ReturnType<AgentRegistryService["getPublishedAgentForSession"]>>,
    input: string,
    graph: Awaited<ReturnType<WorkspaceBootstrap["ensureWorkspace"]>>,
  ) {
    const skillAttachments = published.config.capabilities.filter((item) => item.type === "skill");
    const mcpAttachments = published.config.capabilities.filter((item) => item.type === "mcp_server");
    const skillDetails = await Promise.all(
      skillAttachments.map(async (item) => {
        const skill = await this.capabilityRegistryService.getSkill(workspaceId, item.capabilityId);
        return {
          id: skill.id,
          sourceReference: skill.sourceReference,
          version: skill.version,
          compatibility: ["self_hosted"],
          capabilityDirectories: skill.capabilityDirectories,
        };
      }),
    );
    const mcpDetails = await Promise.all(
      mcpAttachments.map(async (item) => {
        const mcp = await this.capabilityRegistryService.getMcp(workspaceId, item.capabilityId);
        const url = new URL(mcp.serverUrl);
        return {
          id: mcp.id,
          label: mcp.label,
          host: url.host,
          origin: url.origin,
          allowedTools: mcp.allowedTools,
          required: mcp.required,
          credentialFingerprint: mcp.credentialSecretId ? mcp.credentialHealth : null,
        };
      }),
    );
    return this.redactionService.redact({
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      workspace: {
        id: workspaceId,
        type: "self_hosted",
        workspacePath: graph.workspacePath,
        connectorId: graph.connectorId,
        connectorVersion: graph.connectorVersion,
      },
      agent: {
        id: published.agent.id,
        versionId: published.versionId,
        version: published.versionNumber,
        model: published.config.model,
        instructionsHash: published.instructionsHash,
        approvalMode: published.config.approvalMode,
        input,
      },
      skills: skillDetails,
      mcpServers: mcpDetails,
      capabilities: published.config.capabilities,
      runtime: { remoteUrl: "[REDACTED]" },
    });
  }
}
