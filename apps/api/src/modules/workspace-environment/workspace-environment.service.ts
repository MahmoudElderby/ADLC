import { Injectable } from "@nestjs/common";
import type { WorkspaceEnvironment, WorkspaceHealth } from "@adlc/contracts";

const now = () => new Date().toISOString();

@Injectable()
export class WorkspaceEnvironmentService {
  private environment: WorkspaceEnvironment = {
    id: "00000000-0000-4000-8000-00000000e001",
    type: "self_hosted",
    workspacePath: "/workspace/adlc",
    connectorId: "00000000-0000-4000-8000-00000000e002",
    status: "valid",
    executorCredentialHealth: "healthy",
  };

  private health: WorkspaceHealth = {
    status: "healthy",
    connector: "online",
    filesystem: "healthy",
    executor: "available",
    checkedAt: now(),
    issues: [],
  };

  getEnvironment(): WorkspaceEnvironment {
    return this.environment;
  }

  getHealth(): WorkspaceHealth {
    return this.health;
  }

  validate(): WorkspaceHealth {
    this.health = { ...this.health, checkedAt: now() };
    this.environment = {
      ...this.environment,
      status: this.health.status === "healthy" ? "valid" : "unreachable",
    };
    return this.health;
  }

  setHealth(health: WorkspaceHealth): void {
    this.health = health;
    this.environment = {
      ...this.environment,
      status: health.status === "healthy" ? "valid" : "unreachable",
    };
  }
}
