import { Controller, Get, Param, Query } from "@nestjs/common";
import { CurrentRequestContext, type RequestContext } from "../../platform/auth/request-context.js";
import { CommandCenterService } from "./command-center.service.js";
import { TraceService } from "../observability-governance/trace.service.js";

@Controller()
export class CommandCenterController {
  constructor(private readonly commandCenter: CommandCenterService, private readonly trace: TraceService) {}
  @Get("dashboard/live-fleet") getLiveFleet(@CurrentRequestContext() context: RequestContext) { return this.commandCenter.getLiveFleet(context.workspaceId); }
  @Get("sessions/history") listHistory(@CurrentRequestContext() context: RequestContext) { return this.commandCenter.listHistory(context.workspaceId); }
  @Get("sessions/:sessionId/trace") getTrace(@CurrentRequestContext() context: RequestContext, @Param("sessionId") id: string, @Query("afterSequence") after?: string) { return this.trace.getTrace(context.workspaceId, id, Number(after ?? 0)); }
}
