import { Module } from "@nestjs/common";
import { OpenAISessionAdapter } from "../../integrations/openai/openai-session.adapter.js";
import { SessionStreamService } from "../../platform/streaming/session-stream.service.js";
import { AgentRegistryModule } from "../agent-registry/agent-registry.module.js";
import { CapabilityRegistryModule } from "../capability-registry/capability-registry.module.js";
import { ObservabilityGovernanceModule } from "../observability-governance/observability-governance.module.js";
import { WorkspaceEnvironmentModule } from "../workspace-environment/workspace-environment.module.js";
import { SessionController } from "./session.controller.js";
import { SessionEventService } from "./session-event.service.js";
import { SessionReadinessService } from "./session-readiness.service.js";
import { SessionService } from "./session.service.js";

@Module({
  imports: [
    AgentRegistryModule,
    CapabilityRegistryModule,
    WorkspaceEnvironmentModule,
    ObservabilityGovernanceModule,
  ],
  controllers: [SessionController],
  providers: [
    SessionService,
    SessionReadinessService,
    SessionEventService,
    SessionStreamService,
    OpenAISessionAdapter,
  ],
  exports: [SessionService, SessionEventService, SessionStreamService],
})
export class SessionRunnerModule {}
