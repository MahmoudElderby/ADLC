import { Module } from "@nestjs/common";
import { WorkspaceEnvironmentController } from "./workspace-environment.controller.js";
import { WorkspaceEnvironmentService } from "./workspace-environment.service.js";

@Module({
  controllers: [WorkspaceEnvironmentController],
  providers: [WorkspaceEnvironmentService],
  exports: [WorkspaceEnvironmentService],
})
export class WorkspaceEnvironmentModule {}
