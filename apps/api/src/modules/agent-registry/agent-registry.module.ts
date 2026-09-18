import { Module } from "@nestjs/common";
import { CapabilityRegistryModule } from "../capability-registry/capability-registry.module.js";
import { AuditRepository } from "../observability-governance/audit.repository.js";
import { AuditService } from "../observability-governance/audit.service.js";
import { RedactionService } from "../../platform/security/redaction.service.js";
import { AgentRegistryController } from "./agent-registry.controller.js";
import { AgentRegistryService } from "./agent-registry.service.js";

@Module({
  imports: [CapabilityRegistryModule],
  controllers: [AgentRegistryController],
  providers: [AgentRegistryService, AuditRepository, AuditService, RedactionService],
  exports: [AgentRegistryService],
})
export class AgentRegistryModule {}
