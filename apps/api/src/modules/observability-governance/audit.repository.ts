import { Injectable } from "@nestjs/common";

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
  private readonly records: AuditRecord[] = [];

  async append(record: CreateAuditRecord): Promise<AuditRecord> {
    const auditRecord: AuditRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    this.records.push(auditRecord);
    return auditRecord;
  }

  async listByEntity(
    workspaceId: string,
    entityType: string,
    entityId: string,
  ): Promise<AuditRecord[]> {
    return this.records.filter(
      (record) =>
        record.workspaceId === workspaceId &&
        record.entityType === entityType &&
        record.entityId === entityId,
    );
  }
}
