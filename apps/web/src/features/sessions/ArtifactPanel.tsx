import type { Artifact } from "@adlc/contracts";

export function ArtifactPanel({
  visible = true,
  artifacts = [
    {
      id: "preview",
      sessionId: "preview-session",
      reportSequence: 1,
      name: "walking-skeleton.md",
      type: "markdown" as const,
      workspaceRelativePath: "artifacts/walking-skeleton.md",
      status: "valid" as const,
      producerAgentId: undefined,
      reportedAt: new Date().toISOString(),
      validatedAt: new Date().toISOString(),
    },
  ],
}: {
  visible?: boolean;
  artifacts?: Artifact[];
}) {
  if (!visible) {
    return null;
  }
  const artifact = artifacts[0];
  if (!artifact) {
    return (
      <section aria-label="Artifact provenance">
        <h2>Artifact Provenance</h2>
        <p>No artifacts reported.</p>
      </section>
    );
  }

  return (
    <section aria-label="Artifact provenance">
      <h2>Artifact Provenance</h2>
      <dl>
        <dt>Name</dt>
        <dd>{artifact.name}</dd>
        <dt>Producer</dt>
        <dd>{artifact.producerAgentId ?? "Release planner"}</dd>
        <dt>Session</dt>
        <dd>{artifact.sessionId}</dd>
        <dt>Status</dt>
        <dd>{artifact.status}</dd>
        <dt>Path</dt>
        <dd>{artifact.workspaceRelativePath}</dd>
      </dl>
    </section>
  );
}
