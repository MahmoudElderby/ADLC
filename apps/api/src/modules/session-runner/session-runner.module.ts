import { Module } from "@nestjs/common";
import { OpenAISessionAdapter } from "../../integrations/openai/openai-session.adapter.js";
import { RedactionService } from "../../platform/security/redaction.service.js";
import { SessionStreamService } from "../../platform/streaming/session-stream.service.js";
import { AgentRegistryModule } from "../agent-registry/agent-registry.module.js";
import { CapabilityRegistryModule } from "../capability-registry/capability-registry.module.js";
import { AuditRepository } from "../observability-governance/audit.repository.js";
import { AuditService } from "../observability-governance/audit.service.js";
import { ArtifactService } from "../observability-governance/artifact.service.js";
import { WorkspaceEnvironmentModule } from "../workspace-environment/workspace-environment.module.js";
import { SessionController } from "./session.controller.js";
import { SessionEventService } from "./session-event.service.js";
import { SessionReadinessService } from "./session-readiness.service.js";
import { SessionService } from "./session.service.js";
import { SessionStreamController } from "./session-stream.controller.js";

@Module({
  imports: [AgentRegistryModule, CapabilityRegistryModule, WorkspaceEnvironmentModule],
  controllers: [SessionController, SessionStreamController],
  providers: [
    SessionService,
    SessionReadinessService,
    SessionEventService,
    SessionStreamService,
    ArtifactService,
    OpenAISessionAdapter,
    AuditRepository,
    AuditService,
    RedactionService,
  ],
  exports: [
    SessionService,
    SessionEventService,
    SessionStreamService,
    ArtifactService,
    AuditService,
  ],
})
export class SessionRunnerModule {}
