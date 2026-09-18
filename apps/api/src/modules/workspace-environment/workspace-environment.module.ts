import { Module } from "@nestjs/common";
import { ObservabilityGovernanceModule } from "../observability-governance/observability-governance.module.js";
import { ConnectorAuthService } from "./connector-auth.service.js";
import { ConnectorController } from "./connector.controller.js";
import { WorkspaceEnvironmentController } from "./workspace-environment.controller.js";
import { WorkspaceEnvironmentService } from "./workspace-environment.service.js";

@Module({
  imports: [ObservabilityGovernanceModule],
  controllers: [WorkspaceEnvironmentController, ConnectorController],
  providers: [WorkspaceEnvironmentService, ConnectorAuthService],
  exports: [WorkspaceEnvironmentService, ConnectorAuthService],
})
export class WorkspaceEnvironmentModule {}
