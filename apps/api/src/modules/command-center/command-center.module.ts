import { Module } from "@nestjs/common";
import { SessionRunnerModule } from "../session-runner/session-runner.module.js";
import { ObservabilityGovernanceModule } from "../observability-governance/observability-governance.module.js";
import { ObservabilityController } from "../observability-governance/observability.controller.js";
import { TraceService } from "../observability-governance/trace.service.js";
import { CommandCenterController } from "./command-center.controller.js";
import { CommandCenterService } from "./command-center.service.js";
import { LiveFleetProjector } from "./live-fleet-projector.js";

@Module({
  imports: [SessionRunnerModule, ObservabilityGovernanceModule],
  controllers: [CommandCenterController, ObservabilityController],
  providers: [CommandCenterService, LiveFleetProjector, TraceService],
})
export class CommandCenterModule {}
