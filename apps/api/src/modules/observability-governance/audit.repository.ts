import { Inject, Injectable } from "@nestjs/common";
import { auditLog } from "@adlc/database";
import { and, desc, eq } from "drizzle-orm";
import { DATABASE, type Database } from "../../platform/database/database.module.js";

export type AuditRecord = {
  id: string;
  workspaceId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  outcome: "succeeded" | "failed";
  correlationId: string;
  metadataRedactedJson: Record<string, unknown>;
  createdAt: Date;
};

export type CreateAuditRecord = Omit<AuditRecord, "id" | "createdAt">;

@Injectable()
export class AuditRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async append(record: CreateAuditRecord): Promise<AuditRecord> {
    const [row] = await this.db
      .insert(auditLog)
      .values({
        workspaceId: record.workspaceId,
        actorId: record.actorId,
        action: record.action,
        entityType: record.entityType,
        entityId: record.entityId,
        outcome: record.outcome,
        correlationId: record.correlationId,
        metadataRedactedJson: record.metadataRedactedJson,
      })
      .returning();

    return {
      id: row.id,
      workspaceId: row.workspaceId,
      actorId: row.actorId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      outcome: row.outcome,
      correlationId: row.correlationId,
      metadataRedactedJson: (row.metadataRedactedJson ?? {}) as Record<string, unknown>,
      createdAt: row.createdAt,
    };
  }

  async listByEntity(
    workspaceId: string,
    entityType: string,
    entityId: string,
  ): Promise<AuditRecord[]> {
    const rows = await this.db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.workspaceId, workspaceId),
          eq(auditLog.entityType, entityType),
          eq(auditLog.entityId, entityId),
        ),
      )
      .orderBy(desc(auditLog.createdAt));
    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      actorId: row.actorId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      outcome: row.outcome,
      correlationId: row.correlationId,
      metadataRedactedJson: (row.metadataRedactedJson ?? {}) as Record<string, unknown>,
      createdAt: row.createdAt,
    }));
  }

  async listByWorkspace(
    workspaceId: string,
    entityType?: string,
    entityId?: string,
  ): Promise<AuditRecord[]> {
    const rows = await this.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.workspaceId, workspaceId))
      .orderBy(desc(auditLog.createdAt));
    return rows
      .filter(
        (row) =>
          (!entityType || row.entityType === entityType) && (!entityId || row.entityId === entityId),
      )
      .map((row) => ({
        id: row.id,
        workspaceId: row.workspaceId,
        actorId: row.actorId,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        outcome: row.outcome,
        correlationId: row.correlationId,
        metadataRedactedJson: (row.metadataRedactedJson ?? {}) as Record<string, unknown>,
        createdAt: row.createdAt,
      }));
  }
}
