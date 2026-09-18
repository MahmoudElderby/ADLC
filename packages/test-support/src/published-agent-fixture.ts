import {
  agentCapabilityAttachments,
  agentVersions,
  agents,
} from "@adlc/database";
import { and, eq } from "drizzle-orm";
import type { TestPostgres } from "./postgres.js";

export const SEEDED_PUBLISHED_AGENT_NAME = "Seeded published agent";

export type SeededPublishedAgent = {
  agentId: string;
  versionId: string;
  workspaceId: string;
  name: string;
};

export async function seedPublishedAgentWithoutAttachment(
  postgres: TestPostgres,
  input: { workspaceId: string; createdBy: string; name?: string },
): Promise<SeededPublishedAgent> {
  const name = input.name ?? SEEDED_PUBLISHED_AGENT_NAME;
  const existing = await postgres.db
    .select({
      agentId: agents.id,
      versionId: agents.currentPublishedVersionId,
      name: agents.name,
    })
    .from(agents)
    .where(and(eq(agents.workspaceId, input.workspaceId), eq(agents.name, name)))
    .limit(1);

  if (existing[0]?.agentId && existing[0].versionId) {
    return {
      agentId: existing[0].agentId,
      versionId: existing[0].versionId,
      workspaceId: input.workspaceId,
      name: existing[0].name,
    };
  }

  const [agent] = await postgres.db
    .insert(agents)
    .values({
      workspaceId: input.workspaceId,
      name,
      description: "Seeded published agent for capability delete-guard demonstrations.",
      status: "published",
      createdBy: input.createdBy,
    })
    .returning();

  const [version] = await postgres.db
    .insert(agentVersions)
    .values({
      agentId: agent.id,
      versionNumber: 1,
      lifecycle: "published",
      name,
      description: agent.description,
      model: "gpt-5.6-terra",
      instructions: "Seeded agent. No capability attachments until attachCapabilityToSeededAgent.",
      approvalMode: "always_allow",
      publishedAt: new Date(),
      createdBy: input.createdBy,
    })
    .returning();

  await postgres.db
    .update(agents)
    .set({
      currentPublishedVersionId: version.id,
      currentDraftVersionId: null,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, agent.id));

  return {
    agentId: agent.id,
    versionId: version.id,
    workspaceId: input.workspaceId,
    name,
  };
}

export async function attachCapabilityToSeededAgent(
  postgres: TestPostgres,
  input: {
    agentId: string;
    capabilityType: "skill" | "mcp_server";
    capabilityId: string;
    required?: boolean;
  },
): Promise<{ attachmentId: string; agentId: string; versionId: string }> {
  const [agent] = await postgres.db
    .select({
      id: agents.id,
      versionId: agents.currentPublishedVersionId,
    })
    .from(agents)
    .where(eq(agents.id, input.agentId))
    .limit(1);

  if (!agent?.versionId) {
    throw new Error("Seeded published agent is missing a published version.");
  }

  const existing = await postgres.db
    .select({ id: agentCapabilityAttachments.id })
    .from(agentCapabilityAttachments)
    .where(
      and(
        eq(agentCapabilityAttachments.agentVersionId, agent.versionId),
        eq(agentCapabilityAttachments.capabilityType, input.capabilityType),
        eq(agentCapabilityAttachments.capabilityId, input.capabilityId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return { attachmentId: existing[0].id, agentId: agent.id, versionId: agent.versionId };
  }

  const [attachment] = await postgres.db
    .insert(agentCapabilityAttachments)
    .values({
      agentVersionId: agent.versionId,
      capabilityType: input.capabilityType,
      capabilityId: input.capabilityId,
      required: input.required ?? true,
    })
    .returning();

  return { attachmentId: attachment.id, agentId: agent.id, versionId: agent.versionId };
}
