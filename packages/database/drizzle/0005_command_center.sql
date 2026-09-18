CREATE TABLE IF NOT EXISTS live_fleet_sessions (
  session_id uuid PRIMARY KEY REFERENCES agent_sessions(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id),
  status text NOT NULL CHECK (status IN ('creating', 'provisioning', 'running')),
  last_summary text,
  last_event_at timestamptz NOT NULL,
  capability_summary_json jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS live_fleet_workspace_status_idx ON live_fleet_sessions(workspace_id, status);
CREATE INDEX IF NOT EXISTS live_fleet_session_idx ON live_fleet_sessions(session_id);
