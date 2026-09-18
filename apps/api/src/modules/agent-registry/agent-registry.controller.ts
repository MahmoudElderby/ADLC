import { Body, Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import type { CreateAgentRequest } from "@adlc/contracts";
import { CurrentRequestContext, type RequestContext } from "../../platform/auth/request-context.js";
import { AgentRegistryService } from "./agent-registry.service.js";

@Controller("agents")
export class AgentRegistryController {
  constructor(@Inject(AgentRegistryService) private readonly agentRegistryService: AgentRegistryService) {}

  @Get()
  listAgents(@CurrentRequestContext() context: RequestContext) {
    return this.agentRegistryService.listAgents(context.workspaceId);
  }

  @Post()
  createAgent(@CurrentRequestContext() context: RequestContext, @Body() body: CreateAgentRequest) {
    return this.agentRegistryService.createDraft(context.workspaceId, context.actorId, body);
  }

  @Get(":agentId")
  getAgent(@CurrentRequestContext() context: RequestContext, @Param("agentId") agentId: string) {
    return this.agentRegistryService.getAgent(context.workspaceId, agentId);
  }

  @Patch(":agentId")
  updateAgent(
    @CurrentRequestContext() context: RequestContext,
    @Param("agentId") agentId: string,
    @Body() body: CreateAgentRequest,
  ) {
    return this.agentRegistryService.updateDraft(
      context.workspaceId,
      context.actorId,
      agentId,
      body,
    );
  }

  @Post(":agentId/publish")
  publishAgent(
    @CurrentRequestContext() context: RequestContext,
    @Param("agentId") agentId: string,
  ) {
    return this.agentRegistryService.publish(context.workspaceId, context.actorId, agentId);
  }
}
