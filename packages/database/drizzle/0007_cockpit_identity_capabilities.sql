ALTER TYPE validation_status ADD VALUE IF NOT EXISTS 'unverified';

CREATE TYPE authenticated_session_status AS ENUM ('active', 'revoked', 'expired');
CREATE TYPE mcp_reachability_status AS ENUM ('unverified', 'reachable', 'unreachable');
CREATE TYPE environment_check_type AS ENUM ('mcp_reachability', 'environment_health');
CREATE TYPE environment_check_status AS ENUM ('pending', 'claimed', 'answered', 'expired', 'rejected');

CREATE TABLE workspace_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX workspace_users_email_lower_idx ON workspace_users (lower(email));
CREATE UNIQUE INDEX workspace_users_one_per_workspace_idx ON workspace_users (workspace_id);

CREATE TABLE authenticated_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES workspace_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  status authenticated_session_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE UNIQUE INDEX authenticated_sessions_token_hash_idx ON authenticated_sessions (token_hash);
CREATE INDEX authenticated_sessions_user_status_expires_idx
  ON authenticated_sessions (user_id, status, expires_at);

CREATE TABLE environment_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL REFERENCES workspace_connectors(id) ON DELETE CASCADE,
  check_type environment_check_type NOT NULL,
  target_capability_id uuid,
  status environment_check_status NOT NULL DEFAULT 'pending',
  payload_redacted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_redacted_json jsonb,
  correlation_id uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  answered_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX environment_checks_connector_status_requested_idx
  ON environment_checks (connector_id, status, requested_at);
CREATE INDEX environment_checks_target_requested_idx
  ON environment_checks (target_capability_id, requested_at DESC);

ALTER TABLE skills
  ADD COLUMN created_by uuid REFERENCES workspace_users(id),
  ADD COLUMN updated_by uuid REFERENCES workspace_users(id);

ALTER TABLE mcp_servers
  ADD COLUMN reachability_status mcp_reachability_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN reachability_summary text,
  ADD COLUMN reachability_checked_at timestamptz,
  ADD COLUMN created_by uuid REFERENCES workspace_users(id),
  ADD COLUMN updated_by uuid REFERENCES workspace_users(id);

DELETE FROM skills WHERE created_by IS NULL;
DELETE FROM mcp_servers WHERE created_by IS NULL;

ALTER TABLE skills
  ALTER COLUMN created_by SET NOT NULL,
  ALTER COLUMN updated_by SET NOT NULL;

ALTER TABLE mcp_servers
  ALTER COLUMN created_by SET NOT NULL,
  ALTER COLUMN updated_by SET NOT NULL;
