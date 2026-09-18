import { ConflictException, Injectable } from "@nestjs/common";
import type { Agent, SessionStartRequest } from "@adlc/contracts";
import { AgentRegistryService } from "../agent-registry/agent-registry.service.js";
import { CapabilityRegistryService } from "../capability-registry/capability-registry.service.js";
import { WorkspaceEnvironmentService } from "../workspace-environment/workspace-environment.service.js";

@Injectable()
export class SessionReadinessService {
  constructor(
    private readonly agentRegistryService: AgentRegistryService,
    private readonly capabilityRegistryService: CapabilityRegistryService,
    private readonly workspaceEnvironmentService: WorkspaceEnvironmentService,
  ) {}

  async assertReady(workspaceId: string, request: SessionStartRequest) {
    const published = await this.agentRegistryService.getPublishedAgentForSession(
      workspaceId,
      request.agentId,
    );
    const blockers = await this.readinessBlockers(workspaceId, published.agent);
    if (blockers.length > 0) {
      throw new ConflictException(blockers.join(" "));
    }
    return published;
  }

  async readinessBlockers(workspaceId: string, agent: Agent): Promise<string[]> {
    const health = await this.workspaceEnvironmentService.getHealth(workspaceId);
    const blockers: string[] = [];
    if (health.status !== "healthy") {
      blockers.push(...health.issues);
      if (health.issues.length === 0) {
        blockers.push("Workspace environment is not healthy.");
      }
    }
    for (const capability of agent.capabilities) {
      if (
        !(await this.capabilityRegistryService.hasValidCapability(
          workspaceId,
          capability.type,
          capability.capabilityId,
        ))
      ) {
        blockers.push(
          `${capability.type} ${capability.capabilityId} must be valid before session start.`,
        );
      }
    }
    return [...new Set(blockers)];
  }
}
