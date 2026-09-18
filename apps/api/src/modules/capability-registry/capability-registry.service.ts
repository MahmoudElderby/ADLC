import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  type McpServer,
  type RegisterMcpRequest,
  type RegisterSkillRequest,
  type Skill,
  registerMcpRequestSchema,
  registerSkillRequestSchema,
} from "@adlc/contracts";
import { AuditService } from "../observability-governance/audit.service.js";
import { ConnectorCommandService } from "../workspace-environment/connector-command.service.js";

const now = () => new Date().toISOString();

@Injectable()
export class CapabilityRegistryService {
  private readonly skills = new Map<string, Skill & { workspaceId: string }>();
  private readonly mcps = new Map<string, McpServer & { workspaceId: string }>();

  constructor(
    private readonly connectorCommandService: ConnectorCommandService,
    private readonly auditService: AuditService,
  ) {}

  listSkills(workspaceId: string): Skill[] {
    return [...this.skills.values()].filter((skill) => skill.workspaceId === workspaceId);
  }

  registerSkill(workspaceId: string, actorId: string, input: RegisterSkillRequest): Skill {
    const request = registerSkillRequestSchema.parse(input);
    const duplicate = this.listSkills(workspaceId).find(
      (skill) => skill.name === request.name && skill.version === request.version,
    );

    if (duplicate) {
      throw new ConflictException("Skill name and version must be unique in the workspace.");
    }

    const skill: Skill & { workspaceId: string } = {
      ...request,
      id: crypto.randomUUID(),
      workspaceId,
      status: "pending_validation",
      validationSummary: null,
      validatedAt: null,
    };

    this.skills.set(skill.id, skill);
    void this.auditService.record({
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
    const skill = this.getSkill(workspaceId, skillId);
    const result = await this.connectorCommandService.validateSkill(skill.sourceReference);
    const updated = {
      ...skill,
      status: result.status,
      validationSummary: result.summary,
      validatedAt: now(),
    };
    this.skills.set(skillId, updated);
    return updated;
  }

  listMcpServers(workspaceId: string): McpServer[] {
    return [...this.mcps.values()].filter((mcp) => mcp.workspaceId === workspaceId);
  }

  registerMcp(workspaceId: string, actorId: string, input: RegisterMcpRequest): McpServer {
    const request = registerMcpRequestSchema.parse(input);
    const duplicate = this.listMcpServers(workspaceId).find((mcp) => mcp.label === request.label);

    if (duplicate) {
      throw new ConflictException("MCP label must be unique in the workspace.");
    }

    const mcp: McpServer & { workspaceId: string } = {
      ...request,
      id: crypto.randomUUID(),
      workspaceId,
      status: "pending_validation",
      credentialHealth: request.credentialSecretId ? "healthy" : "not_required",
      validationSummary: null,
      validatedAt: null,
    };

    this.mcps.set(mcp.id, mcp);
    void this.auditService.record({
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
    const mcp = this.getMcp(workspaceId, mcpId);
    const result = await this.connectorCommandService.validateMcp(mcp.serverUrl, mcp.allowedTools);
    const updated = {
      ...mcp,
      status: result.status,
      validationSummary: result.summary,
      validatedAt: now(),
    };
    this.mcps.set(mcpId, updated);
    return updated;
  }

  getSkill(workspaceId: string, skillId: string): Skill & { workspaceId: string } {
    const skill = this.skills.get(skillId);
    if (!skill || skill.workspaceId !== workspaceId) {
      throw new NotFoundException("Skill not found.");
    }
    return skill;
  }

  getMcp(workspaceId: string, mcpId: string): McpServer & { workspaceId: string } {
    const mcp = this.mcps.get(mcpId);
    if (!mcp || mcp.workspaceId !== workspaceId) {
      throw new NotFoundException("MCP server not found.");
    }
    return mcp;
  }

  hasValidCapability(
    workspaceId: string,
    type: "skill" | "mcp_server",
    capabilityId: string,
  ): boolean {
    return type === "skill"
      ? this.getSkill(workspaceId, capabilityId).status === "valid"
      : this.getMcp(workspaceId, capabilityId).status === "valid";
  }

  forceMcpStatus(
    workspaceId: string,
    mcpId: string,
    status: McpServer["status"],
    summary = "Forced test status.",
  ): McpServer {
    const mcp = this.getMcp(workspaceId, mcpId);
    const updated = { ...mcp, status, validationSummary: summary, validatedAt: now() };
    this.mcps.set(mcpId, updated);
    return updated;
  }
}
