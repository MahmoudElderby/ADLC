import { Global, Module } from "@nestjs/common";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { WorkspaceBootstrap } from "../../platform/database/workspace-bootstrap.js";
import { ConnectorCommandService } from "../workspace-environment/connector-command.service.js";
import { AuditRepository } from "./audit.repository.js";
import { AuditService } from "./audit.service.js";
import { ArtifactService } from "./artifact.service.js";

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    WorkspaceBootstrap,
    AuditRepository,
    AuditService,
    ArtifactService,
    ConnectorCommandService,
  ],
  exports: [
    WorkspaceBootstrap,
    AuditRepository,
    AuditService,
    ArtifactService,
    ConnectorCommandService,
  ],
})
export class ObservabilityGovernanceModule {}
