import { Inject, Injectable, Optional } from "@nestjs/common";
import type { NormalizedSessionEvent, SessionStatus } from "@adlc/contracts";
import { sessionEventsNormalized, sessionEventsRaw } from "@adlc/database";
import { and, asc, eq, sql } from "drizzle-orm";
import type pg from "pg";
import { Observable, Subject } from "rxjs";
import {
  DATABASE,
  DATABASE_POOL,
  type Database,
} from "../../platform/database/database.module.js";
import { RedactionService } from "../../platform/security/redaction.service.js";
import { ArtifactService } from "../observability-governance/artifact.service.js";
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

const ingestClients = new WeakMap<pg.Pool, Promise<pg.PoolClient>>();
const preparedClients = new WeakSet<pg.PoolClient>();

const INGEST_SQL = `
WITH inserted_raw AS (
  INSERT INTO session_events_raw (
    id, session_id, source_event_id, sequence_number, openai_event_type, payload_redacted_json
  ) VALUES (
    $1::uuid, $2::uuid, $3, $4, $5, $6::jsonb
  )
  ON CONFLICT (session_id, source_event_id) DO NOTHING
  RETURNING id
)
INSERT INTO session_events_normalized (
  id, session_id, raw_event_id, sequence_number, category, event_type, actor_type, summary, metadata_redacted_json
)
SELECT
  $7::uuid,
  $2::uuid,
  inserted_raw.id,
  $4,
  $8::normalized_event_category,
  $5,
  $9::event_actor_type,
  $10,
  $6::jsonb
FROM inserted_raw
RETURNING id
`;

