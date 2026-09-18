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

  getLiveFleet(workspaceId: string): LiveFleetItem[] {
    const rows = this.projector?.list(workspaceId) ?? this.sessions.listSessions(workspaceId).filter((s) => !["completed", "failed", "canceled", "interrupted"].includes(s.status)).map((s) => ({ sessionId: s.id, workspaceId, agentId: s.agentId, status: s.status as "creating" | "provisioning" | "running", lastSummary: s.failureSummary, lastEventAt: s.startedAt ?? s.createdAt }));
    return rows.map((row) => {
      const session = this.sessions.getSession(workspaceId, row.sessionId);
      const agent = this.sessions.agentRegistryService.getAgent(workspaceId, row.agentId);
      return { sessionId: row.sessionId, agentId: row.agentId, agentName: agent.name, status: row.status, skillCount: agent.capabilities.filter((c) => c.type === "skill").length, mcpCount: agent.capabilities.filter((c) => c.type === "mcp_server").length, lastSummary: this.events.listNormalized(row.sessionId).at(-1)?.summary ?? row.lastSummary, lastEventAt: this.events.listNormalized(row.sessionId).at(-1)?.occurredAt ?? row.lastEventAt, links: { session: `/sessions/${session.id}`, agent: `/agents/${agent.id}` } };
    });
  }

  listHistory(workspaceId: string): SessionHistoryItem[] {
    return this.sessions.listSessions(workspaceId).map((session) => {
      const agent = this.sessions.agentRegistryService.getAgent(workspaceId, session.agentId);
      return { sessionId: session.id, agentId: agent.id, agentName: agent.name, status: session.status, createdAt: session.createdAt, terminalAt: session.terminalAt, failureSummary: session.failureSummary, links: { session: `/sessions/${session.id}`, agent: `/agents/${agent.id}` } };
    });
  }

  async listAudits(workspaceId: string, entityType?: string, entityId?: string) { return this.audits.list(workspaceId, entityType, entityId); }
}
