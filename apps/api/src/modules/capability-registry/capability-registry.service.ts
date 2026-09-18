import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  type ActorSummary,
  type DraftValidation,
  type McpServer,
  type RegisterMcpRequest,
  type RegisterSkillRequest,
  type Skill,
  type SkillValidationStatus,
  registerMcpRequestSchema,
  registerSkillRequestSchema,
  updateMcpRequestSchema,
  updateSkillRequestSchema,
} from "@adlc/contracts";
import { mcpServers, skills, workspaceSecrets, workspaceUsers } from "@adlc/database";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";
import { DATABASE, type Database } from "../../platform/database/database.module.js";
import { RedactionService } from "../../platform/security/redaction.service.js";
import { SecretVaultService } from "../../platform/security/secret-vault.service.js";
import { AgentAttachmentQuery } from "../agent-registry/agent-attachment.query.js";
import { AuditService } from "../observability-governance/audit.service.js";
import { ConnectorCommandService } from "../workspace-environment/connector-command.service.js";
import { EnvironmentCheckService } from "../workspace-environment/environment-check.service.js";
import {
  ENVIRONMENT_PROBE_PORT,
  type EnvironmentProbePort,
} from "../workspace-environment/environment-probe.port.js";
import { validateMcpDraft } from "./mcp-draft.validator.js";
import { validateSkillDraft } from "./skill-draft.validator.js";

