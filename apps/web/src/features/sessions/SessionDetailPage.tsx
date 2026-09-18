import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import {
  artifactSchema,
  sessionInvestigationSchema,
  sessionSchema,
  type SessionStatus,
} from "@adlc/contracts";
import { z } from "zod";
import { ArtifactPanel } from "./ArtifactPanel.js";
import { SessionProgress } from "./SessionProgress.js";
import { SessionInvestigationTabs } from "./SessionInvestigationTabs.js";
import { apiFetch } from "../../lib/api.js";

export function SessionDetailPage() {
  const { sessionId = "" } = useParams();
  const session = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => apiFetch(`/sessions/${sessionId}`, sessionSchema),
    enabled: Boolean(sessionId),
  });
  const investigation = useQuery({
    queryKey: ["session-investigation", sessionId],
    queryFn: () => apiFetch(`/sessions/${sessionId}/investigation`, sessionInvestigationSchema),
    enabled: Boolean(sessionId),
  });
  const artifacts = useQuery({
    queryKey: ["session-artifacts", sessionId],
    queryFn: () => apiFetch(`/sessions/${sessionId}/artifacts`, z.array(artifactSchema)),
    enabled: Boolean(sessionId),
  });
  const cancel = useMutation({
    mutationFn: () => apiFetch(`/sessions/${sessionId}/cancel`, sessionSchema, { method: "POST" }),
  });
  const [artifactOpen, setArtifactOpen] = useState(sessionId === "preview-session");
  const [canceledLocally, setCanceledLocally] = useState(false);
  const status: SessionStatus = canceledLocally
    ? "canceled"
    : (cancel.data?.status ?? session.data?.status ?? "completed");

  return (
    <main>
      <h1>Session Detail</h1>
      <h2>Session Investigation</h2>
      <Link to="/sessions/history">Session history</Link>
      <SessionProgress status={status} />
      <section aria-label="Terminal outcome">{status}</section>
      <button
        type="button"
        onClick={() => {
          setCanceledLocally(true);
          cancel.mutate();
        }}
      >
        Cancel session
      </button>
      <button type="button" onClick={() => setArtifactOpen(true)}>
        Open artifact
      </button>
      <ArtifactPanel
        visible={artifactOpen}
        artifacts={artifacts.data ?? investigation.data?.artifacts}
      />
      {investigation.data && <SessionInvestigationTabs investigation={investigation.data} />}
    </main>
  );
}
