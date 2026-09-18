import { describe, expect, it } from "vitest";
import { CapabilityRegistryService } from "../../src/modules/capability-registry/capability-registry.service.js";
import { AuditRepository } from "../../src/modules/observability-governance/audit.repository.js";
import { AuditService } from "../../src/modules/observability-governance/audit.service.js";
import { ConnectorCommandService } from "../../src/modules/workspace-environment/connector-command.service.js";
import { WorkspaceBootstrap } from "../../src/platform/database/workspace-bootstrap.js";
import { RedactionService } from "../../src/platform/security/redaction.service.js";
import { SecretVaultService } from "../../src/platform/security/secret-vault.service.js";
import { getSharedTestPostgres } from "@adlc/test-support";

async function createService() {
  const postgres = await getSharedTestPostgres();
  const redaction = new RedactionService();
  const bootstrap = new WorkspaceBootstrap(
    postgres.db,
    new SecretVaultService("test-root-key-that-is-definitely-32-bytes"),
    redaction,
  );
  return new CapabilityRegistryService(
    postgres.db,
    bootstrap,
    new ConnectorCommandService(),
    new AuditService(new AuditRepository(postgres.db), redaction),
  );
}

describe("capability validation", () => {
  it("enforces skill name/version and MCP label uniqueness", async () => {
    const service = await createService();
    const workspaceId = crypto.randomUUID();
    const actorId = crypto.randomUUID();
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
      credentialSecretId: null,
    });

    await expect(
      service.registerMcp(workspaceId, actorId, {
        label: "devops",
        serverUrl: "https://devops-copy.example.test/mcp",
        transportType: "http",
        connectionOrigin: "environment",
        allowedTools: ["create_work_item"],
        required: true,
        credentialSecretId: null,
      }),
    ).rejects.toThrow();
  });

  it("records validation status for connector-origin reachability", async () => {
    const service = await createService();
    const workspaceId = crypto.randomUUID();
    const actorId = crypto.randomUUID();
    const mcp = await service.registerMcp(workspaceId, actorId, {
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
