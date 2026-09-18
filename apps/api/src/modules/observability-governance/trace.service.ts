import { Injectable } from "@nestjs/common";
import type { SessionInvestigation } from "@adlc/contracts";
import { ArtifactService } from "./artifact.service.js";
import { AuditService } from "./audit.service.js";
import { SessionEventService } from "../session-runner/session-event.service.js";
import { SessionService } from "../session-runner/session.service.js";

@Injectable()
export class TraceService {
  constructor(
    private readonly sessions: SessionService,
    private readonly events: SessionEventService,
    private readonly artifacts: ArtifactService,
    private readonly audits: AuditService,
  ) {}

  getTrace(workspaceId: string, sessionId: string, afterSequence = 0) {
    this.sessions.getSession(workspaceId, sessionId);
    return this.events.listNormalized(sessionId).filter((event) => event.sequence > afterSequence);
  }

  async getInvestigation(workspaceId: string, sessionId: string): Promise<SessionInvestigation> {
    const session = this.sessions.getSession(workspaceId, sessionId);
    return {
      session,
      trace: this.getTrace(workspaceId, sessionId),
      artifacts: this.artifacts.listSessionArtifacts(workspaceId, sessionId),
      snapshot: session.snapshotSummary ?? { schemaVersion: 1 },
      audits: (await this.audits.listForEntity(workspaceId, "session", sessionId)).map((audit) => ({
        id: audit.id,
        actorId: audit.actorId,
        action: audit.action,
        entityType: audit.entityType,
        entityId: audit.entityId,
        outcome: audit.outcome,
        metadata: audit.metadataRedactedJson,
        createdAt: audit.createdAt.toISOString(),
      })),
    } as SessionInvestigation;
  }
}
