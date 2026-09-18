CREATE TYPE session_status AS ENUM ('creating', 'provisioning', 'running', 'completed', 'failed', 'canceled', 'interrupted');
CREATE TYPE executor_status AS ENUM ('not_requested', 'requested', 'connecting', 'connected', 'stopped', 'failed');
CREATE TYPE connector_command_type AS ENUM ('start_executor', 'stop_executor');
CREATE TYPE connector_command_status AS ENUM ('pending', 'claimed', 'succeeded', 'failed');
CREATE TYPE normalized_event_category AS ENUM ('lifecycle', 'output', 'tool', 'artifact', 'error');
CREATE TYPE event_actor_type AS ENUM ('user', 'agent', 'mcp', 'environment', 'system');
CREATE TYPE artifact_status AS ENUM ('valid', 'missing', 'unreadable', 'outside_workspace', 'invalid_type');

CREATE TABLE agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id),
  agent_version_id uuid NOT NULL REFERENCES agent_versions(id),
  openai_session_id text UNIQUE,
  openai_environment_id text UNIQUE,
  status session_status NOT NULL DEFAULT 'creating',
  executor_status executor_status NOT NULL DEFAULT 'not_requested',
  initial_input text NOT NULL,
  effective_config_snapshot_json jsonb NOT NULL,
  created_by uuid NOT NULL,
  started_at timestamptz,
  last_event_at timestamptz,
  terminal_at timestamptz,
  failure_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_sessions_terminal_consistency CHECK (
    (status IN ('completed', 'failed', 'canceled', 'interrupted') AND terminal_at IS NOT NULL)
    OR (status IN ('creating', 'provisioning', 'running') AND terminal_at IS NULL)
  )
);

CREATE INDEX agent_sessions_active_workspace_idx ON agent_sessions(workspace_id, status, last_event_at);
CREATE INDEX agent_sessions_history_workspace_idx ON agent_sessions(workspace_id, created_at DESC);

CREATE TABLE session_runtime_secrets (
  session_id uuid PRIMARY KEY REFERENCES agent_sessions(id) ON DELETE CASCADE,
  remote_url_encrypted text NOT NULL,
  key_version text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspace_connector_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id uuid NOT NULL REFERENCES workspace_connectors(id),
  session_id uuid NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  command_type connector_command_type NOT NULL,
  status connector_command_status NOT NULL DEFAULT 'pending',
  payload_redacted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  claimed_at timestamptz,
  completed_at timestamptz,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX workspace_connector_commands_session_idx ON workspace_connector_commands(session_id);
CREATE INDEX workspace_connector_commands_status_idx ON workspace_connector_commands(connector_id, status);
CREATE UNIQUE INDEX workspace_connector_commands_one_successful_start_idx
  ON workspace_connector_commands(session_id)
  WHERE command_type = 'start_executor' AND status = 'succeeded';

CREATE TABLE session_events_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  source_event_id text NOT NULL,
  sequence_number bigint NOT NULL,
  openai_event_type text NOT NULL,
  payload_redacted_json jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, source_event_id),
  UNIQUE (session_id, sequence_number)
);

CREATE TABLE session_events_normalized (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  raw_event_id uuid NOT NULL UNIQUE REFERENCES session_events_raw(id) ON DELETE CASCADE,
  sequence_number bigint NOT NULL,
  category normalized_event_category NOT NULL,
  event_type text NOT NULL,
  actor_type event_actor_type NOT NULL,
  actor_id text,
  summary text NOT NULL,
  metadata_redacted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX session_events_normalized_sequence_idx ON session_events_normalized(session_id, sequence_number);

CREATE TABLE artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  source_event_id text NOT NULL,
  report_sequence bigint NOT NULL,
  name text NOT NULL,
  artifact_type text NOT NULL DEFAULT 'markdown',
  workspace_relative_path text NOT NULL,
  status artifact_status NOT NULL,
  producer_agent_id uuid NOT NULL REFERENCES agents(id),
  metadata_redacted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  reported_at timestamptz NOT NULL DEFAULT now(),
  validated_at timestamptz,
  UNIQUE (session_id, source_event_id)
);

CREATE INDEX artifacts_session_report_sequence_idx ON artifacts(session_id, report_sequence);
CREATE INDEX artifacts_workspace_reported_idx ON artifacts(workspace_id, reported_at DESC);

CREATE TABLE errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  session_id uuid REFERENCES agent_sessions(id) ON DELETE SET NULL,
  source text NOT NULL,
  error_code text,
  message_redacted text NOT NULL,
  request_id text,
  retryable boolean NOT NULL DEFAULT false,
  metadata_redacted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
