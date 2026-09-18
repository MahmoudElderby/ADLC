import { Injectable } from "@nestjs/common";
import type { NormalizedSessionEvent, SessionStatus } from "@adlc/contracts";
import { Observable, Subject } from "rxjs";
import { RedactionService } from "../../platform/security/redaction.service.js";
import { SessionService } from "./session.service.js";

export type RawSessionEventInput = {
  sourceEventId: string;
  type: string;
  payload: Record<string, unknown>;
};

type RawRecord = {
  id: string;
  sessionId: string;
  sourceEventId: string;
  sequence: number;
  type: string;
  payload: Record<string, unknown>;
  receivedAt: string;
};

const categoryByType = (type: string): NormalizedSessionEvent["category"] => {
  if (type.startsWith("session.state")) return "lifecycle";
  if (type.startsWith("session.output")) return "output";
  if (type.startsWith("tool.")) return "tool";
  if (type.startsWith("artifact.")) return "artifact";
  return "error";
};

@Injectable()
export class SessionEventService {
  private readonly raw = new Map<string, RawRecord>();
  private readonly normalized = new Map<string, NormalizedSessionEvent[]>();
  private readonly nextSequence = new Map<string, number>();
  private readonly liveSubjects = new Map<string, Subject<NormalizedSessionEvent>>();

  constructor(
    private readonly sessionService: SessionService,
    private readonly redactionService: RedactionService,
  ) {}

  ingestRawEvent(sessionId: string, input: RawSessionEventInput) {
    const rawKey = `${sessionId}:${input.sourceEventId}`;
    const existing = this.raw.get(rawKey);
    if (existing) {
      return { raw: existing, normalized: this.findByRaw(sessionId, existing.id) };
    }

    const sequence = this.nextSequence.get(sessionId) ?? 1;
    this.nextSequence.set(sessionId, sequence + 1);
    const redactedPayload = this.redactionService.redact(input.payload);
    const raw: RawRecord = {
      id: crypto.randomUUID(),
      sessionId,
      sourceEventId: input.sourceEventId,
      sequence,
      type: input.type,
      payload: redactedPayload,
      receivedAt: new Date().toISOString(),
    };
    const normalized: NormalizedSessionEvent = {
      id: crypto.randomUUID(),
      sessionId,
      sequence,
      category: categoryByType(input.type),
      type: input.type,
      actorType: input.type.startsWith("tool.") ? "mcp" : "system",
      actorId: null,
      summary: this.summaryFor(input.type, redactedPayload),
      metadata: redactedPayload,
      occurredAt: raw.receivedAt,
    };

    this.raw.set(rawKey, raw);
    this.normalized.set(sessionId, [...(this.normalized.get(sessionId) ?? []), normalized]);
    this.applyStateTransition(sessionId, input.type, redactedPayload);
    this.sessionService.updateLiveFleet(sessionId, normalized.summary);
    this.subjectFor(sessionId).next(normalized);
    return { raw, normalized };
  }

  listNormalized(sessionId: string): NormalizedSessionEvent[] {
    return [...(this.normalized.get(sessionId) ?? [])].sort((a, b) => a.sequence - b.sequence);
  }

  observe(sessionId: string): Observable<NormalizedSessionEvent> {
    return this.subjectFor(sessionId).asObservable();
  }

  private subjectFor(sessionId: string): Subject<NormalizedSessionEvent> {
    const existing = this.liveSubjects.get(sessionId);
    if (existing) {
      return existing;
    }

    const created = new Subject<NormalizedSessionEvent>();
    this.liveSubjects.set(sessionId, created);
    return created;
  }

  private findByRaw(sessionId: string, rawId: string): NormalizedSessionEvent | undefined {
    const raw = [...this.raw.values()].find((record) => record.id === rawId);
    return raw
      ? this.listNormalized(sessionId).find((event) => event.sequence === raw.sequence)
      : undefined;
  }

  private summaryFor(type: string, payload: Record<string, unknown>): string {
    if (type === "session.state_changed") {
      return `Session is ${String(payload.current ?? "updated")}.`;
    }
    if (type === "session.output.delta") {
      return String(payload.text ?? "Output received.");
    }
    if (type.startsWith("tool.")) {
      return `Tool activity: ${String(payload.toolName ?? type)}.`;
    }
    if (type === "artifact.reported") {
      return `Artifact reported: ${String(payload.name ?? "artifact")}.`;
    }
    return String(payload.message ?? type);
  }

  private applyStateTransition(
    sessionId: string,
    type: string,
    payload: Record<string, unknown>,
  ): void {
    if (type !== "session.state_changed") {
      return;
    }

    const current = payload.current;
    if (typeof current !== "string") {
      return;
    }

    const session = this.sessionService.findSessionById(sessionId);

    if (session) {
      this.sessionService.transition(
        session.workspaceId,
        "00000000-0000-4000-8000-00000000a001",
        sessionId,
        current as SessionStatus,
      );
    }
  }
}
