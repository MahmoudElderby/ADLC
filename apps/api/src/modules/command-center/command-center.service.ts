import { Injectable } from "@nestjs/common";
import type { LiveFleetItem, SessionHistoryItem } from "@adlc/contracts";
import { ArtifactService } from "../observability-governance/artifact.service.js";
import { AuditService } from "../observability-governance/audit.service.js";
import { SessionEventService } from "../session-runner/session-event.service.js";
import { SessionService } from "../session-runner/session.service.js";
import { LiveFleetProjector } from "./live-fleet-projector.js";

@Injectable()
export class CommandCenterService {
  constructor(
    private readonly sessions: SessionService,
    private readonly events: SessionEventService,
    private readonly artifacts: ArtifactService,
    private readonly audits: AuditService,
    private readonly projector?: LiveFleetProjector,
  ) {}

  async getLiveFleet(workspaceId: string): Promise<LiveFleetItem[]> {
    const rows = this.projector
      ? await this.projector.list(workspaceId)
      : (await this.sessions.listSessions(workspaceId))
          .filter((session) => !["completed", "failed", "canceled", "interrupted"].includes(session.status))
          .map((session) => ({
            sessionId: session.id,
            workspaceId,
            agentId: session.agentId,
            agentName: "",
            status: session.status as "creating" | "provisioning" | "running",
            skillCount: 0,
            mcpCount: 0,
            lastSummary: session.failureSummary,
            lastEventAt: session.startedAt ?? session.createdAt,
            startedAt: session.startedAt,
          }));

    const items: LiveFleetItem[] = [];
    for (const row of rows) {
      const session = await this.sessions.getSession(workspaceId, row.sessionId);
      const agent = await this.sessions.agentRegistryService.getAgent(workspaceId, row.agentId);
      const events = await this.events.listNormalized(row.sessionId);
      items.push({
        sessionId: row.sessionId,
        agentId: row.agentId,
        agentName: agent.name,
        status: row.status,
        skillCount: agent.capabilities.filter((capability) => capability.type === "skill").length,
        mcpCount: agent.capabilities.filter((capability) => capability.type === "mcp_server").length,
        lastSummary: events.at(-1)?.summary ?? row.lastSummary,
        lastEventAt: events.at(-1)?.occurredAt ?? row.lastEventAt,
        links: { session: `/sessions/${session.id}`, agent: `/agents/${agent.id}` },
      });
    }
    return items;
  }

  async listHistory(workspaceId: string): Promise<SessionHistoryItem[]> {
    const sessions = await this.sessions.listSessions(workspaceId);
    return Promise.all(
      sessions.map(async (session) => {
        const agent = await this.sessions.agentRegistryService.getAgent(workspaceId, session.agentId);
        return {
          sessionId: session.id,
          agentId: agent.id,
          agentName: agent.name,
          status: session.status,
          createdAt: session.createdAt,
          terminalAt: session.terminalAt,
          failureSummary: session.failureSummary,
          links: { session: `/sessions/${session.id}`, agent: `/agents/${agent.id}` },
        };
      }),
    );
  }

  async listAudits(workspaceId: string, entityType?: string, entityId?: string) {
    return this.audits.list(workspaceId, entityType, entityId);
  }
}
