CREATE TABLE skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('openai_skill_id', 'source_reference')),
  source_reference text NOT NULL,
  version text NOT NULL,
  capability_directories_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  compatible_environment_types_json jsonb NOT NULL DEFAULT '["self_hosted"]'::jsonb,
  status validation_status NOT NULL DEFAULT 'pending_validation',
  validation_summary text,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX skills_workspace_name_version_idx ON skills(workspace_id, name, version);
CREATE INDEX skills_workspace_status_idx ON skills(workspace_id, status);

CREATE TABLE mcp_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  label text NOT NULL,
  transport_type text NOT NULL DEFAULT 'http' CHECK (transport_type = 'http'),
  server_url text NOT NULL,
  connection_origin text NOT NULL DEFAULT 'environment' CHECK (connection_origin = 'environment'),
  allowed_tools_json jsonb NOT NULL CHECK (jsonb_array_length(allowed_tools_json) > 0),
  credential_secret_id uuid REFERENCES workspace_secrets(id),
  required boolean NOT NULL DEFAULT true,
  status validation_status NOT NULL DEFAULT 'pending_validation',
  validation_summary text,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX mcp_servers_workspace_label_idx ON mcp_servers(workspace_id, label);
CREATE INDEX mcp_servers_workspace_status_idx ON mcp_servers(workspace_id, status);
