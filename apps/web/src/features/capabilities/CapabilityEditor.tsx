import { useState } from "react";

type CapabilityEditorProps = {
  onRegisterSkill: (name: string, version: string) => void;
  onRegisterMcp: (label: string, serverUrl: string, allowedTools: string[]) => void;
};

export function CapabilityEditor({ onRegisterSkill, onRegisterMcp }: CapabilityEditorProps) {
  const [skillName, setSkillName] = useState("planning-skill");
  const [skillVersion, setSkillVersion] = useState("1.0.0");
  const [mcpLabel, setMcpLabel] = useState("devops");
  const [mcpUrl, setMcpUrl] = useState("https://devops.example.test/mcp");
  const [allowedTools, setAllowedTools] = useState("create_work_item, update_work_item");

  return (
    <form aria-label="Capability editor">
      <fieldset>
        <legend>Skill</legend>
        <label>
          Name
          <input value={skillName} onChange={(event) => setSkillName(event.target.value)} />
        </label>
        <label>
          Version
          <input value={skillVersion} onChange={(event) => setSkillVersion(event.target.value)} />
        </label>
        <button type="button" onClick={() => onRegisterSkill(skillName, skillVersion)}>
          Register skill
        </button>
      </fieldset>
      <fieldset>
        <legend>Workspace MCP</legend>
        <label>
          Label
          <input value={mcpLabel} onChange={(event) => setMcpLabel(event.target.value)} />
        </label>
        <label>
          Server URL
          <input value={mcpUrl} onChange={(event) => setMcpUrl(event.target.value)} />
        </label>
        <label>
          Allowed tools
          <input value={allowedTools} onChange={(event) => setAllowedTools(event.target.value)} />
        </label>
        <button
          type="button"
          onClick={() =>
            onRegisterMcp(
              mcpLabel,
              mcpUrl,
              allowedTools
                .split(",")
                .map((tool) => tool.trim())
                .filter(Boolean),
            )
          }
        >
          Register MCP
        </button>
      </fieldset>
    </form>
  );
}
