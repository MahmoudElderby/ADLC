import { Injectable } from "@nestjs/common";
import type { Session, SessionStatus } from "@adlc/contracts";
import { SessionService } from "../session-runner/session.service.js";

const terminal = new Set<SessionStatus>(["completed", "failed", "canceled", "interrupted"]);
export type LiveFleetRow = {
  sessionId: string;
  workspaceId: string;
  agentId: string;
  status: "creating" | "provisioning" | "running";
  lastSummary: string | null;
  lastEventAt: string;
};

@Injectable()
export class LiveFleetProjector {
  private readonly rows = new Map<string, LiveFleetRow>();
  constructor(private readonly sessions: SessionService) {
    this.sessions.setLiveFleetProjector(this);
  }

  sync(session: Session & { workspaceId: string }): void {
    if (terminal.has(session.status)) {
      this.rows.delete(session.id);
      return;
    }
    this.rows.set(session.id, {
      sessionId: session.id,
      workspaceId: session.workspaceId,
      agentId: session.agentId,
      status: session.status as LiveFleetRow["status"],
      lastSummary: session.failureSummary,
      lastEventAt: session.terminalAt ?? session.startedAt ?? session.createdAt,
    });
  }

  list(workspaceId: string): LiveFleetRow[] {
    return [...this.rows.values()].filter((row) => row.workspaceId === workspaceId);
  }

  update(sessionId: string, summary: string): void {
    const row = this.rows.get(sessionId);
    if (row)
      this.rows.set(sessionId, {
        ...row,
        lastSummary: summary,
        lastEventAt: new Date().toISOString(),
      });
  }
}
