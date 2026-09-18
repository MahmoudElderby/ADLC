import { describe, expect, it } from "vitest";
import { AgentRegistryService } from "../../src/modules/agent-registry/agent-registry.service.js";
import { CapabilityRegistryService } from "../../src/modules/capability-registry/capability-registry.service.js";
import { AuditRepository } from "../../src/modules/observability-governance/audit.repository.js";
import { AuditService } from "../../src/modules/observability-governance/audit.service.js";
import { ConnectorCommandService } from "../../src/modules/workspace-environment/connector-command.service.js";
import { WorkspaceBootstrap } from "../../src/platform/database/workspace-bootstrap.js";
import { RedactionService } from "../../src/platform/security/redaction.service.js";
import { SecretVaultService } from "../../src/platform/security/secret-vault.service.js";
import { OpenAIAgentsAdapter } from "../../src/integrations/openai/openai-agents.adapter.js";
import { getSharedTestPostgres, seedOperator } from "@adlc/test-support";
import { EnvironmentProbeService } from "../../src/modules/workspace-environment/environment-probe.service.js";
import { EnvironmentCheckService } from "../../src/modules/workspace-environment/environment-check.service.js";
import { AgentAttachmentQuery } from "../../src/modules/agent-registry/agent-attachment.query.js";
import { forceMcpStatus } from "./support/us2-fixtures.js";

async function createReadyServices() {
  const postgres = await getSharedTestPostgres();
  const redaction = new RedactionService();
  const vault = new SecretVaultService();
  const bootstrap = new WorkspaceBootstrap(
    postgres.db,
    vault,
    redaction,
  );
  const audit = new AuditService(new AuditRepository(postgres.db), redaction, postgres.db);
  const capabilities = new CapabilityRegistryService(
    postgres.db,
    new ConnectorCommandService(),
    new EnvironmentProbeService(postgres.db),
    audit,
    vault,
    redaction,
    new EnvironmentCheckService(postgres.db, vault, audit),
    new AgentAttachmentQuery(postgres.db),
  );
  const agents = new AgentRegistryService(
    postgres.db,
    bootstrap,
    capabilities,
    audit,
    redaction,
    new OpenAIAgentsAdapter(),
  );
  const operator = await seedOperator(postgres, {
    email: `op-${crypto.randomUUID()}@adlc.local`,
  });
  const workspaceId = operator.workspaceId;
  const actorId = operator.operatorId;
  const skill = await capabilities.registerSkill(workspaceId, actorId, {
    name: "planning",
    description: "Planning skill",
    sourceType: "source_reference",
    sourceReference: "skills/planning",
    version: "1.0.0",
    capabilityDirectories: [],
  });
  const mcp = await capabilities.registerMcp(workspaceId, actorId, {
    label: "devops",
    serverUrl: "https://devops.example.test/mcp",
    transportType: "http",
    connectionOrigin: "environment",
    allowedTools: ["create_work_item"],
    required: true,
    credential: "test-mcp-credential",
  });
  await capabilities.validateSkill(workspaceId, skill.id);
  await capabilities.validateMcp(workspaceId, actorId, mcp.id);
  await forceMcpStatus(postgres.db, workspaceId, mcp.id, "valid");
  return { agents, workspaceId, actorId, skill, mcp };
}

describe("agent publication", () => {
  it("publishes immutable always_allow agents with unique capability attachments", async () => {
    const { agents, workspaceId, actorId, skill, mcp } = await createReadyServices();
    const draft = await agents.createDraft(workspaceId, actorId, {
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
    const draft = await agents.createDraft(workspaceId, actorId, {
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
