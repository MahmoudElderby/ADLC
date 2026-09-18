import { useQuery } from "@tanstack/react-query";
import { workspaceHealthSchema, type WorkspaceHealth } from "@adlc/contracts";
import { apiFetch } from "../../lib/api.js";

export function WorkspaceHealthPanel({ health }: { health?: WorkspaceHealth }) {
  const remote = useQuery({
    queryKey: ["workspace-health"],
    queryFn: () => apiFetch("/workspace-environment/health", workspaceHealthSchema),
    enabled: !health,
  });
  const value = health ??
    remote.data ?? {
      status: "healthy" as const,
      connector: "online" as const,
      filesystem: "healthy" as const,
      executor: "available" as const,
      checkedAt: new Date().toISOString(),
      issues: [],
    };

  return (
    <section aria-label="Workspace health">
      <h2>Workspace Health</h2>
      <dl>
        <dt>Connector</dt>
        <dd>{value.connector}</dd>
        <dt>Filesystem</dt>
        <dd>{value.filesystem}</dd>
        <dt>Executor</dt>
        <dd>{value.executor}</dd>
      </dl>
      {value.issues.length > 0 && (
        <ul aria-label="Readiness blockers">
          {value.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
