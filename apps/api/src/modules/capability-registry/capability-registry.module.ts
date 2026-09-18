import { Module } from "@nestjs/common";
import { ObservabilityGovernanceModule } from "../observability-governance/observability-governance.module.js";
import { AgentAttachmentQueryModule } from "../agent-registry/agent-attachment-query.module.js";
import { ConnectorCommandModule } from "../workspace-environment/connector-command.module.js";
import { WorkspaceEnvironmentModule } from "../workspace-environment/workspace-environment.module.js";
import { CapabilityRegistryController } from "./capability-registry.controller.js";
import { CapabilityRegistryService } from "./capability-registry.service.js";

@Module({
  imports: [
    ObservabilityGovernanceModule,
    WorkspaceEnvironmentModule,
    ConnectorCommandModule,
    AgentAttachmentQueryModule,
  ],
  controllers: [CapabilityRegistryController],
  providers: [CapabilityRegistryService],
  exports: [CapabilityRegistryService],
})
export class CapabilityRegistryModule {}
