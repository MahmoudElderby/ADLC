import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { workspaces } from "./foundation.js";

export const agentStatus = pgEnum("agent_status", ["draft", "published"]);
export const agentVersionLifecycle = pgEnum("agent_version_lifecycle", [
  "draft",
  "published",
  "superseded",
]);

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    status: agentStatus("status").notNull().default("draft"),
    currentDraftVersionId: uuid("current_draft_version_id"),
    currentPublishedVersionId: uuid("current_published_version_id"),
    openaiAgentId: text("openai_agent_id"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceNameUnique: uniqueIndex("agents_workspace_name_idx").on(table.workspaceId, table.name),
  }),
);

export const agentVersions = pgTable(
  "agent_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    lifecycle: agentVersionLifecycle("lifecycle").notNull().default("draft"),
    name: text("name").notNull(),
    description: text("description").notNull(),
    model: text("model").notNull(),
    instructions: text("instructions").notNull(),
    approvalMode: text("approval_mode").notNull().default("always_allow"),
    configJson: jsonb("config_json").notNull().default({}),
    openaiPayloadRedactedJson: jsonb("openai_payload_redacted_json").notNull().default({}),
    openaiResponseRedactedJson: jsonb("openai_response_redacted_json").notNull().default({}),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentVersionUnique: uniqueIndex("agent_versions_agent_version_number_idx").on(
      table.agentId,
      table.versionNumber,
    ),
  }),
);

export const agentCapabilityAttachments = pgTable(
  "agent_capability_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentVersionId: uuid("agent_version_id")
      .notNull()
      .references(() => agentVersions.id, { onDelete: "cascade" }),
    capabilityType: text("capability_type").notNull(),
    capabilityId: uuid("capability_id").notNull(),
    required: text("required").notNull().default("true"),
    configOverrideRedactedJson: jsonb("config_override_redacted_json").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueAttachment: uniqueIndex("agent_capability_attachments_unique_idx").on(
      table.agentVersionId,
      table.capabilityType,
      table.capabilityId,
    ),
  }),
);
