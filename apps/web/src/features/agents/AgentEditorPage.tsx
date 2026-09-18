import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { agentSchema, type Agent, type CreateAgentRequest } from "@adlc/contracts";
import { AgentReviewPanel } from "./AgentReviewPanel.js";
import { apiFetch } from "../../lib/api.js";

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
  const { agentId } = useParams();
  const [agent, setAgent] = useState(initialAgent);
  const remote = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => apiFetch(`/agents/${agentId}`, agentSchema),
    enabled: Boolean(agentId),
  });
  const displayed = remote.data ?? agent;
  const publish = useMutation({
    mutationFn: async () => {
      const payload: CreateAgentRequest = {
        name: displayed.name,
        description: displayed.description,
        model: "gpt-5.6-terra",
        instructions: "Use attached skills and the workspace MCP server. Always allow.",
        approvalMode: "always_allow",
        capabilities: displayed.capabilities.length
          ? displayed.capabilities
          : [
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
      };
      const created = await apiFetch("/agents", agentSchema, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return apiFetch(`/agents/${created.id}/publish`, agentSchema, { method: "POST" });
    },
    onSuccess: (published) => setAgent(published),
  });

  return (
    <main>
      <h1>Agent Draft</h1>
      <label>
        Name
        <input
          value={displayed.name}
          onChange={(event) => setAgent({ ...displayed, name: event.target.value })}
        />
      </label>
      <label>
        Instructions
        <textarea defaultValue="Use attached skills and the workspace MCP server. Always allow." />
      </label>
      <section aria-label="Attached capabilities">
        <h2>Capabilities</h2>
        <p>{displayed.capabilities.length} attached</p>
      </section>
      <AgentReviewPanel agent={displayed} onPublish={() => publish.mutate()} />
    </main>
  );
}
