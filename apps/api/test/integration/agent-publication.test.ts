import { describe, expect, it } from "vitest";
import { AgentRegistryService } from "../../src/modules/agent-registry/agent-registry.service.js";
import { CapabilityRegistryService } from "../../src/modules/capability-registry/capability-registry.service.js";
import { AuditRepository } from "../../src/modules/observability-governance/audit.repository.js";
import { AuditService } from "../../src/modules/observability-governance/audit.service.js";
import { ConnectorCommandService } from "../../src/modules/workspace-environment/connector-command.service.js";
import { RedactionService } from "../../src/platform/security/redaction.service.js";

async function createReadyServices() {
  const audit = new AuditService(new AuditRepository(), new RedactionService());
  const capabilities = new CapabilityRegistryService(new ConnectorCommandService(), audit);
  const agents = new AgentRegistryService(capabilities, audit, new RedactionService());
  const workspaceId = "00000000-0000-4000-8000-000000000030";
  const actorId = "00000000-0000-4000-8000-000000000031";
  const skill = capabilities.registerSkill(workspaceId, actorId, {
    name: "planning",
    description: "Planning skill",
    sourceType: "source_reference",
    sourceReference: "skills/planning",
    version: "1.0.0",
    capabilityDirectories: [],
  });
  const mcp = capabilities.registerMcp(workspaceId, actorId, {
    label: "devops",
    serverUrl: "https://devops.example.test/mcp",
    transportType: "http",
    connectionOrigin: "environment",
    allowedTools: ["create_work_item"],
    required: true,
    credentialSecretId: null,
  });
  await capabilities.validateSkill(workspaceId, skill.id);
  await capabilities.validateMcp(workspaceId, mcp.id);
  return { agents, workspaceId, actorId, skill, mcp };
}

describe("agent publication", () => {
  it("publishes immutable always_allow agents with unique capability attachments", async () => {
    const { agents, workspaceId, actorId, skill, mcp } = await createReadyServices();
    const draft = agents.createDraft(workspaceId, actorId, {
      name: "Release planner",
      description: "Plans release work",
      model: "gpt-5.6-terra",
      instructions: "Use attached skill and MCP.",
      approvalMode: "always_allow",
      capabilities: [
        { type: "skill", capabilityId: skill.id, required: true },
        { type: "mcp_server", capabilityId: mcp.id, required: true },
      ],
    });

    const published = await agents.publish(workspaceId, actorId, draft.id);
    expect(published.status).toBe("published");
    expect(published.approvalMode).toBe("always_allow");
    expect(published.openaiAgentId).toContain("openai_agent_");
    expect(published.publishedVersion).toBe(1);
  });

  it("rejects invalid capability publication with actionable errors", async () => {
    const { agents, workspaceId, actorId, skill } = await createReadyServices();
    const draft = agents.createDraft(workspaceId, actorId, {
      name: "Broken planner",
      description: "Cannot publish",
      model: "gpt-5.6-terra",
      instructions: "Use attached capabilities.",
      approvalMode: "always_allow",
      capabilities: [
        { type: "skill", capabilityId: skill.id, required: true },
        { type: "skill", capabilityId: skill.id, required: true },
      ],
    });

    await expect(agents.publish(workspaceId, actorId, draft.id)).rejects.toThrow(
      "Capabilities must be attached only once",
    );
  });
});
