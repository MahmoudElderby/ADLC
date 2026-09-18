import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { agentSessions } from "./sessions.js";
import { workspaces } from "./foundation.js";

export const liveFleetSessions = pgTable(
  "live_fleet_sessions",
  {
    sessionId: uuid("session_id")
      .primaryKey()
      .references(() => agentSessions.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    agentName: text("agent_name").notNull(),
    status: text("status").notNull(),
    skillCount: integer("skill_count").notNull().default(0),
    mcpCount: integer("mcp_count").notNull().default(0),
    lastSummary: text("last_summary"),
    lastEventAt: timestamp("last_event_at", { withTimezone: true }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    capabilitySummaryJson: jsonb("capability_summary_json").notNull().default({}),
  },
  (table) => ({
    workspaceStatusIdx: index("live_fleet_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    historySessionIdx: index("live_fleet_session_idx").on(table.sessionId),
  }),
);
