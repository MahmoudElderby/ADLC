import { Controller, Get, Inject, Post } from "@nestjs/common";
import { CurrentRequestContext, type RequestContext } from "../../platform/auth/request-context.js";
import { WorkspaceEnvironmentService } from "./workspace-environment.service.js";

@Controller("workspace-environment")
export class WorkspaceEnvironmentController {
  constructor(
    @Inject(WorkspaceEnvironmentService)
    private readonly workspaceEnvironmentService: WorkspaceEnvironmentService,
  ) {}

  @Get()
  getEnvironment(@CurrentRequestContext() context: RequestContext) {
    return this.workspaceEnvironmentService.getEnvironment(context.workspaceId);
  }

  @Get("health")
  getHealth(@CurrentRequestContext() context: RequestContext) {
    return this.workspaceEnvironmentService.getHealth(context.workspaceId);
  }

  @Post("validate")
  validate(@CurrentRequestContext() context: RequestContext) {
    return this.workspaceEnvironmentService.validate(context.workspaceId);
  }
}
