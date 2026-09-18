import { Inject, Injectable } from "@nestjs/common";
import type { WorkspaceEnvironment, WorkspaceHealth } from "@adlc/contracts";
import { workspaceConnectors, workspaceEnvironmentSettings } from "@adlc/database";
import { eq } from "drizzle-orm";
import { DATABASE, type Database } from "../../platform/database/database.module.js";
import { WorkspaceBootstrap } from "../../platform/database/workspace-bootstrap.js";
import { ConnectorCommandService } from "./connector-command.service.js";

const defaultWorkspaceId = "00000000-0000-4000-8000-000000000001";

@Injectable()
export class WorkspaceEnvironmentService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly bootstrap: WorkspaceBootstrap,
    private readonly connectorCommandService: ConnectorCommandService,
  ) {}

  async getEnvironment(workspaceId = defaultWorkspaceId): Promise<WorkspaceEnvironment> {
    const graph = await this.bootstrap.ensureWorkspace(workspaceId);
    return {
      id: graph.environmentId,
      type: "self_hosted",
      workspacePath: graph.workspacePath,
      connectorId: graph.connectorId,
      status: graph.connectorStatus === "online" ? "valid" : "unreachable",
      executorCredentialHealth: "healthy",
    };
  }

  async getHealth(workspaceId = defaultWorkspaceId): Promise<WorkspaceHealth> {
    const graph = await this.bootstrap.ensureWorkspace(workspaceId);
    const stored = graph.healthJson as Partial<WorkspaceHealth>;
    return {
      status: (stored.status as WorkspaceHealth["status"]) ?? "healthy",
      connector: (stored.connector as WorkspaceHealth["connector"]) ?? graph.connectorStatus,
      filesystem: (stored.filesystem as WorkspaceHealth["filesystem"]) ?? "healthy",
      executor: (stored.executor as WorkspaceHealth["executor"]) ?? "available",
      checkedAt: String(stored.checkedAt ?? new Date().toISOString()),
      issues: Array.isArray(stored.issues) ? stored.issues.map(String) : [],
    };
  }

  async validate(workspaceId = defaultWorkspaceId): Promise<WorkspaceHealth> {
    const graph = await this.bootstrap.ensureWorkspace(workspaceId);
    await this.connectorCommandService.validateWorkspaceHealth(graph.workspacePath);
    const health = await this.getHealth(workspaceId);
    const next: WorkspaceHealth = { ...health, checkedAt: new Date().toISOString() };
    await this.persistHealth(workspaceId, next);
    return next;
  }

  async setHealth(workspaceId: string, health: WorkspaceHealth): Promise<void> {
    await this.persistHealth(workspaceId, health);
  }

  private async persistHealth(workspaceId: string, health: WorkspaceHealth): Promise<void> {
    const graph = await this.bootstrap.ensureWorkspace(workspaceId);
    await this.db
      .update(workspaceEnvironmentSettings)
      .set({
        healthJson: health,
        status: health.status === "healthy" ? "valid" : "unreachable",
        validatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workspaceEnvironmentSettings.workspaceId, workspaceId));
    await this.db
      .update(workspaceConnectors)
      .set({
        status: health.connector,
        lastHeartbeatAt: health.connector === "online" ? new Date() : null,
      })
      .where(eq(workspaceConnectors.id, graph.connectorId));
  }
}
