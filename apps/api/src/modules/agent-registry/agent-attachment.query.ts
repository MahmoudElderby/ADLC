import { Inject, Injectable } from "@nestjs/common";
import { agentCapabilityAttachments, agentVersions, agents } from "@adlc/database";
import { and, eq } from "drizzle-orm";
import { DATABASE, type Database } from "../../platform/database/database.module.js";

export type ReferencingAgent = {
  id: string;
  name: string;
};

@Injectable()
export class AgentAttachmentQuery {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listReferencingAgents(
    capabilityType: "skill" | "mcp_server",
    capabilityId: string,
  ): Promise<ReferencingAgent[]> {
    const rows = await this.db
      .select({
        id: agents.id,
        name: agents.name,
      })
      .from(agentCapabilityAttachments)
      .innerJoin(
        agentVersions,
        eq(agentCapabilityAttachments.agentVersionId, agentVersions.id),
      )
      .innerJoin(agents, eq(agentVersions.agentId, agents.id))
        .where(
          and(
            eq(agentCapabilityAttachments.capabilityType, capabilityType),
            eq(agentCapabilityAttachments.capabilityId, capabilityId),
          ),
        );

    const unique = new Map<string, ReferencingAgent>();
    for (const row of rows) {
      unique.set(row.id, row);
    }
    return [...unique.values()];
  }
}
