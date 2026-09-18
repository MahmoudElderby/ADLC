import { describe, expect, it } from "vitest";
import { agentSchema, createAgentRequestSchema } from "@adlc/contracts";

describe("agent registry contracts", () => {
  it("requires always_allow and capability attachments for draft creation", () => {
    expect(() =>
      createAgentRequestSchema.parse({
        name: "Release planner",
        description: "Plans release work",
        model: "gpt-5.6-terra",
        instructions: "Use configured tools.",
        approvalMode: "ask",
        capabilities: [],
      }),
    ).toThrow();
  });

  it("represents published-only session eligibility through status and version", () => {
    const agent = agentSchema.parse({
      id: "00000000-0000-4000-8000-000000000020",
      name: "Release planner",
      description: "Plans release work",
      status: "published",
      openaiAgentId: "openai_agent_1",
      draftVersion: 1,
      publishedVersion: 1,
      approvalMode: "always_allow",
      capabilities: [
        {
          type: "skill",
          capabilityId: "00000000-0000-4000-8000-000000000021",
          required: true,
        },
        {
          type: "mcp_server",
          capabilityId: "00000000-0000-4000-8000-000000000022",
          required: true,
        },
      ],
      errors: [],
      warnings: [],
    });

    expect(agent.status).toBe("published");
    expect(agent.publishedVersion).toBe(1);
  });
});
