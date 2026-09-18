import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { agents, agentVersions } from "./agents.js";
import { workspaces, workspaceConnectors } from "./foundation.js";

export const sessionStatus = pgEnum("session_status", [
  "creating",
  "provisioning",
  "running",
  "completed",
  "failed",
  "canceled",
  "interrupted",
]);

export const executorStatus = pgEnum("executor_status", [
  "not_requested",
  "requested",
  "connecting",
  "connected",
  "stopped",
  "failed",
]);

export const connectorCommandStatus = pgEnum("connector_command_status", [
  "pending",
  "claimed",
  "succeeded",
  "failed",
]);

export const connectorCommandType = pgEnum("connector_command_type", [
  "start_executor",
  "stop_executor",
]);

export const agentSessions = pgTable(
  "agent_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    agentVersionId: uuid("agent_version_id")
      .notNull()
      .references(() => agentVersions.id),
    openaiSessionId: text("openai_session_id"),
    openaiEnvironmentId: text("openai_environment_id"),
    status: sessionStatus("status").notNull().default("creating"),
    executorStatus: executorStatus("executor_status").notNull().default("not_requested"),
    initialInput: text("initial_input").notNull(),
    effectiveConfigSnapshotJson: jsonb("effective_config_snapshot_json").notNull(),
    createdBy: uuid("created_by").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    lastEventAt: timestamp("last_event_at", { withTimezone: true }),
    terminalAt: timestamp("terminal_at", { withTimezone: true }),
    failureSummary: text("failure_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activeByWorkspaceIdx: index("agent_sessions_active_workspace_idx").on(
      table.workspaceId,
      table.status,
      table.lastEventAt,
    ),
    historyByWorkspaceIdx: index("agent_sessions_history_workspace_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    openaiSessionUnique: uniqueIndex("agent_sessions_openai_session_idx").on(table.openaiSessionId),
    openaiEnvironmentUnique: uniqueIndex("agent_sessions_openai_environment_idx").on(
      table.openaiEnvironmentId,
    ),
  }),
);

export const sessionRuntimeSecrets = pgTable("session_runtime_secrets", {
  sessionId: uuid("session_id")
    .primaryKey()
    .references(() => agentSessions.id, { onDelete: "cascade" }),
  remoteUrlEncrypted: text("remote_url_encrypted").notNull(),
  keyVersion: text("key_version").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceConnectorCommands = pgTable(
  "workspace_connector_commands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectorId: uuid("connector_id")
      .notNull()
      .references(() => workspaceConnectors.id),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => agentSessions.id, { onDelete: "cascade" }),
    commandType: connectorCommandType("command_type").notNull(),
    status: connectorCommandStatus("status").notNull().default("pending"),
    payloadRedactedJson: jsonb("payload_redacted_json").notNull().default({}),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorSummary: text("error_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionCommandIdx: index("workspace_connector_commands_session_idx").on(table.sessionId),
    commandStatusIdx: index("workspace_connector_commands_status_idx").on(
      table.connectorId,
      table.status,
    ),
  }),
);
