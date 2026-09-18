import { Controller, Get, Param, Query } from "@nestjs/common";
import { CurrentRequestContext, type RequestContext } from "../../platform/auth/request-context.js";
import { AuditService } from "./audit.service.js";
import { TraceService } from "./trace.service.js";

@Controller()
export class ObservabilityController {
  constructor(private readonly trace: TraceService, private readonly audits: AuditService) {}
  @Get("sessions/:sessionId/investigation") getInvestigation(@CurrentRequestContext() context: RequestContext, @Param("sessionId") id: string) { return this.trace.getInvestigation(context.workspaceId, id); }
  @Get("audit-log") async listAudit(@CurrentRequestContext() context: RequestContext, @Query("entityType") type?: string, @Query("entityId") id?: string) {
    const records = await this.audits.list(context.workspaceId, type, id);
    return records.map((audit) => ({ id: audit.id, actorId: audit.actorId, action: audit.action, entityType: audit.entityType, entityId: audit.entityId, outcome: audit.outcome, metadata: audit.metadataRedactedJson, createdAt: audit.createdAt.toISOString() }));
  }
}
