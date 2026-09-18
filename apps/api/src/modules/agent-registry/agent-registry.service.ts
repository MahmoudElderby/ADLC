import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  type Agent,
  type CapabilityAttachment,
  type CreateAgentRequest,
  createAgentRequestSchema,
} from "@adlc/contracts";
import { OpenAIAgentsAdapter } from "../../integrations/openai/openai-agents.adapter.js";
import { RedactionService } from "../../platform/security/redaction.service.js";
import { AuditService } from "../observability-governance/audit.service.js";
import { CapabilityRegistryService } from "../capability-registry/capability-registry.service.js";

type StoredAgent = Agent & {
  workspaceId: string;
  draftConfig: CreateAgentRequest;
  publishedConfig?: CreateAgentRequest;
  publishedImmutable?: boolean;
};

@Injectable()
export class AgentRegistryService {
  private readonly agents = new Map<string, StoredAgent>();
  private readonly openaiGateway = new OpenAIAgentsAdapter();

  constructor(
    private readonly capabilityRegistryService: CapabilityRegistryService,
    private readonly auditService: AuditService,
    private readonly redactionService: RedactionService,
  ) {}

  listAgents(workspaceId: string): Agent[] {
    return [...this.agents.values()].filter((agent) => agent.workspaceId === workspaceId);
  }

  createDraft(workspaceId: string, actorId: string, input: CreateAgentRequest): Agent {
    const request = createAgentRequestSchema.parse(input);
    const duplicate = this.listAgents(workspaceId).find((agent) => agent.name === request.name);
    if (duplicate) {
      throw new ConflictException("Agent name must be unique in the workspace.");
    }

    const review = this.reviewCapabilities(workspaceId, request.capabilities);
    const agent: StoredAgent = {
      id: crypto.randomUUID(),
      workspaceId,
      name: request.name,
      description: request.description,
      status: "draft",
      openaiAgentId: null,
      draftVersion: 1,
      publishedVersion: null,
      approvalMode: "always_allow",
      capabilities: request.capabilities,
      errors: review.errors,
      warnings: review.warnings,
      draftConfig: request,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.agents.set(agent.id, agent);
    void this.auditService.record({
      workspaceId,
      actorId,
      action: "agent.draft_created",
      entityType: "agent",
      entityId: agent.id,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { name: agent.name, approvalMode: agent.approvalMode },
    });
    return agent;
  }

  getAgent(workspaceId: string, agentId: string): Agent {
    return this.getStoredAgent(workspaceId, agentId);
  }

  listPublishedAgents(workspaceId: string): Agent[] {
    return this.listAgents(workspaceId).filter((agent) => agent.status === "published");
  }

  getPublishedAgentForSession(workspaceId: string, agentId: string) {
    const agent = this.getStoredAgent(workspaceId, agentId);
    if (agent.status !== "published" || !agent.publishedVersion || !agent.publishedConfig) {
      throw new ConflictException("A published agent is required before starting a session.");
    }

    return {
      agent,
      versionId: agent.id,
      versionNumber: agent.publishedVersion,
      config: structuredClone(agent.publishedConfig),
    };
  }

  updateDraft(
    workspaceId: string,
    actorId: string,
    agentId: string,
    input: CreateAgentRequest,
  ): Agent {
    const agent = this.getStoredAgent(workspaceId, agentId);
    const request = createAgentRequestSchema.parse(input);
    const review = this.reviewCapabilities(workspaceId, request.capabilities);
    const updated: StoredAgent = {
      ...agent,
      name: request.name,
      description: request.description,
      draftVersion: agent.status === "published" ? agent.draftVersion + 1 : agent.draftVersion,
      capabilities: request.capabilities,
      errors: review.errors,
      warnings: review.warnings,
      draftConfig: request,
      updatedAt: new Date().toISOString(),
    };
    this.agents.set(agentId, updated);
    void this.auditService.record({
      workspaceId,
      actorId,
      action: "agent.draft_updated",
      entityType: "agent",
      entityId: agent.id,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { draftVersion: updated.draftVersion },
    });
    return updated;
  }

  async publish(workspaceId: string, actorId: string, agentId: string): Promise<Agent> {
    const agent = this.getStoredAgent(workspaceId, agentId);
    const review = this.reviewCapabilities(workspaceId, agent.draftConfig.capabilities);

    if (review.errors.length > 0) {
      const failed = { ...agent, errors: review.errors, warnings: review.warnings };
      this.agents.set(agentId, failed);
      throw new ConflictException(review.errors.join(" "));
    }

    const payload = this.redactionService.redact({
      name: agent.draftConfig.name,
      instructions: agent.draftConfig.instructions,
      model: agent.draftConfig.model,
      tools: agent.draftConfig.capabilities,
      approvalMode: "always_allow",
    });
    const managed = await this.openaiGateway.createAgent({
      name: agent.draftConfig.name,
      instructions: agent.draftConfig.instructions,
      model: agent.draftConfig.model,
      tools: agent.draftConfig.capabilities.map((capability) => ({ ...capability })),
    });
    const published: StoredAgent = {
      ...agent,
      status: "published",
      openaiAgentId: managed.id,
      publishedVersion: agent.draftVersion,
      publishedConfig: structuredClone(agent.draftConfig),
      publishedImmutable: true,
      errors: [],
      warnings: review.warnings,
      updatedAt: new Date().toISOString(),
    };
    this.agents.set(agentId, published);
    void this.auditService.record({
      workspaceId,
      actorId,
      action: "agent.published",
      entityType: "agent",
      entityId: agent.id,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { payload, openaiResponse: managed.responseRedacted },
    });
    return published;
  }

  private reviewCapabilities(workspaceId: string, capabilities: CapabilityAttachment[]) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const seen = new Set<string>();

    for (const capability of capabilities) {
      const key = `${capability.type}:${capability.capabilityId}`;
      if (seen.has(key)) {
        errors.push("Capabilities must be attached only once.");
      }
      seen.add(key);

      try {
        if (
          !this.capabilityRegistryService.hasValidCapability(
            workspaceId,
            capability.type,
            capability.capabilityId,
          )
        ) {
          errors.push(
            `${capability.type} ${capability.capabilityId} must be valid before publish.`,
          );
        }
      } catch {
        errors.push(`${capability.type} ${capability.capabilityId} does not exist.`);
      }

      if (!capability.required) {
        warnings.push(`${capability.type} ${capability.capabilityId} is optional.`);
      }
    }

    return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
  }

  private getStoredAgent(workspaceId: string, agentId: string): StoredAgent {
    const agent = this.agents.get(agentId);
    if (!agent || agent.workspaceId !== workspaceId) {
      throw new NotFoundException("Agent not found.");
    }
    return agent;
  }
}
