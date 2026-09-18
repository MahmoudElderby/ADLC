import { Inject, Injectable } from "@nestjs/common";
import type { AuditEntry } from "@adlc/contracts";
import { workspaceUsers } from "@adlc/database";
import { eq } from "drizzle-orm";
import { DATABASE, type Database } from "../../platform/database/database.module.js";
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
    @Inject(AuditRepository) private readonly auditRepository: AuditRepository,
    @Inject(RedactionService) private readonly redactionService: RedactionService,
    @Inject(DATABASE) private readonly db: Database,
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

  async listEntries(
    workspaceId: string,
    entityType?: string,
    entityId?: string,
  ): Promise<AuditEntry[]> {
    const records = await this.list(workspaceId, entityType, entityId);
    const entries = await Promise.all(records.map((record) => this.toAuditEntry(record)));
    return entries.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async listEntriesForEntity(
    workspaceId: string,
    entityType: string,
    entityId: string,
  ): Promise<AuditEntry[]> {
    return this.listEntries(workspaceId, entityType, entityId);
  }

  private async toAuditEntry(record: AuditRecord): Promise<AuditEntry> {
    const [user] = await this.db
      .select({ id: workspaceUsers.id, displayName: workspaceUsers.displayName })
      .from(workspaceUsers)
      .where(eq(workspaceUsers.id, record.actorId))
      .limit(1);
    return {
      id: record.id,
      actor: {
        id: record.actorId,
        displayName: user?.displayName ?? "Unknown",
      },
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
      outcome: record.outcome,
      metadata: record.metadataRedactedJson,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
