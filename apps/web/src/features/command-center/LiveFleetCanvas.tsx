import { Link } from "react-router-dom";

export type FleetNode = { sessionId: string; agentId: string; agentName: string; status: string; skillCount: number; mcpCount: number; lastSummary: string | null };

export function LiveFleetCanvas({ sessions }: { sessions: FleetNode[] }) {
  return <section aria-label="Live fleet canvas" className="live-fleet-canvas">
    {sessions.length === 0 ? <p>No active sessions</p> : sessions.map((session) => <article className="fleet-node" style={{ minHeight: 168, width: 280 }} data-status={session.status} data-session-id={session.sessionId} key={session.sessionId}>
      <h2>{session.agentName}</h2><p data-status={session.status}>{session.status}</p>
      <p>{session.skillCount} skills, {session.mcpCount} MCP servers</p><p>{session.lastSummary ?? "Awaiting activity"}</p>
      {(session.status === "failed" || session.lastSummary?.toLowerCase().includes("blocked")) && <p role="status">Attention required</p>}
      <Link to={`/sessions/${session.sessionId}`}>Open session</Link>
    </article>)}
  </section>;
}
