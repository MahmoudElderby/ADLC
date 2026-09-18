import { Controller, Get, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AgentRegistryModule } from "./modules/agent-registry/agent-registry.module.js";
import { CapabilityRegistryModule } from "./modules/capability-registry/capability-registry.module.js";
import { SessionRunnerModule } from "./modules/session-runner/session-runner.module.js";
import { WorkspaceEnvironmentModule } from "./modules/workspace-environment/workspace-environment.module.js";
import { WorkspaceUserGuard } from "./platform/auth/workspace-user.guard.js";

@Controller("health")
class HealthController {
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
    CapabilityRegistryModule,
    AgentRegistryModule,
    WorkspaceEnvironmentModule,
    SessionRunnerModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: WorkspaceUserGuard,
    },
  ],
})
export class AppModule {}
