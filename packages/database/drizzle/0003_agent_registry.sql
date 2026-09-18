CREATE TYPE agent_status AS ENUM ('draft', 'published');
CREATE TYPE agent_version_lifecycle AS ENUM ('draft', 'published', 'superseded');

CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  status agent_status NOT NULL DEFAULT 'draft',
  current_draft_version_id uuid,
  current_published_version_id uuid,
  openai_agent_id text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX agents_workspace_name_idx ON agents(workspace_id, name);

CREATE TABLE agent_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  lifecycle agent_version_lifecycle NOT NULL DEFAULT 'draft',
  name text NOT NULL,
  description text NOT NULL,
  model text NOT NULL,
  instructions text NOT NULL,
  approval_mode text NOT NULL DEFAULT 'always_allow' CHECK (approval_mode = 'always_allow'),
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  openai_payload_redacted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  openai_response_redacted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX agent_versions_agent_version_number_idx ON agent_versions(agent_id, version_number);

CREATE TABLE agent_capability_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_version_id uuid NOT NULL REFERENCES agent_versions(id) ON DELETE CASCADE,
  capability_type text NOT NULL CHECK (capability_type IN ('skill', 'mcp_server')),
  capability_id uuid NOT NULL,
  required boolean NOT NULL DEFAULT true,
  config_override_redacted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX agent_capability_attachments_unique_idx
  ON agent_capability_attachments(agent_version_id, capability_type, capability_id);

ALTER TABLE agents
  ADD CONSTRAINT agents_current_draft_version_fk
  FOREIGN KEY (current_draft_version_id) REFERENCES agent_versions(id);

ALTER TABLE agents
  ADD CONSTRAINT agents_current_published_version_fk
  FOREIGN KEY (current_published_version_id) REFERENCES agent_versions(id);

CREATE OR REPLACE FUNCTION prevent_published_agent_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.lifecycle = 'published' THEN
    RAISE EXCEPTION 'published agent versions are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER agent_versions_no_published_update
  BEFORE UPDATE ON agent_versions
  FOR EACH ROW EXECUTE FUNCTION prevent_published_agent_version_mutation();

CREATE TRIGGER agent_versions_no_published_delete
  BEFORE DELETE ON agent_versions
  FOR EACH ROW EXECUTE FUNCTION prevent_published_agent_version_mutation();
