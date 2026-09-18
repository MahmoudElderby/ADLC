import { useState } from "react";
import type { Agent } from "@adlc/contracts";
import { AgentReviewPanel } from "./AgentReviewPanel.js";

const initialAgent: Agent = {
  id: crypto.randomUUID(),
  name: "Release planner",
  description: "Plans and prepares release work.",
  status: "draft",
  openaiAgentId: null,
  draftVersion: 1,
  publishedVersion: null,
  approvalMode: "always_allow",
  capabilities: [],
  errors: ["Attach one valid skill and one valid MCP server before publishing."],
  warnings: [],
};

export function AgentEditorPage() {
  const [agent, setAgent] = useState(initialAgent);

  return (
    <main>
      <h1>Agent Draft</h1>
      <label>
        Name
        <input
          value={agent.name}
          onChange={(event) => setAgent({ ...agent, name: event.target.value })}
        />
      </label>
      <label>
        Instructions
        <textarea defaultValue="Use attached skills and the workspace MCP server. Always allow." />
      </label>
      <section aria-label="Attached capabilities">
        <h2>Capabilities</h2>
        <p>{agent.capabilities.length} attached</p>
      </section>
      <AgentReviewPanel
        agent={agent}
        onPublish={() =>
          setAgent({
            ...agent,
            status: "published",
            openaiAgentId: "openai_agent_preview",
            publishedVersion: agent.draftVersion,
            errors: [],
          })
        }
      />
    </main>
  );
}
