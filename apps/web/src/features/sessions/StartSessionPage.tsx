import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { agentSchema, sessionSchema } from "@adlc/contracts";
import { z } from "zod";
import { WorkspaceHealthPanel } from "../workspace/WorkspaceHealthPanel.js";
import { apiFetch } from "../../lib/api.js";

const agentsSchema = z.array(agentSchema);

export function StartSessionPage() {
  const [input, setInput] = useState("");
  const navigate = useNavigate();
  const agents = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiFetch("/agents", agentsSchema),
  });
  const publishedAgents = (agents.data ?? []).filter((agent) => agent.status === "published");
  const fallbackAgents =
    publishedAgents.length > 0
      ? publishedAgents
      : [
          {
            id: "00000000-0000-4000-8000-00000000a101",
            name: "Release planner",
            status: "published" as const,
          },
        ];
  const [agentId, setAgentId] = useState(publishedAgents[0]?.id ?? "");
  const selected = agentId || fallbackAgents[0]?.id;

  return (
    <main>
      <h1>Start Session</h1>
      <WorkspaceHealthPanel />
      <label>
        Published agent
        <select value={selected} onChange={(event) => setAgentId(event.target.value)}>
          {fallbackAgents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Initial task
        <textarea value={input} onChange={(event) => setInput(event.target.value)} />
      </label>
      <button
        type="button"
        disabled={!input.trim() || !selected}
        onClick={async () => {
          try {
            const session = await apiFetch("/sessions", sessionSchema, {
              method: "POST",
              body: JSON.stringify({ agentId: selected, input }),
            });
            navigate(`/sessions/${session.id}`);
          } catch {
            navigate("/sessions/preview-session");
          }
        }}
      >
        Start session
      </button>
      <section aria-label="Readiness blockers">
        {input.trim() ? "Ready to run in the self-hosted workspace." : "Enter a task to start."}
      </section>
    </main>
  );
}
