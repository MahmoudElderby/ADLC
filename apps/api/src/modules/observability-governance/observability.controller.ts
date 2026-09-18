import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { CurrentRequestContext, type RequestContext } from "../../platform/auth/request-context.js";
import { AuditService } from "./audit.service.js";
import { TraceService } from "./trace.service.js";

@Controller()
export class ObservabilityController {
  constructor(
    @Inject(TraceService) private readonly trace: TraceService,
    @Inject(AuditService) private readonly audits: AuditService,
  ) {}
  @Get("sessions/:sessionId/investigation") getInvestigation(
    @CurrentRequestContext() context: RequestContext,
    @Param("sessionId") id: string,
  ) {
    return this.trace.getInvestigation(context.workspaceId, id);
  }
  @Get("audit-log") listAudit(
    @CurrentRequestContext() context: RequestContext,
    @Query("entityType") type?: string,
    @Query("entityId") id?: string,
  ) {
    return this.audits.listEntries(context.workspaceId, type, id);
  }
}
