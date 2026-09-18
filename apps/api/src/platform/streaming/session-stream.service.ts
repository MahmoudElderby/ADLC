import { Inject, Injectable } from "@nestjs/common";
import { concat, from, map, mergeMap, type Observable } from "rxjs";
import { SessionEventService } from "../../modules/session-runner/session-event.service.js";

export type SseMessage = {
  id: number;
  event: string;
  data: {
    sessionId: string;
    sequence: number;
    occurredAt: string;
    type: string;
    data: Record<string, unknown>;
  };
};

@Injectable()
export class SessionStreamService {
  constructor(@Inject(SessionEventService) private readonly sessionEventService: SessionEventService) {}

  stream(sessionId: string, lastEventId = 0): Observable<SseMessage> {
    return concat(
      from(this.replay(sessionId, lastEventId)).pipe(mergeMap((messages) => from(messages))),
      this.sessionEventService.observe(sessionId).pipe(map((event) => this.toSseMessage(event))),
    );
  }

  async replay(sessionId: string, lastEventId = 0): Promise<SseMessage[]> {
    return (await this.sessionEventService.listNormalized(sessionId))
      .filter((event) => event.sequence > lastEventId)
      .map((event) => this.toSseMessage(event));
  }

  private toSseMessage(event: {
    sessionId: string;
    sequence: number;
    occurredAt: string;
    type: string;
    metadata: Record<string, unknown>;
  }): SseMessage {
    return {
      id: event.sequence,
      event: event.type,
      data: {
        sessionId: event.sessionId,
        sequence: event.sequence,
        occurredAt: event.occurredAt,
        type: event.type,
        data: event.metadata,
      },
    };
  }
}
