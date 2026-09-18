import { describe, expect, it } from "vitest";
import { CapabilityRegistryService } from "../../src/modules/capability-registry/capability-registry.service.js";
import { AuditRepository } from "../../src/modules/observability-governance/audit.repository.js";
import { AuditService } from "../../src/modules/observability-governance/audit.service.js";
import { ConnectorCommandService } from "../../src/modules/workspace-environment/connector-command.service.js";
import { RedactionService } from "../../src/platform/security/redaction.service.js";

function createService() {
  return new CapabilityRegistryService(
    new ConnectorCommandService(),
    new AuditService(new AuditRepository(), new RedactionService()),
  );
}

describe("capability validation", () => {
  const workspaceId = "00000000-0000-4000-8000-000000000010";
  const actorId = "00000000-0000-4000-8000-000000000011";

  it("enforces skill name/version and MCP label uniqueness", () => {
    const service = createService();
    service.registerSkill(workspaceId, actorId, {
      name: "planning",
      description: "Planning skill",
      sourceType: "source_reference",
      sourceReference: "skills/planning",
      version: "1.0.0",
      capabilityDirectories: [],
    });

    expect(() =>
      service.registerSkill(workspaceId, actorId, {
        name: "planning",
        description: "Duplicate",
        sourceType: "source_reference",
        sourceReference: "skills/planning-copy",
        version: "1.0.0",
        capabilityDirectories: [],
      }),
    ).toThrow();

    service.registerMcp(workspaceId, actorId, {
      label: "devops",
      serverUrl: "https://devops.example.test/mcp",
      transportType: "http",
      connectionOrigin: "environment",
      allowedTools: ["create_work_item"],
      required: true,
      credentialSecretId: null,
    });

    expect(() =>
      service.registerMcp(workspaceId, actorId, {
        label: "devops",
        serverUrl: "https://devops-copy.example.test/mcp",
        transportType: "http",
        connectionOrigin: "environment",
        allowedTools: ["create_work_item"],
        required: true,
        credentialSecretId: null,
      }),
    ).toThrow();
  });

  it("records validation status for connector-origin reachability", async () => {
    const service = createService();
    const mcp = service.registerMcp(workspaceId, actorId, {
      label: "private-devops",
      serverUrl: "https://unreachable.example.test/mcp",
      transportType: "http",
      connectionOrigin: "environment",
      allowedTools: ["create_work_item"],
      required: true,
      credentialSecretId: null,
    });

    const validated = await service.validateMcp(workspaceId, mcp.id);
    expect(validated.status).toBe("unreachable");
    expect(validated.validationSummary).toContain("workspace");
  });
});