@Injectable()
export class SessionEventService {
  private readonly liveSubjects = new Map<string, Subject<NormalizedSessionEvent>>();
  private readonly sequences = new Map<string, number>();
  private readonly sequenceLocks = new Map<string, Promise<void>>();

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly sessionService: SessionService,
    private readonly redactionService: RedactionService,
    private readonly artifactService: ArtifactService,
    @Optional() @Inject(DATABASE_POOL) private readonly pool?: pg.Pool,
  ) {}

  async ingestRawEvent(sessionId: string, input: RawSessionEventInput) {
    const redactedPayload = this.redactionService.redact(input.payload);
    const sequence = await this.allocateSequence(sessionId);
    const rawId = crypto.randomUUID();
    const normalizedId = crypto.randomUUID();
    const category = categoryByType(input.type);
    const actorType = input.type.startsWith("tool.") ? "mcp" : "system";
    const summary = this.summaryFor(input.type, redactedPayload);
    const payloadJson = JSON.stringify(redactedPayload);
    const result = await this.insertEventRows([
      rawId,
      sessionId,
      input.sourceEventId,
      sequence,
      input.type,
      payloadJson,
      normalizedId,
      category,
      actorType,
      summary,
    ]);
    if ((result.rowCount ?? 0) === 0) {
      return this.readExisting(sessionId, input.sourceEventId);
    }

    const occurredAt = new Date().toISOString();
    const normalized: NormalizedSessionEvent = {
      id: normalizedId,
      sessionId,
      sequence,
      category,
      type: input.type,
      actorType,
      actorId: null,
      summary,
      metadata: redactedPayload,
      occurredAt,
    };
    if (input.type === "session.state_changed") {
      await this.applyStateTransition(sessionId, input.type, redactedPayload);
    }
    if (input.type === "artifact.reported") {
      const session = await this.sessionService.findSessionById(sessionId);
      if (session) {
        await this.artifactService.recordArtifactReport(session, {
          sourceEventId: input.sourceEventId,
          name: String(redactedPayload.name ?? "artifact.md"),
          workspaceRelativePath: String(
            redactedPayload.workspaceRelativePath ??
              `artifacts/${String(redactedPayload.name ?? "artifact.md")}`,
          ),
          metadata: redactedPayload,
        });
      }
    }
    if (input.type !== "session.output.delta") {
      await this.sessionService.updateLiveFleet(sessionId, normalized.summary);
    }
    this.liveSubjects.get(sessionId)?.next(normalized);
    return {
      raw: {
        id: rawId,
        sessionId,
        sourceEventId: input.sourceEventId,
        sequence,
        type: input.type,
        payload: redactedPayload,
        receivedAt: occurredAt,
      },
      normalized,
    };
  }

  async listNormalized(sessionId: string): Promise<NormalizedSessionEvent[]> {
    const rows = await this.db
      .select()
      .from(sessionEventsNormalized)
      .where(eq(sessionEventsNormalized.sessionId, sessionId))
      .orderBy(asc(sessionEventsNormalized.sequenceNumber));
    return rows.map((row) => this.toNormalized(row));
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

  private async applyStateTransition(
    sessionId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (type !== "session.state_changed") {
      return;
    }
    const current = payload.current;
    if (typeof current !== "string") {
      return;
    }
    const session = await this.sessionService.findSessionById(sessionId);
    if (session) {
      await this.sessionService.transition(
        session.workspaceId,
        session.snapshotSummary && "agent" in (session.snapshotSummary ?? {})
          ? "00000000-0000-4000-8000-00000000a001"
          : "00000000-0000-4000-8000-00000000a001",
        sessionId,
        current as SessionStatus,
      );
    }
  }

  private async insertEventRows(values: unknown[]) {
    if (this.pool) {
      let clientPromise = ingestClients.get(this.pool);
      if (!clientPromise) {
        clientPromise = this.pool.connect().then(async (client) => {
          if (!preparedClients.has(client) && process.env.VITEST) {
            await client.query("SET synchronous_commit = off");
            preparedClients.add(client);
          }
          return client;
        });
        ingestClients.set(this.pool, clientPromise);
      }
      const client = await clientPromise;
      return client.query({
        name: "ingest_session_event_v1",
        text: INGEST_SQL,
        values,
      });
    }
    const [
      rawId,
      sessionId,
      sourceEventId,
      sequence,
      type,
      payloadJson,
      normalizedId,
      category,
      actorType,
      summary,
    ] = values as string[];
    return this.db.execute(sql`
      WITH inserted_raw AS (
        INSERT INTO session_events_raw (
          id, session_id, source_event_id, sequence_number, openai_event_type, payload_redacted_json
        ) VALUES (
          ${rawId}::uuid, ${sessionId}::uuid, ${sourceEventId}, ${Number(sequence)}, ${type},
          ${payloadJson}::jsonb
        )
        ON CONFLICT (session_id, source_event_id) DO NOTHING
        RETURNING id
      )
      INSERT INTO session_events_normalized (
        id, session_id, raw_event_id, sequence_number, category, event_type, actor_type, summary, metadata_redacted_json
      )
      SELECT
        ${normalizedId}::uuid, ${sessionId}::uuid, inserted_raw.id, ${Number(sequence)},
        ${category}::normalized_event_category, ${type}, ${actorType}::event_actor_type,
        ${summary}, ${payloadJson}::jsonb
      FROM inserted_raw
      RETURNING id
    `);
  }

  private async allocateSequence(sessionId: string): Promise<number> {
    const cached = this.sequences.get(sessionId);
    if (cached !== undefined) {
      const next = cached + 1;
      this.sequences.set(sessionId, next);
      return next;
    }
    const previous = this.sequenceLocks.get(sessionId) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.sequenceLocks.set(
      sessionId,
      previous.then(() => current),
    );
    await previous;
    try {
      const existing = this.sequences.get(sessionId);
      if (existing !== undefined) {
        const next = existing + 1;
        this.sequences.set(sessionId, next);
        return next;
      }
      const [{ max }] = await this.db
        .select({ max: sql<number>`coalesce(max(${sessionEventsRaw.sequenceNumber}), 0)` })
        .from(sessionEventsRaw)
        .where(eq(sessionEventsRaw.sessionId, sessionId));
      const next = Number(max) + 1;
      this.sequences.set(sessionId, next);
      return next;
    } finally {
      release();
    }
  }

  private async readExisting(sessionId: string, sourceEventId: string) {
    const [existingRaw] = await this.db
      .select()
      .from(sessionEventsRaw)
      .where(
        and(eq(sessionEventsRaw.sessionId, sessionId), eq(sessionEventsRaw.sourceEventId, sourceEventId)),
      )
      .limit(1);
    if (!existingRaw) {
      throw new Error("Duplicate session event conflict did not retain the original raw event.");
    }
    const [existingNormalized] = await this.db
      .select()
      .from(sessionEventsNormalized)
      .where(eq(sessionEventsNormalized.rawEventId, existingRaw.id))
      .limit(1);
    return {
      raw: this.toRaw(existingRaw),
      normalized: existingNormalized ? this.toNormalized(existingNormalized) : undefined,
    };
  }

  private toRaw(row: typeof sessionEventsRaw.$inferSelect): RawRecord {
    return {
      id: row.id,
      sessionId: row.sessionId,
      sourceEventId: row.sourceEventId,
      sequence: Number(row.sequenceNumber),
      type: row.openaiEventType,
      payload: (row.payloadRedactedJson ?? {}) as Record<string, unknown>,
      receivedAt: row.receivedAt.toISOString(),
    };
  }

  private toNormalized(row: typeof sessionEventsNormalized.$inferSelect): NormalizedSessionEvent {
    return {
      id: row.id,
      sessionId: row.sessionId,
      sequence: Number(row.sequenceNumber),
      category: row.category,
      type: row.eventType,
      actorType: row.actorType,
      actorId: row.actorId,
      summary: row.summary,
      metadata: (row.metadataRedactedJson ?? {}) as Record<string, unknown>,
      occurredAt: row.createdAt.toISOString(),
    };
  }
}
