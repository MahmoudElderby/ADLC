import { Controller, Get, Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "./platform/database/database.module.js";
import { PlatformSecurityModule } from "./platform/security/platform-security.module.js";
import { Public } from "./platform/auth/public.decorator.js";
import { AuthModule } from "./platform/auth/auth.module.js";
import { WorkspaceUserGuard } from "./platform/auth/workspace-user.guard.js";
import { ProblemDetailsFilter } from "./platform/http/problem-details.filter.js";
import { AgentRegistryModule } from "./modules/agent-registry/agent-registry.module.js";
import { CapabilityRegistryModule } from "./modules/capability-registry/capability-registry.module.js";
import { CommandCenterModule } from "./modules/command-center/command-center.module.js";
import { ObservabilityGovernanceModule } from "./modules/observability-governance/observability-governance.module.js";
import { SessionRunnerModule } from "./modules/session-runner/session-runner.module.js";
import { WorkspaceEnvironmentModule } from "./modules/workspace-environment/workspace-environment.module.js";

@Controller("health")
class HealthController {
  @Public()
  @Get()
  getHealth() {
    return {
      service: "adlc-api",
      status: "ok",
    };
  }
}

@Module({
  imports: [
    DatabaseModule,
    PlatformSecurityModule,
    AuthModule,
    ObservabilityGovernanceModule,
    CapabilityRegistryModule,
    AgentRegistryModule,
    WorkspaceEnvironmentModule,
    SessionRunnerModule,
    CommandCenterModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: WorkspaceUserGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsFilter,
    },
  ],
})
export class AppModule {}
