import argon2 from "argon2";
import {
  workspaceConnectors,
  workspaceEnvironmentSettings,
  workspaceSecrets,
  workspaces,
} from "@adlc/database";
import { eq } from "drizzle-orm";
import { sha256Hex } from "./crypto.js";
import type { TestPostgres } from "./postgres.js";

export const DEFAULT_OPERATOR_EMAIL = "operator@adlc.local";
export const DEFAULT_OPERATOR_PASSWORD = "ChangeMeOperatorPass1";
export const DEFAULT_OPERATOR_DISPLAY_NAME = "Operator";
export const DEFAULT_WORKSPACE_NAME = "ADLC workspace";
export const DEFAULT_CONNECTOR_TOKEN = "replace-with-one-time-connector-token-min-24";

export type OperatorFixture = {
  workspaceId: string;
  operatorId: string;
  email: string;
  password: string;
  displayName: string;
  workspaceName: string;
  connectorId: string | null;
  connectorToken: string | null;
};

export type SeedOperatorOptions = {
  email?: string;
  password?: string;
  displayName?: string;
  workspaceName?: string;
  connectorToken?: string | null;
};

export async function seedOperator(
  postgres: TestPostgres,
  options: SeedOperatorOptions = {},
): Promise<OperatorFixture> {
  const email = (options.email ?? process.env.ADLC_OPERATOR_EMAIL ?? DEFAULT_OPERATOR_EMAIL)
    .trim()
    .toLowerCase();
  const password = options.password ?? process.env.ADLC_OPERATOR_PASSWORD ?? DEFAULT_OPERATOR_PASSWORD;
  const displayName =
    options.displayName ?? process.env.ADLC_OPERATOR_DISPLAY_NAME ?? DEFAULT_OPERATOR_DISPLAY_NAME;
  const workspaceName =
    options.workspaceName ?? process.env.ADLC_WORKSPACE_NAME ?? DEFAULT_WORKSPACE_NAME;
  const connectorToken =
    options.connectorToken === undefined
      ? (process.env.ADLC_CONNECTOR_TOKEN ?? DEFAULT_CONNECTOR_TOKEN)
      : options.connectorToken;

  const existing = await postgres.query<{
    id: string;
    workspace_id: string;
    email: string;
    display_name: string;
    workspace_name: string;
  }>(
    `SELECT u.id, u.workspace_id, u.email, u.display_name, w.name AS workspace_name
     FROM workspace_users u
     JOIN workspaces w ON w.id = u.workspace_id
     WHERE lower(u.email) = $1
     LIMIT 1`,
    [email],
  );

  let workspaceId: string;
  let operatorId: string;
  let resolvedDisplayName = displayName;
  let resolvedWorkspaceName = workspaceName;

  if ((existing.rowCount ?? 0) > 0) {
    workspaceId = existing.rows[0].workspace_id;
    operatorId = existing.rows[0].id;
    resolvedDisplayName = existing.rows[0].display_name;
    resolvedWorkspaceName = existing.rows[0].workspace_name;
  } else {
    const [workspace] = await postgres.db
      .insert(workspaces)
      .values({
        name: workspaceName,
        openaiProjectId: "proj_walking_skeleton",
      })
      .returning();
    workspaceId = workspace.id;
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const inserted = await postgres.query<{ id: string }>(
      `INSERT INTO workspace_users (workspace_id, email, display_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [workspaceId, email, displayName, passwordHash],
    );
    operatorId = inserted.rows[0].id;
  }

  let connectorId: string | null = null;
  if (connectorToken) {
    const existingConnector = await postgres.db
      .select({ id: workspaceConnectors.id })
      .from(workspaceConnectors)
      .where(eq(workspaceConnectors.workspaceId, workspaceId))
      .limit(1);
    const tokenHash = sha256Hex(connectorToken);
    if (existingConnector[0]) {
      connectorId = existingConnector[0].id;
      await postgres.db
        .update(workspaceConnectors)
        .set({ authTokenHash: tokenHash, status: "offline", lastHeartbeatAt: null })
        .where(eq(workspaceConnectors.id, connectorId));
    } else {
      const encryptedPlaceholder = {
        ciphertext: "test-support-placeholder",
        keyVersion: "test",
        fingerprint: sha256Hex("executor-placeholder").slice(0, 16),
      };
      await postgres.db.insert(workspaceSecrets).values({
        workspaceId,
        type: "openai_executor_key",
        encryptedValue: encryptedPlaceholder.ciphertext,
        keyVersion: encryptedPlaceholder.keyVersion,
        fingerprint: encryptedPlaceholder.fingerprint,
      });
      const [connector] = await postgres.db
        .insert(workspaceConnectors)
        .values({
          workspaceId,
          name: "self-hosted-connector",
          authTokenHash: tokenHash,
          hostFingerprint: "test-host",
          status: "offline",
          version: "0.1.0",
          capabilitiesJson: { filesystem: true, network: true },
          lastHeartbeatAt: null,
        })
        .returning();
      connectorId = connector.id;
    }

    const [secret] = await postgres.db
      .select({ id: workspaceSecrets.id })
      .from(workspaceSecrets)
      .where(eq(workspaceSecrets.workspaceId, workspaceId))
      .limit(1);

    const [environment] = await postgres.db
      .select({ id: workspaceEnvironmentSettings.id })
      .from(workspaceEnvironmentSettings)
      .where(eq(workspaceEnvironmentSettings.workspaceId, workspaceId))
      .limit(1);
    if (!environment && connectorId && secret) {
      await postgres.db.insert(workspaceEnvironmentSettings).values({
        workspaceId,
        type: "self_hosted",
        workspacePath: process.env.ADLC_WORKSPACE_PATH ?? "C:/tmp/adlc-workspace",
        connectorId,
        openaiExecutorSecretId: secret.id,
        status: "pending_validation",
        healthJson: {
          status: "unavailable",
          connector: "offline",
          canProbeReachability: false,
          filesystem: "unknown",
          executor: "unknown",
          checkedAt: new Date().toISOString(),
          issues: ["Workspace connector has not checked in."],
        },
      });
    }
  }

  return {
    workspaceId,
    operatorId,
    email,
    password,
    displayName: resolvedDisplayName,
    workspaceName: resolvedWorkspaceName,
    connectorId,
    connectorToken,
  };
}
