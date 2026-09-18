import { Inject, Injectable } from "@nestjs/common";
import type { Session, SessionStatus } from "@adlc/contracts";
import { liveFleetSessions } from "@adlc/database";
import { eq } from "drizzle-orm";
import { DATABASE, type Database } from "../../platform/database/database.module.js";
import { SessionService } from "../session-runner/session.service.js";

const terminal = new Set<SessionStatus>(["completed", "failed", "canceled", "interrupted"]);

export type LiveFleetRow = {
  sessionId: string;
  workspaceId: string;
  agentId: string;
  agentName: string;
  status: "creating" | "provisioning" | "running";
  skillCount: number;
  mcpCount: number;
  lastSummary: string | null;
  lastEventAt: string;
  startedAt: string | null;
};

@Injectable()
export class LiveFleetProjector {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {
    this.sessions.setLiveFleetProjector(this);
  }

  async sync(session: Session & { workspaceId: string }): Promise<void> {
    if (terminal.has(session.status)) {
      await this.db.delete(liveFleetSessions).where(eq(liveFleetSessions.sessionId, session.id));
      return;
    }
    const agent = await this.sessions.agentRegistryService.getAgent(
      session.workspaceId,
      session.agentId,
    );
    const skillCount = agent.capabilities.filter((capability) => capability.type === "skill").length;
    const mcpCount = agent.capabilities.filter((capability) => capability.type === "mcp_server")
      .length;
    await this.db
      .insert(liveFleetSessions)
      .values({
        sessionId: session.id,
        workspaceId: session.workspaceId,
        agentId: session.agentId,
        agentName: agent.name,
        status: session.status as LiveFleetRow["status"],
        skillCount,
        mcpCount,
        lastSummary: session.failureSummary,
        lastEventAt: new Date(session.terminalAt ?? session.startedAt ?? session.createdAt),
        startedAt: session.startedAt ? new Date(session.startedAt) : null,
        capabilitySummaryJson: { skillCount, mcpCount },
      })
      .onConflictDoUpdate({
        target: liveFleetSessions.sessionId,
        set: {
          status: session.status,
          lastSummary: session.failureSummary,
          lastEventAt: new Date(),
          skillCount,
          mcpCount,
          agentName: agent.name,
        },
      });
  }

  async list(workspaceId: string): Promise<LiveFleetRow[]> {
    const rows = await this.db
      .select()
      .from(liveFleetSessions)
      .where(eq(liveFleetSessions.workspaceId, workspaceId));
    return rows.map((row) => ({
      sessionId: row.sessionId,
      workspaceId: row.workspaceId,
      agentId: row.agentId,
      agentName: row.agentName,
      status: row.status as LiveFleetRow["status"],
      skillCount: row.skillCount,
      mcpCount: row.mcpCount,
      lastSummary: row.lastSummary,
      lastEventAt: row.lastEventAt.toISOString(),
      startedAt: row.startedAt?.toISOString() ?? null,
    }));
  }

  async update(sessionId: string, summary: string): Promise<void> {
    await this.db
      .update(liveFleetSessions)
      .set({ lastSummary: summary, lastEventAt: new Date() })
      .where(eq(liveFleetSessions.sessionId, sessionId));
  }
}
