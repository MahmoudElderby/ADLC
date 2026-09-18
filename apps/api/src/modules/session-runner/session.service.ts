import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Session, SessionStartRequest, SessionStatus } from "@adlc/contracts";
import { OpenAISessionAdapter } from "../../integrations/openai/openai-session.adapter.js";
import { RedactionService } from "../../platform/security/redaction.service.js";
import { AgentRegistryService } from "../agent-registry/agent-registry.service.js";
import { AuditService } from "../observability-governance/audit.service.js";
import { WorkspaceEnvironmentService } from "../workspace-environment/workspace-environment.service.js";
import { SessionReadinessService } from "./session-readiness.service.js";

const terminalStatuses = new Set<SessionStatus>(["completed", "failed", "canceled", "interrupted"]);
const now = () => new Date().toISOString();

@Injectable()
export class SessionService {
  private readonly sessions = new Map<string, Session & { workspaceId: string }>();
  private readonly runtimeSecrets = new Map<string, string>();

  constructor(
    public readonly agentRegistryService: AgentRegistryService,
    private readonly readinessService: SessionReadinessService,
    public readonly workspaceEnvironmentService: WorkspaceEnvironmentService,
    private readonly openAISessionAdapter: OpenAISessionAdapter,
    private readonly auditService: AuditService,
    private readonly redactionService: RedactionService,
  ) {}

  async startSession(
    workspaceId: string,
    actorId: string,
    request: SessionStartRequest,
  ): Promise<Session> {
    const published = this.readinessService.assertReady(workspaceId, request);
    const environment = this.workspaceEnvironmentService.getEnvironment();
    const startedAt = now();
    const snapshotSummary = this.redactionService.redact({
      schemaVersion: 1,
      workspace: {
        id: workspaceId,
        type: environment.type,
        workspacePath: environment.workspacePath,
        connectorId: environment.connectorId,
      },
      agent: {
        id: published.agent.id,
        version: published.versionNumber,
        model: published.config.model,
        approvalMode: published.config.approvalMode,
        input: request.input,
      },
      capabilities: published.config.capabilities,
      runtime: { remoteUrl: "[REDACTED]" },
    });
    const openaiSession = await this.openAISessionAdapter.createSession({
      agentId: published.agent.id,
      model: published.config.model,
      instructions: published.config.instructions,
      approvalMode: "always_allow",
      capabilities: published.config.capabilities,
      input: request.input,
    });

    const session: Session & { workspaceId: string } = {
      id: crypto.randomUUID(),
      workspaceId,
      agentId: published.agent.id,
      agentVersionId: published.versionId,
      status: "provisioning",
      executorStatus: "requested",
      input: request.input,
      snapshotSummary,
      createdAt: startedAt,
      startedAt,
      terminalAt: null,
      failureSummary: null,
    };

    this.sessions.set(session.id, session);
    this.runtimeSecrets.set(session.id, openaiSession.remoteUrl);
    void this.auditService.record({
      workspaceId,
      actorId,
      action: "session.started",
      entityType: "session",
      entityId: session.id,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { agentId: session.agentId, openai: openaiSession.responseRedacted },
    });
    return session;
  }

  listSessions(workspaceId: string, status?: SessionStatus): Session[] {
    return [...this.sessions.values()].filter(
      (session) => session.workspaceId === workspaceId && (!status || session.status === status),
    );
  }

  getSession(workspaceId: string, sessionId: string): Session {
    const session = this.sessions.get(sessionId);
    if (!session || session.workspaceId !== workspaceId) {
      throw new NotFoundException("Session not found.");
    }
    return session;
  }

  findSessionById(sessionId: string): (Session & { workspaceId: string }) | undefined {
    return this.sessions.get(sessionId);
  }

  cancelSession(workspaceId: string, actorId: string, sessionId: string): Session {
    const session = this.getStoredSession(workspaceId, sessionId);
    if (terminalStatuses.has(session.status)) {
      throw new ConflictException("Terminal sessions cannot be canceled again.");
    }
    return this.transition(workspaceId, actorId, sessionId, "canceled", "User canceled session.");
  }

  transition(
    workspaceId: string,
    actorId: string,
    sessionId: string,
    status: SessionStatus,
    failureSummary?: string,
  ): Session {
    const session = this.getStoredSession(workspaceId, sessionId);
    if (terminalStatuses.has(session.status)) {
      return session;
    }

    const terminal = terminalStatuses.has(status);
    const updated: Session & { workspaceId: string } = {
      ...session,
      status,
      executorStatus: terminal
        ? "stopped"
        : status === "running"
          ? "connected"
          : session.executorStatus,
      terminalAt: terminal ? now() : null,
      failureSummary: failureSummary ?? session.failureSummary,
    };
    this.sessions.set(sessionId, updated);
    void this.auditService.record({
      workspaceId,
      actorId,
      action: "session.state_changed",
      entityType: "session",
      entityId: sessionId,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { previous: session.status, current: status },
    });
    return updated;
  }

  getRuntimeSecret(sessionId: string): string | undefined {
    return this.runtimeSecrets.get(sessionId);
  }

  claimRuntimeSecret(sessionId: string): string | undefined {
    const secret = this.runtimeSecrets.get(sessionId);
    if (secret) {
      this.runtimeSecrets.delete(sessionId);
    }
    return secret;
  }

  private getStoredSession(
    workspaceId: string,
    sessionId: string,
  ): Session & { workspaceId: string } {
    const session = this.sessions.get(sessionId);
    if (!session || session.workspaceId !== workspaceId) {
      throw new NotFoundException("Session not found.");
    }
    return session;
  }
}
