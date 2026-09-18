import { Controller, Headers, Param, Sse } from "@nestjs/common";
import type { Observable } from "rxjs";
import type { SseMessage } from "../../platform/streaming/session-stream.service.js";
import { SessionStreamService } from "../../platform/streaming/session-stream.service.js";

@Controller("sessions/:sessionId/stream")
export class SessionStreamController {
  constructor(private readonly sessionStreamService: SessionStreamService) {}

  @Sse()
  stream(
    @Param("sessionId") sessionId: string,
    @Headers("last-event-id") lastEventId?: string,
  ): Observable<SseMessage> {
    return this.sessionStreamService.stream(sessionId, Number(lastEventId ?? 0));
  }
}
