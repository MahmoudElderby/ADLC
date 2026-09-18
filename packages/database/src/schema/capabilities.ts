import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { validationStatus, workspaceSecrets, workspaces } from "./foundation.js";

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    sourceType: text("source_type").notNull(),
    sourceReference: text("source_reference").notNull(),
    version: text("version").notNull(),
    capabilityDirectoriesJson: jsonb("capability_directories_json").notNull().default([]),
    compatibleEnvironmentTypesJson: jsonb("compatible_environment_types_json")
      .notNull()
      .default(["self_hosted"]),
    status: validationStatus("status").notNull().default("pending_validation"),
    validationSummary: text("validation_summary"),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceNameVersionUnique: uniqueIndex("skills_workspace_name_version_idx").on(
      table.workspaceId,
      table.name,
      table.version,
    ),
    workspaceStatusIdx: index("skills_workspace_status_idx").on(table.workspaceId, table.status),
  }),
);

export const mcpServers = pgTable(
  "mcp_servers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    transportType: text("transport_type").notNull().default("http"),
    serverUrl: text("server_url").notNull(),
    connectionOrigin: text("connection_origin").notNull().default("environment"),
    allowedToolsJson: jsonb("allowed_tools_json").notNull(),
    credentialSecretId: uuid("credential_secret_id").references(() => workspaceSecrets.id),
    required: text("required").notNull().default("true"),
    status: validationStatus("status").notNull().default("pending_validation"),
    validationSummary: text("validation_summary"),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceLabelUnique: uniqueIndex("mcp_servers_workspace_label_idx").on(
      table.workspaceId,
      table.label,
    ),
    workspaceStatusIdx: index("mcp_servers_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
  }),
);
