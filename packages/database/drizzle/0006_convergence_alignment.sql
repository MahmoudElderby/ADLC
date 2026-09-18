ALTER TABLE live_fleet_sessions
  ADD COLUMN IF NOT EXISTS agent_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS skill_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mcp_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

CREATE OR REPLACE FUNCTION prevent_published_agent_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.lifecycle = 'published' THEN
    IF NEW.lifecycle = 'superseded'
      AND NEW.name IS NOT DISTINCT FROM OLD.name
      AND NEW.description IS NOT DISTINCT FROM OLD.description
      AND NEW.model IS NOT DISTINCT FROM OLD.model
      AND NEW.instructions IS NOT DISTINCT FROM OLD.instructions
      AND NEW.approval_mode IS NOT DISTINCT FROM OLD.approval_mode
      AND NEW.config_json IS NOT DISTINCT FROM OLD.config_json
      AND NEW.openai_payload_redacted_json IS NOT DISTINCT FROM OLD.openai_payload_redacted_json
      AND NEW.openai_response_redacted_json IS NOT DISTINCT FROM OLD.openai_response_redacted_json
      AND NEW.version_number IS NOT DISTINCT FROM OLD.version_number
    THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'published agent versions are immutable';
  END IF;
  RETURN NEW;
END;
$$;
