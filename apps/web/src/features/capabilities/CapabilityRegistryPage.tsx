import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mcpServerSchema, skillSchema, type McpServer, type Skill } from "@adlc/contracts";
import { z } from "zod";
import { CapabilityEditor } from "./CapabilityEditor.js";
import { apiFetch } from "../../lib/api.js";

const skillsSchema = z.array(skillSchema);
const mcpsSchema = z.array(mcpServerSchema);

export function CapabilityRegistryPage() {
  const queryClient = useQueryClient();
  const [localSkills, setLocalSkills] = useState<Skill[]>([]);
  const [localMcps, setLocalMcps] = useState<McpServer[]>([]);
  const skills = useQuery({
    queryKey: ["skills"],
    queryFn: () => apiFetch("/capabilities/skills", skillsSchema),
  });
  const mcps = useQuery({
    queryKey: ["mcp"],
    queryFn: () => apiFetch("/capabilities/mcp", mcpsSchema),
  });
  const registerSkill = useMutation({
    mutationFn: (input: { name: string; version: string }) =>
      apiFetch("/capabilities/skills", skillSchema, {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          description: "Registered skill reference",
          sourceType: "source_reference",
          sourceReference: `skills/${input.name}`,
          version: input.version,
          capabilityDirectories: [],
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills"] }),
  });
  const registerMcp = useMutation({
    mutationFn: (input: { label: string; serverUrl: string; allowedTools: string[] }) =>
      apiFetch("/capabilities/mcp", mcpServerSchema, {
        method: "POST",
        body: JSON.stringify({
          label: input.label,
          serverUrl: input.serverUrl,
          transportType: "http",
          connectionOrigin: "environment",
          allowedTools: input.allowedTools,
          required: true,
          credential: "write-once-secret",
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mcp"] }),
  });
  const visibleSkills = [...(skills.data ?? []), ...localSkills];
  const visibleMcps = [...(mcps.data ?? []), ...localMcps];

  return (
    <main>
      <h1>Capability Registry</h1>
      <CapabilityEditor
        onRegisterSkill={(name, version) => {
          setLocalSkills((current) => [
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
              createdBy: { id: "00000000-0000-4000-8000-000000000002", displayName: "Operator" },
              lastChangedBy: { id: "00000000-0000-4000-8000-000000000002", displayName: "Operator" },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]);
          registerSkill.mutate({ name, version });
        }}
        onRegisterMcp={(label, serverUrl, allowedTools) => {
          setLocalMcps((current) => [
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
              credentialHealth: "missing" as const,
              status: "pending_validation" as const,
              reachabilityStatus: "unverified" as const,
              reachabilitySummary: "unverified",
              validationSummary: "Reachability is unverified.",
              validatedAt: new Date().toISOString(),
              createdBy: { id: "00000000-0000-4000-8000-000000000002", displayName: "Operator" },
              lastChangedBy: { id: "00000000-0000-4000-8000-000000000002", displayName: "Operator" },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]);
          registerMcp.mutate({ label, serverUrl, allowedTools });
        }}
      />
      <section aria-label="Registered skills">
        <h2>Skills</h2>
        {visibleSkills.map((skill) => (
          <article key={skill.id}>
            <h3>{skill.name}</h3>
            <p>{skill.version}</p>
            <p>{skill.status}</p>
          </article>
        ))}
      </section>
      <section aria-label="Registered MCP servers">
        <h2>MCP Servers</h2>
        {visibleMcps.map((mcp) => (
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
