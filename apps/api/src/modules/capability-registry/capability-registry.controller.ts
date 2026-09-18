import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import type { RegisterMcpRequest, RegisterSkillRequest } from "@adlc/contracts";
import { CurrentRequestContext, type RequestContext } from "../../platform/auth/request-context.js";
import { CapabilityRegistryService } from "./capability-registry.service.js";

@Controller("capabilities")
export class CapabilityRegistryController {
  constructor(
    @Inject(CapabilityRegistryService)
    private readonly capabilityRegistryService: CapabilityRegistryService,
  ) {}

  @Get("skills")
  listSkills(@CurrentRequestContext() context: RequestContext) {
    return this.capabilityRegistryService.listSkills(context.workspaceId);
  }

  @Post("skills")
  @HttpCode(201)
  registerSkill(
    @CurrentRequestContext() context: RequestContext,
    @Body() body: RegisterSkillRequest,
  ) {
    return this.capabilityRegistryService.registerSkill(context.workspaceId, context.actorId, body);
  }

  @Post("skills/draft:validate")
  @HttpCode(200)
  validateSkillDraft(
    @CurrentRequestContext() _context: RequestContext,
    @Body() body: unknown,
  ) {
    return this.capabilityRegistryService.validateSkillDraft(body);
  }

  @Get("skills/:skillId/audit")
  listSkillAudit(
    @CurrentRequestContext() context: RequestContext,
    @Param("skillId") skillId: string,
  ) {
    return this.capabilityRegistryService.listSkillAudit(context.workspaceId, skillId);
  }

  @Get("skills/:skillId")
  getSkill(@CurrentRequestContext() context: RequestContext, @Param("skillId") skillId: string) {
    return this.capabilityRegistryService.getSkill(context.workspaceId, skillId);
  }

  @Patch("skills/:skillId")
  updateSkill(
    @CurrentRequestContext() context: RequestContext,
    @Param("skillId") skillId: string,
    @Body() body: unknown,
  ) {
    return this.capabilityRegistryService.updateSkill(
      context.workspaceId,
      context.actorId,
      skillId,
      body,
    );
  }

  @Delete("skills/:skillId")
  @HttpCode(204)
  deleteSkill(@CurrentRequestContext() context: RequestContext, @Param("skillId") skillId: string) {
    return this.capabilityRegistryService.deleteSkill(
      context.workspaceId,
      context.actorId,
      skillId,
    );
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

  @Post("mcp/draft:validate")
  @HttpCode(200)
  validateMcpDraft(
    @CurrentRequestContext() _context: RequestContext,
    @Body() body: unknown,
  ) {
    return this.capabilityRegistryService.validateMcpDraft(body);
  }

  @Get("mcp/:mcpId/audit")
  listMcpAudit(
    @CurrentRequestContext() context: RequestContext,
    @Param("mcpId") mcpId: string,
  ) {
    return this.capabilityRegistryService.listMcpAudit(context.workspaceId, mcpId);
  }

  @Post("mcp/:mcpId/validate")
  validateMcp(@CurrentRequestContext() context: RequestContext, @Param("mcpId") mcpId: string) {
    return this.capabilityRegistryService.validateMcp(
      context.workspaceId,
      context.actorId,
      mcpId,
    );
  }

  @Get("mcp/:mcpId")
  getMcp(@CurrentRequestContext() context: RequestContext, @Param("mcpId") mcpId: string) {
    return this.capabilityRegistryService.getMcp(context.workspaceId, mcpId);
  }

  @Patch("mcp/:mcpId")
  updateMcp(
    @CurrentRequestContext() context: RequestContext,
    @Param("mcpId") mcpId: string,
    @Body() body: unknown,
  ) {
    return this.capabilityRegistryService.updateMcp(
      context.workspaceId,
      context.actorId,
      mcpId,
      body,
    );
  }

  @Delete("mcp/:mcpId")
  @HttpCode(204)
  deleteMcp(@CurrentRequestContext() context: RequestContext, @Param("mcpId") mcpId: string) {
    return this.capabilityRegistryService.deleteMcp(
      context.workspaceId,
      context.actorId,
      mcpId,
    );
  }
}
