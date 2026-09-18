import { Module } from "@nestjs/common";
import { ObservabilityGovernanceModule } from "../observability-governance/observability-governance.module.js";
import { ConnectorAuthService } from "./connector-auth.service.js";
import { ConnectorCommandModule } from "./connector-command.module.js";
import { ConnectorController } from "./connector.controller.js";
import { EnvironmentCheckService } from "./environment-check.service.js";
import { ENVIRONMENT_PROBE_PORT } from "./environment-probe.port.js";
import { EnvironmentProbeService } from "./environment-probe.service.js";
import { WorkspaceEnvironmentController } from "./workspace-environment.controller.js";
import { WorkspaceEnvironmentService } from "./workspace-environment.service.js";

@Module({
  imports: [ObservabilityGovernanceModule, ConnectorCommandModule],
  controllers: [WorkspaceEnvironmentController, ConnectorController],
  providers: [
    WorkspaceEnvironmentService,
    ConnectorAuthService,
    EnvironmentProbeService,
    EnvironmentCheckService,
    { provide: ENVIRONMENT_PROBE_PORT, useExisting: EnvironmentProbeService },
  ],
  exports: [
    WorkspaceEnvironmentService,
    ConnectorAuthService,
    EnvironmentProbeService,
    EnvironmentCheckService,
    ENVIRONMENT_PROBE_PORT,
  ],
})
export class WorkspaceEnvironmentModule {}
