export function ArtifactPanel({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <section aria-label="Artifact provenance">
      <h2>Artifact Provenance</h2>
      <dl>
        <dt>Name</dt>
        <dd>walking-skeleton.md</dd>
        <dt>Producer</dt>
        <dd>Release planner</dd>
        <dt>Session</dt>
        <dd>preview-session</dd>
        <dt>Status</dt>
        <dd>valid</dd>
        <dt>Path</dt>
        <dd>artifacts/walking-skeleton.md</dd>
      </dl>
    </section>
  );
}
