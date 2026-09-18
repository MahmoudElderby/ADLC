import { Module } from "@nestjs/common";
import { OpenAIAgentsAdapter } from "../../integrations/openai/openai-agents.adapter.js";
import { CapabilityRegistryModule } from "../capability-registry/capability-registry.module.js";
import { ObservabilityGovernanceModule } from "../observability-governance/observability-governance.module.js";
import { AgentRegistryController } from "./agent-registry.controller.js";
import { AgentRegistryService } from "./agent-registry.service.js";
import { AgentAttachmentQueryModule } from "./agent-attachment-query.module.js";

@Module({
  imports: [CapabilityRegistryModule, ObservabilityGovernanceModule, AgentAttachmentQueryModule],
  controllers: [AgentRegistryController],
  providers: [AgentRegistryService, OpenAIAgentsAdapter],
  exports: [AgentRegistryService],
})
export class AgentRegistryModule {}
