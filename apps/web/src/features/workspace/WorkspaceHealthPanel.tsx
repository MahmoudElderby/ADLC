import type { WorkspaceHealth } from "@adlc/contracts";

const defaultHealth: WorkspaceHealth = {
  status: "healthy",
  connector: "online",
  filesystem: "healthy",
  executor: "available",
  checkedAt: new Date().toISOString(),
  issues: [],
};

export function WorkspaceHealthPanel({ health = defaultHealth }: { health?: WorkspaceHealth }) {
  return (
    <section aria-label="Workspace health">
      <h2>Workspace Health</h2>
      <dl>
        <dt>Connector</dt>
        <dd>{health.connector}</dd>
        <dt>Filesystem</dt>
        <dd>{health.filesystem}</dd>
        <dt>Executor</dt>
        <dd>{health.executor}</dd>
      </dl>
      {health.issues.length > 0 && (
        <ul aria-label="Readiness blockers">
          {health.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
