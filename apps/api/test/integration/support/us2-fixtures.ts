import { mcpServers } from "@adlc/database";
import { and, eq } from "drizzle-orm";
import { getSharedTestPostgres, seedOperator, type SchemaDatabase } from "@adlc/test-support";
import { OpenAIAgentsAdapter } from "../../../src/integrations/openai/openai-agents.adapter.js";
import { OpenAISessionAdapter } from "../../../src/integrations/openai/openai-session.adapter.js";
import { AgentRegistryService } from "../../../src/modules/agent-registry/agent-registry.service.js";
import { CapabilityRegistryService } from "../../../src/modules/capability-registry/capability-registry.service.js";
import { LiveFleetProjector } from "../../../src/modules/command-center/live-fleet-projector.js";
import { ArtifactService } from "../../../src/modules/observability-governance/artifact.service.js";
import { AuditRepository } from "../../../src/modules/observability-governance/audit.repository.js";
import { AuditService } from "../../../src/modules/observability-governance/audit.service.js";
import { SessionEventService } from "../../../src/modules/session-runner/session-event.service.js";
import { SessionReadinessService } from "../../../src/modules/session-runner/session-readiness.service.js";
import { SessionService } from "../../../src/modules/session-runner/session.service.js";
import { ConnectorCommandService } from "../../../src/modules/workspace-environment/connector-command.service.js";
import { EnvironmentCheckService } from "../../../src/modules/workspace-environment/environment-check.service.js";
import { EnvironmentProbeService } from "../../../src/modules/workspace-environment/environment-probe.service.js";
import { AgentAttachmentQuery } from "../../../src/modules/agent-registry/agent-attachment.query.js";
import { WorkspaceEnvironmentService } from "../../../src/modules/workspace-environment/workspace-environment.service.js";
import { WorkspaceBootstrap } from "../../../src/platform/database/workspace-bootstrap.js";
import { RedactionService } from "../../../src/platform/security/redaction.service.js";
import { SecretVaultService } from "../../../src/platform/security/secret-vault.service.js";
import { SessionStreamService } from "../../../src/platform/streaming/session-stream.service.js";

export async function forceMcpStatus(
  db: SchemaDatabase,
  workspaceId: string,
  mcpId: string,
  status: "pending_validation" | "valid" | "invalid" | "unreachable",
) {
  await db
    .update(mcpServers)
    .set({
      status: status === "unreachable" ? "invalid" : status,
      reachabilityStatus:
        status === "valid" ? "reachable" : status === "unreachable" ? "unreachable" : "unverified",
      validationSummary: "Forced test status.",
      reachabilitySummary: "Forced test status.",
      validatedAt: new Date(),
    })
    .where(and(eq(mcpServers.id, mcpId), eq(mcpServers.workspaceId, workspaceId)));
}

export async function createReadyAgentFixture(options: { publish?: boolean } = {}) {
  const postgres = await getSharedTestPostgres();
  const operator = await seedOperator(postgres, {
    email: `op-${crypto.randomUUID()}@adlc.local`,
  });
  const workspaceId = operator.workspaceId;
  const actorId = operator.operatorId;
  const redaction = new RedactionService();
  redaction.registerSecretCanary("sk-secret-12345678");
  const vault = new SecretVaultService();
  const bootstrap = new WorkspaceBootstrap(postgres.db, vault, redaction);
  const audit = new AuditService(new AuditRepository(postgres.db), redaction, postgres.db);
  const connector = new ConnectorCommandService();
  const capabilityRegistryService = new CapabilityRegistryService(
    postgres.db,
    connector,
    new EnvironmentProbeService(postgres.db),
    audit,
    vault,
    redaction,
    new EnvironmentCheckService(postgres.db, vault, audit),
    new AgentAttachmentQuery(postgres.db),
  );
  const agentRegistryService = new AgentRegistryService(
    postgres.db,
    bootstrap,
    capabilityRegistryService,
    audit,
    redaction,
    new OpenAIAgentsAdapter(),
  );
  const workspaceEnvironmentService = new WorkspaceEnvironmentService(
    postgres.db,
    bootstrap,
  );
  const environment = await workspaceEnvironmentService.getEnvironment(workspaceId);
  await workspaceEnvironmentService.recordHeartbeat(environment.connectorId, {
    connectorVersion: "0.2.0",
    hostFingerprint: "test-host",
    workspace: { readable: true, writable: true },
  });
  const readiness = new SessionReadinessService(
    agentRegistryService,
    capabilityRegistryService,
    workspaceEnvironmentService,
  );
  const sessions = new SessionService(
    postgres.db,
    bootstrap,
    agentRegistryService,
    capabilityRegistryService,
    readiness,
    workspaceEnvironmentService,
    new OpenAISessionAdapter(),
    audit,
    redaction,
    vault,
  );
  const artifacts = new ArtifactService(postgres.db, redaction, connector);
  const events = new SessionEventService(
    postgres.db,
    sessions,
    redaction,
    artifacts,
    postgres.pool,
  );
  const stream = new SessionStreamService(events);
  const projector = new LiveFleetProjector(postgres.db, sessions);

  const skill = await capabilityRegistryService.registerSkill(workspaceId, actorId, {
    name: "planning",
    description: "Planning skill",
    sourceType: "source_reference",
    sourceReference: "skills/planning",
    version: "1.0.0",
    capabilityDirectories: [],
  });
  const mcp = await capabilityRegistryService.registerMcp(workspaceId, actorId, {
    label: "devops",
    serverUrl: "https://devops.example.test/mcp",
    transportType: "http",
    connectionOrigin: "environment",
    allowedTools: ["create_work_item"],
    required: true,
    credential: "test-mcp-credential",
  });
  await capabilityRegistryService.validateSkill(workspaceId, skill.id);
  await capabilityRegistryService.validateMcp(workspaceId, actorId, mcp.id);
  await forceMcpStatus(postgres.db, workspaceId, mcp.id, "valid");

  const draftAgent = await agentRegistryService.createDraft(workspaceId, actorId, {
    name: "Release planner",
    description: "Plans release work",
    model: "gpt-5.6-terra",
    instructions: "Use attached skill and MCP. Always allow.",
    approvalMode: "always_allow",
    capabilities: [
      { type: "skill", capabilityId: skill.id, required: true },
      { type: "mcp_server", capabilityId: mcp.id, required: true },
    ],
  });

  const publishedAgent =
    options.publish === false
      ? draftAgent
      : await agentRegistryService.publish(workspaceId, actorId, draftAgent.id);

  return {
    db: postgres.db,
    workspaceId,
    actorId,
    skill,
    mcp,
    draftAgent,
    publishedAgent,
    sessions,
    events,
    stream,
    artifacts,
    audit,
    projector,
    capabilityRegistryService,
    agentRegistryService,
    workspaceEnvironmentService,
  };
}
