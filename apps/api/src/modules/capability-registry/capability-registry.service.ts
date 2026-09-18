import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  type McpServer,
  type RegisterMcpRequest,
  type RegisterSkillRequest,
  type Skill,
  registerMcpRequestSchema,
  registerSkillRequestSchema,
} from "@adlc/contracts";
import { mcpServers, skills } from "@adlc/database";
import { and, eq } from "drizzle-orm";
import { DATABASE, type Database } from "../../platform/database/database.module.js";
import { WorkspaceBootstrap } from "../../platform/database/workspace-bootstrap.js";
import { AuditService } from "../observability-governance/audit.service.js";
import { ConnectorCommandService } from "../workspace-environment/connector-command.service.js";

@Injectable()
export class CapabilityRegistryService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly bootstrap: WorkspaceBootstrap,
    private readonly connectorCommandService: ConnectorCommandService,
    private readonly auditService: AuditService,
  ) {}

  async listSkills(workspaceId: string): Promise<Skill[]> {
    const rows = await this.db.select().from(skills).where(eq(skills.workspaceId, workspaceId));
    return rows.map((row) => this.toSkill(row));
  }

  async registerSkill(
    workspaceId: string,
    actorId: string,
    input: RegisterSkillRequest,
  ): Promise<Skill> {
    await this.bootstrap.ensureWorkspace(workspaceId);
    const request = registerSkillRequestSchema.parse(input);
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
        compatibleEnvironmentTypesJson: ["self_hosted"],
        status: "pending_validation",
      })
      .returning();
    const skill = this.toSkill(row);
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

  async validateSkill(workspaceId: string, skillId: string): Promise<Skill> {
    const skill = await this.getSkill(workspaceId, skillId);
    const result = await this.connectorCommandService.validateSkill(skill.sourceReference);
    const [row] = await this.db
      .update(skills)
      .set({
        status: result.status,
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
    return rows.map((row) => this.toMcp(row));
  }

  async registerMcp(
    workspaceId: string,
    actorId: string,
    input: RegisterMcpRequest,
  ): Promise<McpServer> {
    await this.bootstrap.ensureWorkspace(workspaceId);
    const request = registerMcpRequestSchema.parse(input);
    const duplicate = (await this.listMcpServers(workspaceId)).find(
      (mcp) => mcp.label === request.label,
    );
    if (duplicate) {
      throw new ConflictException("MCP label must be unique in the workspace.");
    }

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
        credentialSecretId: request.credentialSecretId,
        status: "pending_validation",
      })
      .returning();
    const mcp = this.toMcp(row);
    await this.auditService.record({
      workspaceId,
      actorId,
      action: "mcp.registered",
      entityType: "mcp_server",
      entityId: mcp.id,
      outcome: "succeeded",
      correlationId: crypto.randomUUID(),
      metadata: { label: mcp.label, credentialSecretId: mcp.credentialSecretId },
    });
    return mcp;
  }

  async validateMcp(workspaceId: string, mcpId: string): Promise<McpServer> {
    const mcp = await this.getMcp(workspaceId, mcpId);
    const result = await this.connectorCommandService.validateMcp(
      mcp.serverUrl,
      mcp.allowedTools,
      Boolean(mcp.credentialSecretId),
    );
    const [row] = await this.db
      .update(mcpServers)
      .set({
        status: result.status,
        validationSummary: result.summary,
        validatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(mcpServers.id, mcpId), eq(mcpServers.workspaceId, workspaceId)))
      .returning();
    return this.toMcp(row);
  }

  async getSkill(workspaceId: string, skillId: string): Promise<Skill & { workspaceId: string }> {
    const [row] = await this.db
      .select()
      .from(skills)
      .where(and(eq(skills.id, skillId), eq(skills.workspaceId, workspaceId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException("Skill not found.");
    }
    return { ...this.toSkill(row), workspaceId };
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
    return { ...this.toMcp(row), workspaceId };
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

  private toSkill(row: typeof skills.$inferSelect): Skill {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      sourceType: row.sourceType as Skill["sourceType"],
      sourceReference: row.sourceReference,
      version: row.version,
      capabilityDirectories: (row.capabilityDirectoriesJson as string[]) ?? [],
      status: row.status,
      validationSummary: row.validationSummary,
      validatedAt: row.validatedAt?.toISOString() ?? null,
    };
  }

  private toMcp(row: typeof mcpServers.$inferSelect): McpServer {
    return {
      id: row.id,
      label: row.label,
      serverUrl: row.serverUrl,
      transportType: "http",
      connectionOrigin: "environment",
      allowedTools: (row.allowedToolsJson as string[]) ?? [],
      required: row.required,
      credentialSecretId: row.credentialSecretId,
      credentialHealth: row.credentialSecretId ? "healthy" : "not_required",
      status: row.status,
      validationSummary: row.validationSummary,
      validatedAt: row.validatedAt?.toISOString() ?? null,
    };
  }
}