@Injectable()
export class CapabilityRegistryService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(ConnectorCommandService) private readonly connectorCommandService: ConnectorCommandService,
    @Inject(ENVIRONMENT_PROBE_PORT) private readonly environmentProbe: EnvironmentProbePort,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(SecretVaultService) private readonly secretVault: SecretVaultService,
    @Inject(RedactionService) private readonly redaction: RedactionService,
    @Inject(EnvironmentCheckService) private readonly environmentChecks: EnvironmentCheckService,
    @Inject(AgentAttachmentQuery) private readonly attachments: AgentAttachmentQuery,
  ) {}

  async listSkills(workspaceId: string): Promise<Skill[]> {
    const rows = await this.db.select().from(skills).where(eq(skills.workspaceId, workspaceId));
    return Promise.all(rows.map((row) => this.toSkill(row)));
  }

  validateSkillDraft(input: unknown): DraftValidation {
    return validateSkillDraft(input);
  }

  validateMcpDraft(input: unknown): DraftValidation {
    return validateMcpDraft(input);
  }

  async registerSkill(
    workspaceId: string,
    actorId: string,
    input: RegisterSkillRequest,
  ): Promise<Skill> {
    const request = this.parseSkillWrite(input);
    const duplicate = (await this.listSkills(workspaceId)).find(
      (skill) => skill.name === request.name && skill.version === request.version,
    );
    if (duplicate) {
      throw new ConflictException("Skill name and version must be unique in the workspace.");
    }

    const [row] = await this.db
      .insert(skills)
      .values({
        workspaceId,
        name: request.name,
        description: request.description,
        sourceType: request.sourceType,
        sourceReference: request.sourceReference,
        version: request.version,
        capabilityDirectoriesJson: request.capabilityDirectories,
        compatibleEnvironmentTypesJson: request.compatibleEnvironmentTypes ?? ["self_hosted"],
        status: "pending_validation",
        createdBy: actorId,
        updatedBy: actorId,
      })
      .returning();
    const skill = await this.toSkill(row);
    await this.auditService.record({
      workspaceId,
      actorId,
      action: "skill.registered",
      entityType: "skill",
      entityId: skill.id,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { name: skill.name, version: skill.version },
    });
    return skill;
  }

  async updateSkill(
    workspaceId: string,
    actorId: string,
    skillId: string,
    input: unknown,
  ): Promise<Skill> {
    const existing = await this.getSkill(workspaceId, skillId);
    const request = this.parseSkillUpdate(input);
    if (existing.updatedAt !== request.updatedAt) {
      throw new ConflictException("Skill was changed by someone else. Refresh and retry.");
    }
    const duplicate = (await this.listSkills(workspaceId)).find(
      (skill) =>
        skill.id !== skillId && skill.name === request.name && skill.version === request.version,
    );
    if (duplicate) {
      throw new ConflictException("Skill name and version must be unique in the workspace.");
    }

    const [row] = await this.db
      .update(skills)
      .set({
        name: request.name,
        description: request.description,
        sourceType: request.sourceType,
        sourceReference: request.sourceReference,
        version: request.version,
        capabilityDirectoriesJson: request.capabilityDirectories,
        compatibleEnvironmentTypesJson: request.compatibleEnvironmentTypes ?? ["self_hosted"],
        updatedBy: actorId,
        updatedAt: new Date(),
      })
      .where(and(eq(skills.id, skillId), eq(skills.workspaceId, workspaceId)))
      .returning();
    const skill = await this.toSkill(row);
    await this.auditService.record({
      workspaceId,
      actorId,
      action: "skill.updated",
      entityType: "skill",
      entityId: skill.id,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { name: skill.name, version: skill.version },
    });
    return skill;
  }

  async deleteSkill(workspaceId: string, actorId: string, skillId: string): Promise<void> {
    const skill = await this.getSkill(workspaceId, skillId);
    await this.assertNotReferenced(workspaceId, actorId, "skill", skillId, skill.name);
    await this.db
      .delete(skills)
      .where(and(eq(skills.id, skillId), eq(skills.workspaceId, workspaceId)));
    await this.auditService.record({
      workspaceId,
      actorId,
      action: "skill.removed",
      entityType: "skill",
      entityId: skill.id,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { name: skill.name, version: skill.version },
    });
  }

  async listSkillAudit(workspaceId: string, skillId: string) {
    await this.getSkill(workspaceId, skillId);
    return this.auditService.listEntries(workspaceId, "skill", skillId);
  }

  async validateSkill(workspaceId: string, skillId: string): Promise<Skill> {
    const skill = await this.getSkill(workspaceId, skillId);
    const result = await this.connectorCommandService.validateSkill(skill.sourceReference);
    const status = this.asSkillStatus(result.status);
    const [row] = await this.db
      .update(skills)
      .set({
        status,
        validationSummary: result.summary,
        validatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(skills.id, skillId), eq(skills.workspaceId, workspaceId)))
      .returning();
    return this.toSkill(row);
  }

  async listMcpServers(workspaceId: string): Promise<McpServer[]> {
    const rows = await this.db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.workspaceId, workspaceId));
    return Promise.all(rows.map((row) => this.toMcp(row)));
  }

  async registerMcp(
    workspaceId: string,
    actorId: string,
    input: RegisterMcpRequest,
  ): Promise<McpServer> {
    this.refuseBlockingMcpDraft(input, true);
    let request: RegisterMcpRequest;
    try {
      request = registerMcpRequestSchema.parse(input);
    } catch (error) {
      this.throwZodAsUnprocessable(error, "MCP cannot be saved while blocking errors remain.");
    }

    await this.assertUniqueMcpLabel(workspaceId, request.label, actorId);

    const secretId = await this.storeMcpCredential(workspaceId, actorId, request.credential);
    const unverifiedSummary =
      "The workspace connector is offline, so reachability is unverified until it checks in.";
    const [row] = await this.db
      .insert(mcpServers)
      .values({
        workspaceId,
        label: request.label,
        transportType: "http",
        serverUrl: request.serverUrl,
        connectionOrigin: "environment",
        allowedToolsJson: request.allowedTools,
        required: request.required,
        credentialSecretId: secretId,
        status: "pending_validation",
        reachabilityStatus: "unverified",
        reachabilitySummary: unverifiedSummary,
        createdBy: actorId,
        updatedBy: actorId,
      })
      .returning();

    await this.auditService.record({
      workspaceId,
      actorId,
      action: "mcp.registered",
      entityType: "mcp_server",
      entityId: row.id,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { label: row.label, credentialSecretId: secretId },
    });

    await this.environmentChecks.requestMcpReachabilityCheck({
      workspaceId,
      actorId,
      mcpId: row.id,
      serverUrl: row.serverUrl,
      allowedTools: request.allowedTools,
    });

    return this.getMcp(workspaceId, row.id);
  }

  async updateMcp(
    workspaceId: string,
    actorId: string,
    mcpId: string,
    input: unknown,
  ): Promise<McpServer> {
    const existing = await this.getMcp(workspaceId, mcpId);
    this.refuseBlockingMcpDraft(input, false);
    let request: ReturnType<typeof updateMcpRequestSchema.parse>;
    try {
      request = updateMcpRequestSchema.parse(input);
    } catch (error) {
      this.throwZodAsUnprocessable(error, "MCP cannot be saved while blocking errors remain.");
    }
    if (existing.updatedAt !== request.updatedAt) {
      throw new ConflictException("MCP server was changed by someone else. Refresh and retry.");
    }
    await this.assertUniqueMcpLabel(workspaceId, request.label, actorId, mcpId);

    let secretId = existing.credentialSecretId;
    if (request.credential) {
      secretId = await this.storeMcpCredential(workspaceId, actorId, request.credential, secretId);
    }

    await this.db
      .update(mcpServers)
      .set({
        label: request.label,
        serverUrl: request.serverUrl,
        allowedToolsJson: request.allowedTools,
        required: request.required,
        credentialSecretId: secretId,
        updatedBy: actorId,
        updatedAt: new Date(),
      })
      .where(and(eq(mcpServers.id, mcpId), eq(mcpServers.workspaceId, workspaceId)));

    await this.auditService.record({
      workspaceId,
      actorId,
      action: "mcp.updated",
      entityType: "mcp_server",
      entityId: mcpId,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { label: request.label },
    });

    await this.environmentChecks.requestMcpReachabilityCheck({
      workspaceId,
      actorId,
      mcpId,
      serverUrl: request.serverUrl,
      allowedTools: request.allowedTools,
    });

    return this.getMcp(workspaceId, mcpId);
  }

  async deleteMcp(workspaceId: string, actorId: string, mcpId: string): Promise<void> {
    const mcp = await this.getMcp(workspaceId, mcpId);
    await this.assertNotReferenced(workspaceId, actorId, "mcp_server", mcpId, mcp.label);
    await this.db
      .delete(mcpServers)
      .where(and(eq(mcpServers.id, mcpId), eq(mcpServers.workspaceId, workspaceId)));
    await this.auditService.record({
      workspaceId,
      actorId,
      action: "mcp.removed",
      entityType: "mcp_server",
      entityId: mcp.id,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { label: mcp.label },
    });
  }

  async listMcpAudit(workspaceId: string, mcpId: string) {
    await this.getMcp(workspaceId, mcpId);
    return this.auditService.listEntries(workspaceId, "mcp_server", mcpId);
  }

  async validateMcp(workspaceId: string, actorId: string, mcpId: string): Promise<McpServer> {
    const mcp = await this.getMcp(workspaceId, mcpId);
    await this.environmentChecks.requestMcpReachabilityCheck({
      workspaceId,
      actorId,
      mcpId,
      serverUrl: mcp.serverUrl,
      allowedTools: mcp.allowedTools,
    });
    await this.auditService.record({
      workspaceId,
      actorId,
      action: "mcp.revalidated",
      entityType: "mcp_server",
      entityId: mcpId,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { label: mcp.label },
    });
    return this.getMcp(workspaceId, mcpId);
  }

  async getSkill(workspaceId: string, skillId: string): Promise<Skill> {
    const [row] = await this.db
      .select()
      .from(skills)
      .where(and(eq(skills.id, skillId), eq(skills.workspaceId, workspaceId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException("Skill not found.");
    }
    return this.toSkill(row);
  }

  async getMcp(workspaceId: string, mcpId: string): Promise<McpServer & { workspaceId: string }> {
    const [row] = await this.db
      .select()
      .from(mcpServers)
      .where(and(eq(mcpServers.id, mcpId), eq(mcpServers.workspaceId, workspaceId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException("MCP server not found.");
    }
    return { ...(await this.toMcp(row)), workspaceId };
  }

  async hasValidCapability(
    workspaceId: string,
    type: "skill" | "mcp_server",
    capabilityId: string,
  ): Promise<boolean> {
    return type === "skill"
      ? (await this.getSkill(workspaceId, capabilityId)).status === "valid"
      : (await this.getMcp(workspaceId, capabilityId)).status === "valid";
  }

  private async storeMcpCredential(
    workspaceId: string,
    actorId: string,
    credential: string,
    existingSecretId?: string | null,
  ): Promise<string> {
    this.redaction.registerSecretCanary(credential);
    const encrypted = this.secretVault.encrypt(credential);
    if (existingSecretId) {
      await this.db
        .update(workspaceSecrets)
        .set({
          encryptedValue: encrypted.ciphertext,
          keyVersion: encrypted.keyVersion,
          fingerprint: encrypted.fingerprint,
          rotatedAt: new Date(),
        })
        .where(eq(workspaceSecrets.id, existingSecretId));
      await this.auditService.record({
        workspaceId,
        actorId,
        action: "secret.stored",
        entityType: "workspace_secret",
        entityId: existingSecretId,
        outcome: "succeeded",
        correlationId: crypto.randomUUID(),
        metadata: { type: "mcp_credential", fingerprint: encrypted.fingerprint },
      });
      return existingSecretId;
    }

    const [secret] = await this.db
      .insert(workspaceSecrets)
      .values({
        workspaceId,
        type: "mcp_credential",
        encryptedValue: encrypted.ciphertext,
        keyVersion: encrypted.keyVersion,
        fingerprint: encrypted.fingerprint,
      })
      .returning();
    await this.auditService.record({
      workspaceId,
      actorId,
      action: "secret.stored",
      entityType: "workspace_secret",
      entityId: secret.id,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { type: "mcp_credential", fingerprint: encrypted.fingerprint },
    });
    return secret.id;
  }

  private async assertUniqueMcpLabel(
    workspaceId: string,
    label: string,
    actorId: string,
    excludeId?: string,
  ): Promise<void> {
    const duplicate = (await this.listMcpServers(workspaceId)).find(
      (mcp) => mcp.label === label && mcp.id !== excludeId,
    );
    if (!duplicate) {
      return;
    }
    await this.auditService.record({
      workspaceId,
      actorId,
      action: "mcp.register_conflict",
      entityType: "mcp_server",
      entityId: duplicate.id,
      outcome: "failed",
      correlationId: crypto.randomUUID(),
      metadata: { label },
    });
    throw new ConflictException(`MCP label "${label}" is already registered.`);
  }

  private async assertNotReferenced(
    workspaceId: string,
    actorId: string,
    capabilityType: "skill" | "mcp_server",
    capabilityId: string,
    name: string,
  ): Promise<void> {
    const referencingAgents = await this.attachments.listReferencingAgents(
      capabilityType,
      capabilityId,
    );
    if (referencingAgents.length === 0) {
      return;
    }
    await this.auditService.record({
      workspaceId,
      actorId,
      action: capabilityType === "skill" ? "skill.remove_blocked" : "mcp.remove_blocked",
      entityType: capabilityType,
      entityId: capabilityId,
      outcome: "failed",
      correlationId: crypto.randomUUID(),
      metadata: { name, referencingAgents },
    });
    throw new ConflictException({
      title: "Conflict",
      detail: `${name} is referenced by ${referencingAgents.map((agent) => agent.name).join(", ")} and cannot be removed.`,
      referencingAgents,
    });
  }

  private parseSkillWrite(input: unknown): RegisterSkillRequest {
    this.refuseBlockingSkillDraft(input);
    try {
      return registerSkillRequestSchema.parse(input);
    } catch (error) {
      this.throwZodAsUnprocessable(error);
    }
  }

  private parseSkillUpdate(input: unknown) {
    this.refuseBlockingSkillDraft(input);
    try {
      return updateSkillRequestSchema.parse(input);
    } catch (error) {
      this.throwZodAsUnprocessable(error);
    }
  }

  private refuseBlockingSkillDraft(input: unknown): void {
    const draft = validateSkillDraft(input);
    if (draft.blockingErrors.length > 0) {
      throw new UnprocessableEntityException({
        title: "Unprocessable Entity",
        detail: draft.blockingErrors[0]?.message ?? "Skill cannot be saved while blocking errors remain.",
        errors: draft.blockingErrors,
      });
    }
  }

  private refuseBlockingMcpDraft(input: unknown, credentialRequired: boolean): void {
    const draft = validateMcpDraft(
      credentialRequired
        ? input
        : { ...(typeof input === "object" && input ? input : {}), credential: undefined },
    );
    const blocking = credentialRequired
      ? draft.blockingErrors
      : draft.blockingErrors.filter((issue) => issue.field !== "credential");
    if (blocking.length > 0) {
      throw new UnprocessableEntityException({
        title: "Unprocessable Entity",
        detail: blocking[0]?.message ?? "MCP cannot be saved while blocking errors remain.",
        errors: blocking,
      });
    }
  }

  private throwZodAsUnprocessable(
    error: unknown,
    detail = "Skill cannot be saved while blocking errors remain.",
  ): never {
    if (error instanceof ZodError) {
      throw new UnprocessableEntityException({
        title: "Unprocessable Entity",
        detail,
        errors: error.issues.map((issue) => ({
          field: issue.path.join(".") || "body",
          message: issue.message,
        })),
      });
    }
    throw error;
  }

  private asSkillStatus(status: string): SkillValidationStatus {
    return status === "valid" || status === "invalid" || status === "pending_validation"
      ? status
      : "invalid";
  }

  private async actorSummary(userId: string): Promise<ActorSummary> {
    const [user] = await this.db
      .select({ id: workspaceUsers.id, displayName: workspaceUsers.displayName })
      .from(workspaceUsers)
      .where(eq(workspaceUsers.id, userId))
      .limit(1);
    return { id: userId, displayName: user?.displayName ?? "Unknown" };
  }

  private async toSkill(row: typeof skills.$inferSelect): Promise<Skill> {
    const createdBy = await this.actorSummary(row.createdBy);
    const lastChangedBy = await this.actorSummary(row.updatedBy);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      sourceType: row.sourceType as Skill["sourceType"],
      sourceReference: row.sourceReference,
      version: row.version,
      capabilityDirectories: (row.capabilityDirectoriesJson as string[]) ?? [],
      status: this.asSkillStatus(row.status),
      validationSummary: row.validationSummary,
      validatedAt: row.validatedAt?.toISOString() ?? null,
      createdBy,
      lastChangedBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toMcp(row: typeof mcpServers.$inferSelect): Promise<McpServer> {
    const createdBy = await this.actorSummary(row.createdBy);
    const lastChangedBy = await this.actorSummary(row.updatedBy);
    return {
      id: row.id,
      label: row.label,
      serverUrl: row.serverUrl,
      transportType: "http",
      connectionOrigin: "environment",
      allowedTools: (row.allowedToolsJson as string[]) ?? [],
      required: row.required,
      credentialSecretId: row.credentialSecretId,
      credentialHealth: row.credentialSecretId ? "healthy" : "missing",
      status: this.asSkillStatus(row.status),
      reachabilityStatus: row.reachabilityStatus,
      reachabilitySummary: row.reachabilitySummary,
      validationSummary: row.validationSummary,
      validatedAt: row.validatedAt?.toISOString() ?? null,
      createdBy,
      lastChangedBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
