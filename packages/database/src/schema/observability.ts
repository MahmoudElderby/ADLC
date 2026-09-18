import {
  bigint,
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { workspaces } from "./foundation.js";
import { agentSessions } from "./sessions.js";

export const normalizedEventCategory = pgEnum("normalized_event_category", [
  "lifecycle",
  "output",
  "tool",
  "artifact",
  "error",
]);

export const eventActorType = pgEnum("event_actor_type", [
  "user",
  "agent",
  "mcp",
  "environment",
  "system",
]);

export const artifactStatus = pgEnum("artifact_status", [
  "valid",
  "missing",
  "unreadable",
  "outside_workspace",
  "invalid_type",
]);

export const sessionEventsRaw = pgTable(
  "session_events_raw",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => agentSessions.id, { onDelete: "cascade" }),
    sourceEventId: text("source_event_id").notNull(),
    sequenceNumber: bigint("sequence_number", { mode: "number" }).notNull(),
    openaiEventType: text("openai_event_type").notNull(),
    payloadRedactedJson: jsonb("payload_redacted_json").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceEventUnique: uniqueIndex("session_events_raw_source_event_idx").on(
      table.sessionId,
      table.sourceEventId,
    ),
    sequenceUnique: uniqueIndex("session_events_raw_sequence_idx").on(
      table.sessionId,
      table.sequenceNumber,
    ),
  }),
);

export const sessionEventsNormalized = pgTable(
  "session_events_normalized",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => agentSessions.id, { onDelete: "cascade" }),
    rawEventId: uuid("raw_event_id")
      .notNull()
      .references(() => sessionEventsRaw.id, { onDelete: "cascade" }),
    sequenceNumber: bigint("sequence_number", { mode: "number" }).notNull(),
    category: normalizedEventCategory("category").notNull(),
    eventType: text("event_type").notNull(),
    actorType: eventActorType("actor_type").notNull(),
    actorId: text("actor_id"),
    summary: text("summary").notNull(),
    metadataRedactedJson: jsonb("metadata_redacted_json").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    rawUnique: uniqueIndex("session_events_normalized_raw_idx").on(table.rawEventId),
    sequenceIdx: index("session_events_normalized_sequence_idx").on(
      table.sessionId,
      table.sequenceNumber,
    ),
  }),
);

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => agentSessions.id, { onDelete: "cascade" }),
    sourceEventId: text("source_event_id").notNull(),
    reportSequence: bigint("report_sequence", { mode: "number" }).notNull(),
    name: text("name").notNull(),
    artifactType: text("artifact_type").notNull().default("markdown"),
    workspaceRelativePath: text("workspace_relative_path").notNull(),
    status: artifactStatus("status").notNull(),
    producerAgentId: uuid("producer_agent_id")
      .notNull()
      .references(() => agents.id),
    metadataRedactedJson: jsonb("metadata_redacted_json").notNull().default({}),
    reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
  },
  (table) => ({
    reportUnique: uniqueIndex("artifacts_session_source_event_idx").on(
      table.sessionId,
      table.sourceEventId,
    ),
    reportSequenceIdx: index("artifacts_session_report_sequence_idx").on(
      table.sessionId,
      table.reportSequence,
    ),
    workspaceReportedIdx: index("artifacts_workspace_reported_idx").on(
      table.workspaceId,
      table.reportedAt,
    ),
  }),
);

export const errors = pgTable("errors", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").references(() => agentSessions.id, { onDelete: "set null" }),
  source: text("source").notNull(),
  errorCode: text("error_code"),
  messageRedacted: text("message_redacted").notNull(),
  requestId: text("request_id"),
  retryable: boolean("retryable").notNull().default(false),
  metadataRedactedJson: jsonb("metadata_redacted_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
