import { Injectable } from "@nestjs/common";
import { RedactionService } from "../../platform/security/redaction.service.js";
import { AuditRepository, type AuditRecord } from "./audit.repository.js";

export type AuditInput = {
  workspaceId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  outcome: "succeeded" | "failed";
  correlationId: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly redactionService: RedactionService,
  ) {}

  async record(input: AuditInput): Promise<AuditRecord> {
    return this.auditRepository.append({
      ...input,
      metadataRedactedJson: this.redactionService.redact(input.metadata ?? {}),
    });
  }

  async listForEntity(
    workspaceId: string,
    entityType: string,
    entityId: string,
  ): Promise<AuditRecord[]> {
    return this.auditRepository.listByEntity(workspaceId, entityType, entityId);
  }

  async list(workspaceId: string, entityType?: string, entityId?: string): Promise<AuditRecord[]> {
    return this.auditRepository.listByWorkspace(workspaceId, entityType, entityId);
  }
}
