import { OpenAISessionAdapter } from "../../../src/integrations/openai/openai-session.adapter.js";
import { AgentRegistryService } from "../../../src/modules/agent-registry/agent-registry.service.js";
import { CapabilityRegistryService } from "../../../src/modules/capability-registry/capability-registry.service.js";
import { ArtifactService } from "../../../src/modules/observability-governance/artifact.service.js";
import { AuditRepository } from "../../../src/modules/observability-governance/audit.repository.js";
import { AuditService } from "../../../src/modules/observability-governance/audit.service.js";
import { SessionEventService } from "../../../src/modules/session-runner/session-event.service.js";
import { SessionReadinessService } from "../../../src/modules/session-runner/session-readiness.service.js";
import { SessionService } from "../../../src/modules/session-runner/session.service.js";
import { WorkspaceEnvironmentService } from "../../../src/modules/workspace-environment/workspace-environment.service.js";
import { ConnectorCommandService } from "../../../src/modules/workspace-environment/connector-command.service.js";
import { RedactionService } from "../../../src/platform/security/redaction.service.js";
import { SessionStreamService } from "../../../src/platform/streaming/session-stream.service.js";

export async function createReadyAgentFixture(options: { publish?: boolean } = {}) {
  const workspaceId = "00000000-0000-4000-8000-000000000301";
  const actorId = "00000000-0000-4000-8000-000000000302";
  const redaction = new RedactionService();
  redaction.registerSecretCanary("sk-secret-12345678");
  const audit = new AuditService(new AuditRepository(), redaction);
  const connector = new ConnectorCommandService();
  const capabilityRegistryService = new CapabilityRegistryService(connector, audit);
  const agentRegistryService = new AgentRegistryService(
    capabilityRegistryService,
    audit,
    redaction,
  );
  const workspaceEnvironmentService = new WorkspaceEnvironmentService();
  const readiness = new SessionReadinessService(
    agentRegistryService,
    capabilityRegistryService,
    workspaceEnvironmentService,
  );
  const sessions = new SessionService(
    agentRegistryService,
    readiness,
    workspaceEnvironmentService,
    new OpenAISessionAdapter(),
    audit,
    redaction,
  ) as SessionService & {
    agentRegistryService: AgentRegistryService;
    capabilityRegistryService: CapabilityRegistryService;
    workspaceEnvironmentService: WorkspaceEnvironmentService;
  };
  const events = new SessionEventService(sessions, redaction);
  const stream = new SessionStreamService(events);
  const artifacts = new ArtifactService(redaction);

  sessions.capabilityRegistryService = capabilityRegistryService;
  sessions.workspaceEnvironmentService = workspaceEnvironmentService;

  const skill = capabilityRegistryService.registerSkill(workspaceId, actorId, {
    name: "planning",
    description: "Planning skill",
    sourceType: "source_reference",
    sourceReference: "skills/planning",
    version: "1.0.0",
    capabilityDirectories: [],
  });
  const mcp = capabilityRegistryService.registerMcp(workspaceId, actorId, {
    label: "devops",
    serverUrl: "https://devops.example.test/mcp",
    transportType: "http",
    connectionOrigin: "environment",
    allowedTools: ["create_work_item"],
    required: true,
    credentialSecretId: null,
  });
  await capabilityRegistryService.validateSkill(workspaceId, skill.id);
  await capabilityRegistryService.validateMcp(workspaceId, mcp.id);

  const draftAgent = agentRegistryService.createDraft(workspaceId, actorId, {
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
  };
}
