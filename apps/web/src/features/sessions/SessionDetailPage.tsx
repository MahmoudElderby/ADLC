import { useState } from "react";
import type { SessionStatus } from "@adlc/contracts";
import { ArtifactPanel } from "./ArtifactPanel.js";
import { SessionProgress } from "./SessionProgress.js";

export function SessionDetailPage() {
  const [status, setStatus] = useState<SessionStatus>("completed");
  const [artifactOpen, setArtifactOpen] = useState(false);

  return (
    <main>
      <h1>Session Detail</h1>
      <SessionProgress status={status} />
      <section aria-label="Terminal outcome">
        {status === "canceled" ? "Canceled" : "Completed"}
      </section>
      <button type="button" onClick={() => setStatus("canceled")}>
        Cancel session
      </button>
      <button type="button" onClick={() => setArtifactOpen(true)}>
        Open artifact
      </button>
      <ArtifactPanel visible={artifactOpen} />
    </main>
  );
}
