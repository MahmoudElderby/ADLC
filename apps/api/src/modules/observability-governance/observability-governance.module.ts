import { Global, Module } from "@nestjs/common";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { ConnectorCommandModule } from "../workspace-environment/connector-command.module.js";
import { AuditRepository } from "./audit.repository.js";
import { AuditService } from "./audit.service.js";
import { ArtifactService } from "./artifact.service.js";

@Global()
@Module({
  imports: [DatabaseModule, ConnectorCommandModule],
  providers: [AuditRepository, AuditService, ArtifactService],
  exports: [AuditRepository, AuditService, ArtifactService],
})
export class ObservabilityGovernanceModule {}
