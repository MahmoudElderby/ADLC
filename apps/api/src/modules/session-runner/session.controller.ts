import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import type { SessionStartRequest, SessionStatus } from "@adlc/contracts";
import { CurrentRequestContext, type RequestContext } from "../../platform/auth/request-context.js";
import { ArtifactService } from "../observability-governance/artifact.service.js";
import { SessionService } from "./session.service.js";

@Controller("sessions")
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly artifactService: ArtifactService,
  ) {}

  @Get()
  listSessions(
    @CurrentRequestContext() context: RequestContext,
    @Query("status") status?: SessionStatus,
  ) {
    return this.sessionService.listSessions(context.workspaceId, status);
  }

  @Post()
  startSession(
    @CurrentRequestContext() context: RequestContext,
    @Body() body: SessionStartRequest,
  ) {
    return this.sessionService.startSession(context.workspaceId, context.actorId, body);
  }

  @Get(":sessionId")
  getSession(
    @CurrentRequestContext() context: RequestContext,
    @Param("sessionId") sessionId: string,
  ) {
    return this.sessionService.getSession(context.workspaceId, sessionId);
  }

  @Post(":sessionId/cancel")
  cancelSession(
    @CurrentRequestContext() context: RequestContext,
    @Param("sessionId") sessionId: string,
  ) {
    return this.sessionService.cancelSession(context.workspaceId, context.actorId, sessionId);
  }

  @Get(":sessionId/artifacts")
  listArtifacts(
    @CurrentRequestContext() context: RequestContext,
    @Param("sessionId") sessionId: string,
  ) {
    return this.artifactService.listSessionArtifacts(context.workspaceId, sessionId);
  }
}
