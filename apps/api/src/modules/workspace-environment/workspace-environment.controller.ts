import { Controller, Get, Post } from "@nestjs/common";
import { WorkspaceEnvironmentService } from "./workspace-environment.service.js";

@Controller("workspace-environment")
export class WorkspaceEnvironmentController {
  constructor(private readonly workspaceEnvironmentService: WorkspaceEnvironmentService) {}

  @Get()
  getEnvironment() {
    return this.workspaceEnvironmentService.getEnvironment();
  }

  @Get("health")
  getHealth() {
    return this.workspaceEnvironmentService.getHealth();
  }

  @Post("validate")
  validate() {
    return this.workspaceEnvironmentService.validate();
  }
}
