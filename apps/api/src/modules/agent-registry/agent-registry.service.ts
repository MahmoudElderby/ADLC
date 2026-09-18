import { createHash } from "node:crypto";
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  type Agent,
  type CapabilityAttachment,
  type CreateAgentRequest,
  createAgentRequestSchema,
} from "@adlc/contracts";
import { agentCapabilityAttachments, agents, agentVersions } from "@adlc/database";
import { and, eq } from "drizzle-orm";
import { OpenAIAgentsAdapter } from "../../integrations/openai/openai-agents.adapter.js";
import { DATABASE, type Database } from "../../platform/database/database.module.js";
import { WorkspaceBootstrap } from "../../platform/database/workspace-bootstrap.js";
import { RedactionService } from "../../platform/security/redaction.service.js";
import { AuditService } from "../observability-governance/audit.service.js";
import { CapabilityRegistryService } from "../capability-registry/capability-registry.service.js";

@Injectable()
export class AgentRegistryService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(WorkspaceBootstrap) private readonly bootstrap: WorkspaceBootstrap,
    @Inject(CapabilityRegistryService)
    private readonly capabilityRegistryService: CapabilityRegistryService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(RedactionService) private readonly redactionService: RedactionService,
    @Inject(OpenAIAgentsAdapter) private readonly openaiGateway: OpenAIAgentsAdapter,
  ) {}

  async listAgents(workspaceId: string): Promise<Agent[]> {
    const rows = await this.db.select().from(agents).where(eq(agents.workspaceId, workspaceId));
    return Promise.all(rows.map((row) => this.hydrateAgent(row)));
  }

  async listPublishedAgents(workspaceId: string): Promise<Agent[]> {
    return (await this.listAgents(workspaceId)).filter((agent) => agent.status === "published");
  }

  async createDraft(
    workspaceId: string,
    actorId: string,
    input: CreateAgentRequest,
  ): Promise<Agent> {
    await this.bootstrap.ensureWorkspace(workspaceId);
    const request = createAgentRequestSchema.parse(input);
    const duplicate = (await this.listAgents(workspaceId)).find(
      (agent) => agent.name === request.name,
    );
    if (duplicate) {
      throw new ConflictException("Agent name must be unique in the workspace.");
    }

    const review = await this.reviewCapabilities(workspaceId, request.capabilities);
    const uniqueCapabilities = [
      ...new Map(
        request.capabilities.map((capability) => [
          `${capability.type}:${capability.capabilityId}`,
          capability,
        ]),
      ).values(),
    ];
    const [agentRow] = await this.db
      .insert(agents)
      .values({
        workspaceId,
        name: request.name,
        description: request.description,
        status: "draft",
        createdBy: actorId,
      })
      .returning();
    const [versionRow] = await this.db
      .insert(agentVersions)
      .values({
        agentId: agentRow.id,
        versionNumber: 1,
        lifecycle: "draft",
        name: request.name,
        description: request.description,
        model: request.model,
        instructions: request.instructions,
        approvalMode: "always_allow",
        configJson: request,
        createdBy: actorId,
      })
      .returning();
    await this.replaceAttachments(versionRow.id, uniqueCapabilities);
    await this.db
      .update(agents)
      .set({ currentDraftVersionId: versionRow.id, updatedAt: new Date() })
      .where(eq(agents.id, agentRow.id));

    await this.auditService.record({
      workspaceId,
      actorId,
      action: "agent.draft_created",
      entityType: "agent",
      entityId: agentRow.id,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { name: request.name, approvalMode: "always_allow" },
    });
    return this.getAgent(workspaceId, agentRow.id, review);
  }

  async getAgent(
    workspaceId: string,
    agentId: string,
    review?: { errors: string[]; warnings: string[] },
  ): Promise<Agent> {
    const [row] = await this.db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException("Agent not found.");
    }
    return this.hydrateAgent(row, review);
  }

  async getPublishedAgentForSession(workspaceId: string, agentId: string) {
    const agent = await this.getAgent(workspaceId, agentId);
    const [row] = await this.db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)))
      .limit(1);
    if (agent.status !== "published" || !row?.currentPublishedVersionId) {
      throw new ConflictException("A published agent is required before starting a session.");
    }
    const [version] = await this.db
      .select()
      .from(agentVersions)
      .where(eq(agentVersions.id, row.currentPublishedVersionId))
      .limit(1);
    if (!version || version.lifecycle !== "published") {
      throw new ConflictException("A published agent is required before starting a session.");
    }
    return {
      agent,
      versionId: version.id,
      versionNumber: version.versionNumber,
      config: version.configJson as CreateAgentRequest,
      instructionsHash: createHash("sha256").update(version.instructions).digest("hex").slice(0, 16),
    };
  }

  async updateDraft(
    workspaceId: string,
    actorId: string,
    agentId: string,
    input: CreateAgentRequest,
  ): Promise<Agent> {
    const request = createAgentRequestSchema.parse(input);
    const review = await this.reviewCapabilities(workspaceId, request.capabilities);
    const [agentRow] = await this.db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)))
      .limit(1);
    if (!agentRow) {
      throw new NotFoundException("Agent not found.");
    }

    const editingPublished = agentRow.status === "published";
    const currentDraftId = agentRow.currentDraftVersionId;
    const currentDraft = currentDraftId
      ? (
          await this.db
            .select()
            .from(agentVersions)
            .where(eq(agentVersions.id, currentDraftId))
            .limit(1)
        )[0]
      : undefined;

    if (editingPublished || currentDraft?.lifecycle === "published") {
      const published = agentRow.currentPublishedVersionId
        ? (
            await this.db
              .select()
              .from(agentVersions)
              .where(eq(agentVersions.id, agentRow.currentPublishedVersionId))
              .limit(1)
          )[0]
        : undefined;
      const [draft] = await this.db
        .insert(agentVersions)
        .values({
          agentId,
          versionNumber: (published?.versionNumber ?? currentDraft?.versionNumber ?? 1) + 1,
          lifecycle: "draft",
          name: request.name,
          description: request.description,
          model: request.model,
          instructions: request.instructions,
          approvalMode: "always_allow",
          configJson: request,
          createdBy: actorId,
        })
        .returning();
      await this.replaceAttachments(draft.id, request.capabilities);
      await this.db
        .update(agents)
        .set({
          name: request.name,
          description: request.description,
          currentDraftVersionId: draft.id,
          updatedAt: new Date(),
        })
        .where(eq(agents.id, agentId));
    } else if (currentDraft) {
      await this.db
        .update(agentVersions)
        .set({
          name: request.name,
          description: request.description,
          model: request.model,
          instructions: request.instructions,
          configJson: request,
        })
        .where(eq(agentVersions.id, currentDraft.id));
      await this.replaceAttachments(currentDraft.id, request.capabilities);
      await this.db
        .update(agents)
        .set({
          name: request.name,
          description: request.description,
          updatedAt: new Date(),
        })
        .where(eq(agents.id, agentId));
    }

    await this.auditService.record({
      workspaceId,
      actorId,
      action: "agent.draft_updated",
      entityType: "agent",
      entityId: agentId,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { capabilities: request.capabilities },
    });
    return this.getAgent(workspaceId, agentId, review);
  }

  async publish(workspaceId: string, actorId: string, agentId: string): Promise<Agent> {
    const [agentRow] = await this.db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)))
      .limit(1);
    if (!agentRow?.currentDraftVersionId) {
      throw new NotFoundException("Agent not found.");
    }
    const [draft] = await this.db
      .select()
      .from(agentVersions)
      .where(eq(agentVersions.id, agentRow.currentDraftVersionId))
      .limit(1);
    const config = (draft.configJson ?? {}) as CreateAgentRequest;
    const review = await this.reviewCapabilities(workspaceId, config.capabilities ?? []);
    if (review.errors.length > 0) {
      throw new ConflictException(review.errors.join(" "));
    }

    const payload = this.redactionService.redact({
      name: config.name,
      instructions: config.instructions,
      model: config.model,
      tools: config.capabilities,
      approvalMode: "always_allow",
    });
    const managed = await this.openaiGateway.createAgent({
      name: config.name,
      instructions: config.instructions,
      model: config.model,
      tools: (config.capabilities ?? []).map((capability) => ({ ...capability })),
    });

    if (agentRow.currentPublishedVersionId) {
      await this.db
        .update(agentVersions)
        .set({ lifecycle: "superseded" })
        .where(eq(agentVersions.id, agentRow.currentPublishedVersionId));
    }

    await this.db
      .update(agentVersions)
      .set({
        lifecycle: "published",
        publishedAt: new Date(),
        openaiPayloadRedactedJson: payload,
        openaiResponseRedactedJson: managed.responseRedacted,
      })
      .where(eq(agentVersions.id, draft.id));
    await this.db
      .update(agents)
      .set({
        status: "published",
        openaiAgentId: managed.id,
        currentPublishedVersionId: draft.id,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId));

    await this.auditService.record({
      workspaceId,
      actorId,
      action: "agent.published",
      entityType: "agent",
      entityId: agentId,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { payload, openaiResponse: managed.responseRedacted },
    });
    return this.getAgent(workspaceId, agentId, { errors: [], warnings: review.warnings });
  }

  private async replaceAttachments(versionId: string, capabilities: CapabilityAttachment[]) {
    const uniqueCapabilities = [
      ...new Map(
        capabilities.map((capability) => [
          `${capability.type}:${capability.capabilityId}`,
          capability,
        ]),
      ).values(),
    ];
    await this.db
      .delete(agentCapabilityAttachments)
      .where(eq(agentCapabilityAttachments.agentVersionId, versionId));
    if (uniqueCapabilities.length === 0) {
      return;
    }
    await this.db.insert(agentCapabilityAttachments).values(
      uniqueCapabilities.map((capability) => ({
        agentVersionId: versionId,
        capabilityType: capability.type,
        capabilityId: capability.capabilityId,
        required: capability.required,
        configOverrideRedactedJson: {},
      })),
    );
  }

  private async reviewCapabilities(workspaceId: string, capabilities: CapabilityAttachment[]) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const seen = new Set<string>();

    for (const capability of capabilities) {
      const key = `${capability.type}:${capability.capabilityId}`;
      if (seen.has(key)) {
        errors.push("Capabilities must be attached only once.");
      }
      seen.add(key);
      try {
        if (
          !(await this.capabilityRegistryService.hasValidCapability(
            workspaceId,
            capability.type,
            capability.capabilityId,
          ))
        ) {
          errors.push(
            `${capability.type} ${capability.capabilityId} must be valid before publish.`,
          );
        }
      } catch {
        errors.push(`${capability.type} ${capability.capabilityId} does not exist.`);
      }
      if (!capability.required) {
        warnings.push(`${capability.type} ${capability.capabilityId} is optional.`);
      }
    }

    return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
  }

  private async hydrateAgent(
    row: typeof agents.$inferSelect,
    review?: { errors: string[]; warnings: string[] },
  ): Promise<Agent> {
    const versionId = row.currentDraftVersionId ?? row.currentPublishedVersionId;
    const version = versionId
      ? (
          await this.db.select().from(agentVersions).where(eq(agentVersions.id, versionId)).limit(1)
        )[0]
      : undefined;
    const published = row.currentPublishedVersionId
      ? (
          await this.db
            .select()
            .from(agentVersions)
            .where(eq(agentVersions.id, row.currentPublishedVersionId))
            .limit(1)
        )[0]
      : undefined;
    const attachmentRows = versionId
      ? await this.db
          .select()
          .from(agentCapabilityAttachments)
          .where(eq(agentCapabilityAttachments.agentVersionId, versionId))
      : [];
    const computedReview =
      review ??
      (await this.reviewCapabilities(
        row.workspaceId,
        attachmentRows.map((attachment) => ({
          type: attachment.capabilityType as CapabilityAttachment["type"],
          capabilityId: attachment.capabilityId,
          required: attachment.required,
        })),
      ));

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      openaiAgentId: row.openaiAgentId,
      draftVersion: version?.versionNumber ?? 1,
      publishedVersion: published?.versionNumber ?? null,
      approvalMode: "always_allow",
      capabilities: attachmentRows.map((attachment) => ({
        type: attachment.capabilityType as CapabilityAttachment["type"],
        capabilityId: attachment.capabilityId,
        required: attachment.required,
      })),
      errors: computedReview.errors,
      warnings: computedReview.warnings,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
