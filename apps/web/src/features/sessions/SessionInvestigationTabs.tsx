import { useState } from "react";
import type { SessionInvestigation } from "@adlc/contracts";
import { TraceTimeline, type TraceItem } from "./TraceTimeline.js";

export function SessionInvestigationTabs({
  investigation,
}: {
  investigation: SessionInvestigation;
}) {
  const [tab, setTab] = useState("Trace");
  const trace: TraceItem[] = investigation.trace;
  return (
    <section aria-label="Session investigation">
      <nav role="tablist">
        {["Trace", "Snapshot", "Artifacts", "Audit"].map((name) => (
          <button key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>
            {name}
          </button>
        ))}
      </nav>
      {tab === "Trace" && <TraceTimeline events={trace} />}
      {tab === "Snapshot" && (
        <section aria-label="Redacted snapshot">
          <h2>Redacted snapshot</h2>
          <pre>{JSON.stringify(investigation.snapshot, null, 2)}</pre>
        </section>
      )}
      {tab === "Artifacts" && (
        <section aria-label="Artifact provenance">
          <h2>Artifact provenance</h2>
          {investigation.artifacts.length === 0 ? (
            <p>No artifacts reported.</p>
          ) : (
            <ul>
              {investigation.artifacts.map((artifact) => (
                <li key={artifact.id}>
                  <strong>{artifact.name}</strong> <span>{artifact.status}</span>{" "}
                  <code>{artifact.workspaceRelativePath}</code>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {tab === "Audit" && (
        <section aria-label="Audit history">
          <h2>Audit history</h2>
          {investigation.audits.length === 0 ? (
            <p>No audit entries.</p>
          ) : (
            <ul>
              {investigation.audits.map((audit) => (
                <li key={audit.id}>
                  <strong>{audit.action}</strong> <span>{audit.outcome}</span>{" "}
                  <time>{audit.createdAt}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </section>
  );
}
