import { Module } from "@nestjs/common";
import { ObservabilityGovernanceModule } from "../observability-governance/observability-governance.module.js";
import { CapabilityRegistryController } from "./capability-registry.controller.js";
import { CapabilityRegistryService } from "./capability-registry.service.js";

@Module({
  imports: [ObservabilityGovernanceModule],
  controllers: [CapabilityRegistryController],
  providers: [CapabilityRegistryService],
  exports: [CapabilityRegistryService],
})
export class CapabilityRegistryModule {}
