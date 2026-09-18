import { Module } from "@nestjs/common";
import { AuditRepository } from "../observability-governance/audit.repository.js";
import { AuditService } from "../observability-governance/audit.service.js";
import { ConnectorCommandService } from "../workspace-environment/connector-command.service.js";
import { CapabilityRegistryController } from "./capability-registry.controller.js";
import { CapabilityRegistryService } from "./capability-registry.service.js";
import { RedactionService } from "../../platform/security/redaction.service.js";

@Module({
  controllers: [CapabilityRegistryController],
  providers: [
    CapabilityRegistryService,
    ConnectorCommandService,
    AuditRepository,
    AuditService,
    RedactionService,
  ],
  exports: [CapabilityRegistryService],
})
export class CapabilityRegistryModule {}
