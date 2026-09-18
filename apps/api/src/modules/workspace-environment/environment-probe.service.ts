import { Inject, Injectable } from "@nestjs/common";
import { mcpServers } from "@adlc/database";
import { and, eq } from "drizzle-orm";
import { DATABASE, type Database } from "../../platform/database/database.module.js";
import type { EnvironmentProbePort, EnvironmentProbeResult } from "./environment-probe.port.js";

@Injectable()
export class EnvironmentProbeService implements EnvironmentProbePort {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async currentMcpReachability(workspaceId: string, mcpId: string): Promise<EnvironmentProbeResult> {
    const [row] = await this.db
      .select({
        reachabilityStatus: mcpServers.reachabilityStatus,
        reachabilitySummary: mcpServers.reachabilitySummary,
        reachabilityCheckedAt: mcpServers.reachabilityCheckedAt,
      })
      .from(mcpServers)
      .where(and(eq(mcpServers.id, mcpId), eq(mcpServers.workspaceId, workspaceId)))
      .limit(1);

    return {
      reachabilityStatus: row?.reachabilityStatus ?? "unverified",
      summary:
        row?.reachabilitySummary ??
        "Reachability is unverified until the workspace connector answers a platform-issued check.",
      checkedAt: row?.reachabilityCheckedAt ?? null,
    };
  }
}
