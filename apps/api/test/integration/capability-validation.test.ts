import { describe, expect, it } from "vitest";
import { CapabilityRegistryService } from "../../src/modules/capability-registry/capability-registry.service.js";
import { AgentAttachmentQuery } from "../../src/modules/agent-registry/agent-attachment.query.js";
import { AuditRepository } from "../../src/modules/observability-governance/audit.repository.js";
import { AuditService } from "../../src/modules/observability-governance/audit.service.js";
import { ConnectorCommandService } from "../../src/modules/workspace-environment/connector-command.service.js";
import { EnvironmentCheckService } from "../../src/modules/workspace-environment/environment-check.service.js";
import { EnvironmentProbeService } from "../../src/modules/workspace-environment/environment-probe.service.js";
import { RedactionService } from "../../src/platform/security/redaction.service.js";
import { SecretVaultService } from "../../src/platform/security/secret-vault.service.js";
import { getSharedTestPostgres, seedOperator } from "@adlc/test-support";

async function createService() {
  const postgres = await getSharedTestPostgres();
  const operator = await seedOperator(postgres, {
    email: `op-${crypto.randomUUID()}@adlc.local`,
  });
  const redaction = new RedactionService();
  const vault = new SecretVaultService();
  const audit = new AuditService(new AuditRepository(postgres.db), redaction, postgres.db);
  const service = new CapabilityRegistryService(
    postgres.db,
    new ConnectorCommandService(),
    new EnvironmentProbeService(postgres.db),
    audit,
    vault,
    redaction,
    new EnvironmentCheckService(postgres.db, vault, audit),
    new AgentAttachmentQuery(postgres.db),
  );
  return { service, workspaceId: operator.workspaceId, actorId: operator.operatorId };
}

describe("capability validation", () => {
  it("enforces skill name/version and MCP label uniqueness", async () => {
    const { service, workspaceId, actorId } = await createService();
    await service.registerSkill(workspaceId, actorId, {
      name: "planning",
      description: "Planning skill",
      sourceType: "source_reference",
      sourceReference: "skills/planning",
      version: "1.0.0",
      capabilityDirectories: [],
    });

    await expect(
      service.registerSkill(workspaceId, actorId, {
        name: "planning",
        description: "Duplicate",
        sourceType: "source_reference",
        sourceReference: "skills/planning-copy",
        version: "1.0.0",
        capabilityDirectories: [],
      }),
    ).rejects.toThrow();

    await service.registerMcp(workspaceId, actorId, {
      label: "devops",
      serverUrl: "https://devops.example.test/mcp",
      transportType: "http",
      connectionOrigin: "environment",
      allowedTools: ["create_work_item"],
      required: true,
      credential: "test-mcp-credential",
    });

    await expect(
      service.registerMcp(workspaceId, actorId, {
        label: "devops",
        serverUrl: "https://devops-copy.example.test/mcp",
        transportType: "http",
        connectionOrigin: "environment",
        allowedTools: ["create_work_item"],
        required: true,
        credential: "test-mcp-credential",
      }),
    ).rejects.toThrow();
  });

  it("does not invent MCP reachability from hostname heuristics", async () => {
    const { service, workspaceId, actorId } = await createService();
    const mcp = await service.registerMcp(workspaceId, actorId, {
      label: "private-devops",
      serverUrl: "https://unreachable.example.test/mcp",
      transportType: "http",
      connectionOrigin: "environment",
      allowedTools: ["create_work_item"],
      required: true,
      credential: "test-mcp-credential",
    });

    const validated = await service.validateMcp(workspaceId, actorId, mcp.id);
    expect(validated.reachabilityStatus).toBe("unverified");
    expect(validated.reachabilitySummary?.toLowerCase()).toContain("unverified");
  });
});
