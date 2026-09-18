import { useState } from "react";
import type { McpServer, Skill } from "@adlc/contracts";
import { CapabilityEditor } from "./CapabilityEditor.js";

export function CapabilityRegistryPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [mcps, setMcps] = useState<McpServer[]>([]);

  return (
    <main>
      <h1>Capability Registry</h1>
      <CapabilityEditor
        onRegisterSkill={(name, version) =>
          setSkills((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              name,
              version,
              description: "Registered skill reference",
              sourceType: "source_reference",
              sourceReference: `skills/${name}`,
              capabilityDirectories: [],
              status: "valid",
              validationSummary: "Compatible with self-hosted workspace.",
              validatedAt: new Date().toISOString(),
            },
          ])
        }
        onRegisterMcp={(label, serverUrl, allowedTools) =>
          setMcps((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              label,
              serverUrl,
              transportType: "http",
              connectionOrigin: "environment",
              allowedTools,
              required: true,
              credentialSecretId: null,
              credentialHealth: "not_required",
              status: "valid",
              validationSummary: "Reachable from workspace origin.",
              validatedAt: new Date().toISOString(),
            },
          ])
        }
      />
      <section aria-label="Registered skills">
        <h2>Skills</h2>
        {skills.map((skill) => (
          <article key={skill.id}>
            <h3>{skill.name}</h3>
            <p>{skill.version}</p>
            <p>{skill.status}</p>
          </article>
        ))}
      </section>
      <section aria-label="Registered MCP servers">
        <h2>MCP Servers</h2>
        {mcps.map((mcp) => (
          <article key={mcp.id}>
            <h3>{mcp.label}</h3>
            <p>{mcp.connectionOrigin}</p>
            <p>{mcp.allowedTools.join(", ")}</p>
            <p>{mcp.credentialHealth}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
