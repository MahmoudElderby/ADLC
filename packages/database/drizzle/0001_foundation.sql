CREATE TYPE validation_status AS ENUM ('pending_validation', 'valid', 'invalid', 'unreachable');
CREATE TYPE connector_status AS ENUM ('offline', 'online', 'degraded');
CREATE TYPE audit_outcome AS ENUM ('succeeded', 'failed');

CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  openai_project_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspace_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type text NOT NULL,
  encrypted_value text NOT NULL,
  key_version text NOT NULL,
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz
);

CREATE INDEX workspace_secrets_workspace_type_idx ON workspace_secrets(workspace_id, type);

CREATE TABLE workspace_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  auth_token_hash text NOT NULL,
  host_fingerprint text NOT NULL,
  status connector_status NOT NULL DEFAULT 'offline',
  version text NOT NULL,
  capabilities_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_heartbeat_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE UNIQUE INDEX workspace_connectors_one_active_per_workspace_idx
  ON workspace_connectors(workspace_id)
  WHERE revoked_at IS NULL;
CREATE INDEX workspace_connectors_workspace_status_idx ON workspace_connectors(workspace_id, status);

CREATE TABLE workspace_environment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'self_hosted' CHECK (type = 'self_hosted'),
  workspace_path text NOT NULL,
  connector_id uuid NOT NULL REFERENCES workspace_connectors(id),
  openai_executor_secret_id uuid NOT NULL REFERENCES workspace_secrets(id),
  status validation_status NOT NULL DEFAULT 'pending_validation',
  health_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  outcome audit_outcome NOT NULL,
  correlation_id uuid NOT NULL,
  metadata_redacted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_entity_history_idx
  ON audit_log(workspace_id, entity_type, entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
