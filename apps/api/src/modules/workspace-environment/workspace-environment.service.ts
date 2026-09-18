import { Inject, Injectable } from "@nestjs/common";
import type { WorkspaceEnvironment, WorkspaceHealth } from "@adlc/contracts";
import { workspaceConnectors, workspaceEnvironmentSettings } from "@adlc/database";
import { eq } from "drizzle-orm";
import { DATABASE, type Database } from "../../platform/database/database.module.js";
import { WorkspaceBootstrap } from "../../platform/database/workspace-bootstrap.js";
import { CONNECTOR_ONLINE_WINDOW_MS } from "./environment-check.service.js";

const defaultWorkspaceId = "00000000-0000-4000-8000-000000000001";

@Injectable()
export class WorkspaceEnvironmentService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(WorkspaceBootstrap) private readonly bootstrap: WorkspaceBootstrap,
  ) {}

  async getEnvironment(workspaceId = defaultWorkspaceId): Promise<WorkspaceEnvironment> {
    const graph = await this.bootstrap.ensureWorkspace(workspaceId);
    const online = await this.isConnectorOnline(graph.connectorId);
    return {
      id: graph.environmentId,
      type: "self_hosted",
      workspacePath: graph.workspacePath,
      connectorId: graph.connectorId,
      status: online ? "valid" : "unreachable",
      executorCredentialHealth: "missing",
    };
  }

  async getHealth(workspaceId = defaultWorkspaceId): Promise<WorkspaceHealth> {
    const graph = await this.bootstrap.ensureWorkspace(workspaceId);
    const stored = graph.healthJson as Partial<WorkspaceHealth>;
    const online = await this.isConnectorOnline(graph.connectorId);
    const storedStatus = stored.status as WorkspaceHealth["status"] | undefined;
    const status: WorkspaceHealth["status"] =
      storedStatus === "unavailable" || storedStatus === "degraded"
        ? storedStatus
        : online
          ? (storedStatus ?? "healthy")
          : "unavailable";
    const storedIssues = Array.isArray(stored.issues) ? stored.issues.map(String) : [];
    return {
      status,
      connector: online ? "online" : "offline",
      canProbeReachability: online,
      filesystem: (stored.filesystem as WorkspaceHealth["filesystem"]) ?? "unknown",
      executor: "unknown",
      checkedAt: String(stored.checkedAt ?? new Date().toISOString()),
      issues:
        storedIssues.length > 0
          ? storedIssues
          : online
            ? []
            : ["Workspace connector has not checked in."],
    };
  }

  async validate(workspaceId = defaultWorkspaceId): Promise<WorkspaceHealth> {
    return this.getHealth(workspaceId);
  }

  async recordHeartbeat(
    connectorId: string,
    body: {
      connectorVersion?: string;
      hostFingerprint?: string;
      workspace?: { readable?: boolean; writable?: boolean };
      observedAt?: string;
    },
  ): Promise<void> {
    const [connector] = await this.db
      .select()
      .from(workspaceConnectors)
      .where(eq(workspaceConnectors.id, connectorId))
      .limit(1);
    if (!connector) {
      return;
    }

    const now = new Date();
    await this.db
      .update(workspaceConnectors)
      .set({
        status: "online",
        version: body.connectorVersion ?? connector.version,
        hostFingerprint: body.hostFingerprint ?? connector.hostFingerprint,
        lastHeartbeatAt: now,
      })
      .where(eq(workspaceConnectors.id, connectorId));

    const readable = body.workspace?.readable !== false;
    const writable = body.workspace?.writable !== false;
    const filesystem = !readable ? "unreadable" : !writable ? "unwritable" : "healthy";
    const health: WorkspaceHealth = {
      status: readable && writable ? "healthy" : "degraded",
      connector: "online",
      canProbeReachability: true,
      filesystem,
      executor: "unknown",
      checkedAt: body.observedAt ?? now.toISOString(),
      issues: readable && writable ? [] : ["Workspace filesystem is not fully usable."],
    };
    await this.db
      .update(workspaceEnvironmentSettings)
      .set({
        healthJson: health,
        status: health.status === "healthy" ? "valid" : "unreachable",
        validatedAt: now,
        updatedAt: now,
      })
      .where(eq(workspaceEnvironmentSettings.connectorId, connectorId));
  }

  async setHealth(workspaceId: string, health: WorkspaceHealth): Promise<void> {
    const graph = await this.bootstrap.ensureWorkspace(workspaceId);
    await this.db
      .update(workspaceEnvironmentSettings)
      .set({
        healthJson: health,
        status: health.status === "healthy" ? "valid" : "unreachable",
        validatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workspaceEnvironmentSettings.workspaceId, graph.workspaceId));
  }

  private async isConnectorOnline(connectorId: string): Promise<boolean> {
    const [connector] = await this.db
      .select({ lastHeartbeatAt: workspaceConnectors.lastHeartbeatAt })
      .from(workspaceConnectors)
      .where(eq(workspaceConnectors.id, connectorId))
      .limit(1);
    if (!connector?.lastHeartbeatAt) {
      return false;
    }
    return Date.now() - connector.lastHeartbeatAt.getTime() < CONNECTOR_ONLINE_WINDOW_MS;
  }
}
