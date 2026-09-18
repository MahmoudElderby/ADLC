import { Body, Controller, Get, Headers, Inject, Param, Post, Query, Sse } from "@nestjs/common";
import type { Observable } from "rxjs";
import type { SessionStartRequest, SessionStatus } from "@adlc/contracts";
import { CurrentRequestContext, type RequestContext } from "../../platform/auth/request-context.js";
import type { SseMessage } from "../../platform/streaming/session-stream.service.js";
import { SessionStreamService } from "../../platform/streaming/session-stream.service.js";
import { ArtifactService } from "../observability-governance/artifact.service.js";
import { SessionEventService } from "./session-event.service.js";
import { SessionService } from "./session.service.js";

@Controller("sessions")
export class SessionController {
  constructor(
    @Inject(SessionService) private readonly sessionService: SessionService,
    @Inject(ArtifactService) private readonly artifactService: ArtifactService,
    @Inject(SessionEventService) private readonly sessionEventService: SessionEventService,
    @Inject(SessionStreamService) private readonly sessionStreamService: SessionStreamService,
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

  @Post(":sessionId/events")
  async ingestEvent(
    @CurrentRequestContext() context: RequestContext,
    @Param("sessionId") sessionId: string,
    @Body() body: { sourceEventId: string; type: string; payload?: Record<string, unknown> },
  ) {
    await this.sessionService.getSession(context.workspaceId, sessionId);
    return this.sessionEventService.ingestRawEvent(sessionId, {
      sourceEventId: body.sourceEventId,
      type: body.type,
      payload: body.payload ?? {},
    });
  }

  @Sse(":sessionId/stream")
  async stream(
    @CurrentRequestContext() context: RequestContext,
    @Param("sessionId") sessionId: string,
    @Headers("last-event-id") lastEventId?: string,
  ): Promise<Observable<SseMessage>> {
    await this.sessionService.getSession(context.workspaceId, sessionId);
    return this.sessionStreamService.stream(sessionId, Number(lastEventId ?? 0));
  }
}
