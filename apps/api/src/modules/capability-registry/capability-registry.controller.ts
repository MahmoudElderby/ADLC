import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { RegisterMcpRequest, RegisterSkillRequest } from "@adlc/contracts";
import { CurrentRequestContext, type RequestContext } from "../../platform/auth/request-context.js";
import { CapabilityRegistryService } from "./capability-registry.service.js";

@Controller("capabilities")
export class CapabilityRegistryController {
  constructor(private readonly capabilityRegistryService: CapabilityRegistryService) {}

  @Get("skills")
  listSkills(@CurrentRequestContext() context: RequestContext) {
    return this.capabilityRegistryService.listSkills(context.workspaceId);
  }

  @Post("skills")
  registerSkill(
    @CurrentRequestContext() context: RequestContext,
    @Body() body: RegisterSkillRequest,
  ) {
    return this.capabilityRegistryService.registerSkill(context.workspaceId, context.actorId, body);
  }

  @Post("skills/:skillId/validate")
  validateSkill(
    @CurrentRequestContext() context: RequestContext,
    @Param("skillId") skillId: string,
  ) {
    return this.capabilityRegistryService.validateSkill(context.workspaceId, skillId);
  }

  @Get("mcp")
  listMcp(@CurrentRequestContext() context: RequestContext) {
    return this.capabilityRegistryService.listMcpServers(context.workspaceId);
  }

  @Post("mcp")
  registerMcp(@CurrentRequestContext() context: RequestContext, @Body() body: RegisterMcpRequest) {
    return this.capabilityRegistryService.registerMcp(context.workspaceId, context.actorId, body);
  }

  @Post("mcp/:mcpId/validate")
  validateMcp(@CurrentRequestContext() context: RequestContext, @Param("mcpId") mcpId: string) {
    return this.capabilityRegistryService.validateMcp(context.workspaceId, mcpId);
  }
}
