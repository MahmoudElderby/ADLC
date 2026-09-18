import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sessionHistoryResponseSchema } from "@adlc/contracts";
import { apiFetch } from "../../lib/api.js";

export function SessionHistoryPage() {
  const [query, setQuery] = useState("");
  const history = useQuery({ queryKey: ["session-history"], queryFn: () => apiFetch("/sessions/history", sessionHistoryResponseSchema) });
  const visibleHistory = (history.data ?? []).filter((item) => item.agentName.toLowerCase().includes(query.toLowerCase()) || item.status.includes(query.toLowerCase()));
  return <main><h1>Session History</h1><label>Search history<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    {history.isPending && <p role="status">Loading session history</p>}{history.isError && <p role="alert">Unable to load session history.</p>}
    {!history.isPending && !history.isError && <table><thead><tr><th>Agent</th><th>Status</th><th>Evidence</th></tr></thead><tbody>{visibleHistory.map((item) => <tr key={item.sessionId}><td><Link to={`/agents/${item.agentId}`}>{item.agentName}</Link></td><td>{item.status}</td><td><Link to={`/sessions/${item.sessionId}`}>Open session</Link></td></tr>)}</tbody></table>}
  </main>;
}
