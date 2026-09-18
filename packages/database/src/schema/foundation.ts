import {
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
import { isNull } from "drizzle-orm";

export const validationStatus = pgEnum("validation_status", [
  "pending_validation",
  "valid",
  "invalid",
  "unreachable",
]);

export const connectorStatus = pgEnum("connector_status", ["offline", "online", "degraded"]);
export const auditOutcome = pgEnum("audit_outcome", ["succeeded", "failed"]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  openaiProjectId: text("openai_project_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceSecrets = pgTable(
  "workspace_secrets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    encryptedValue: text("encrypted_value").notNull(),
    keyVersion: text("key_version").notNull(),
    fingerprint: text("fingerprint").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
  },
  (table) => ({
    workspaceTypeIdx: index("workspace_secrets_workspace_type_idx").on(
      table.workspaceId,
      table.type,
    ),
  }),
);

export const workspaceConnectors = pgTable(
  "workspace_connectors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    authTokenHash: text("auth_token_hash").notNull(),
    hostFingerprint: text("host_fingerprint").notNull(),
    status: connectorStatus("status").notNull().default("offline"),
    version: text("version").notNull(),
    capabilitiesJson: jsonb("capabilities_json").notNull().default({}),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    activeConnectorUnique: uniqueIndex("workspace_connectors_one_active_per_workspace_idx")
      .on(table.workspaceId)
      .where(isNull(table.revokedAt)),
    workspaceStatusIdx: index("workspace_connectors_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
  }),
);

export const workspaceEnvironmentSettings = pgTable(
  "workspace_environment_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("self_hosted"),
    workspacePath: text("workspace_path").notNull(),
    connectorId: uuid("connector_id")
      .notNull()
      .references(() => workspaceConnectors.id),
    openaiExecutorSecretId: uuid("openai_executor_secret_id")
      .notNull()
      .references(() => workspaceSecrets.id),
    status: validationStatus("status").notNull().default("pending_validation"),
    healthJson: jsonb("health_json").notNull().default({}),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceUnique: uniqueIndex("workspace_environment_settings_workspace_idx").on(
      table.workspaceId,
    ),
  }),
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    outcome: auditOutcome("outcome").notNull(),
    correlationId: uuid("correlation_id").notNull(),
    metadataRedactedJson: jsonb("metadata_redacted_json").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    entityHistoryIdx: index("audit_log_entity_history_idx").on(
      table.workspaceId,
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
  }),
);

export const appendOnlyAudit = pgTable("append_only_audit_marker", {
  id: uuid("id").primaryKey().defaultRandom(),
  updateDeleteApiExposed: boolean("update_delete_api_exposed").notNull().default(false),
});
