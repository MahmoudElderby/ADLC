import { Inject, Injectable } from "@nestjs/common";
import type { SessionInvestigation } from "@adlc/contracts";
import { ArtifactService } from "./artifact.service.js";
import { AuditService } from "./audit.service.js";
import { SessionEventService } from "../session-runner/session-event.service.js";
import { SessionService } from "../session-runner/session.service.js";

@Injectable()
export class TraceService {
  constructor(
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(SessionEventService) private readonly events: SessionEventService,
    @Inject(ArtifactService) private readonly artifacts: ArtifactService,
    @Inject(AuditService) private readonly audits: AuditService,
  ) {}

  async getTrace(workspaceId: string, sessionId: string, afterSequence = 0) {
    await this.sessions.getSession(workspaceId, sessionId);
    return (await this.events.listNormalized(sessionId)).filter(
      (event) => event.sequence > afterSequence,
    );
  }

  async getInvestigation(workspaceId: string, sessionId: string): Promise<SessionInvestigation> {
    const session = await this.sessions.getSession(workspaceId, sessionId);
    return {
      session,
      trace: await this.getTrace(workspaceId, sessionId),
      artifacts: await this.artifacts.listSessionArtifacts(workspaceId, sessionId),
      snapshot: session.snapshotSummary ?? { schemaVersion: 1 },
      audits: await this.audits.listEntriesForEntity(workspaceId, "session", sessionId),
    } as SessionInvestigation;
  }
}
