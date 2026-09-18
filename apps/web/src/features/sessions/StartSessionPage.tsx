import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Agent } from "@adlc/contracts";
import { WorkspaceHealthPanel } from "../workspace/WorkspaceHealthPanel.js";

const publishedAgents: Agent[] = [
  {
    id: "00000000-0000-4000-8000-00000000a101",
    name: "Release planner",
    description: "Plans release work.",
    status: "published",
    openaiAgentId: "openai_agent_preview",
    draftVersion: 1,
    publishedVersion: 1,
    approvalMode: "always_allow",
    capabilities: [
      {
        type: "skill",
        capabilityId: "00000000-0000-4000-8000-00000000a102",
        required: true,
      },
      {
        type: "mcp_server",
        capabilityId: "00000000-0000-4000-8000-00000000a103",
        required: true,
      },
    ],
    errors: [],
    warnings: [],
  },
];

export function StartSessionPage() {
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  return (
    <main>
      <h1>Start Session</h1>
      <WorkspaceHealthPanel />
      <label>
        Published agent
        <select defaultValue={publishedAgents[0]?.id}>
          {publishedAgents.map((agent) => (
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
      <button type="button" disabled={!input.trim()} onClick={() => navigate("/sessions/preview")}>
        Start session
      </button>
      <section aria-label="Readiness blockers">
        {input.trim() ? "Ready to run in the self-hosted workspace." : "Enter a task to start."}
      </section>
    </main>
  );
}
