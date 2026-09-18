import { createBrowserRouter, Link, Navigate } from "react-router-dom";
import { AgentEditorPage } from "../features/agents/AgentEditorPage.js";
import { CapabilityRegistryPage } from "../features/capabilities/CapabilityRegistryPage.js";
import { SessionDetailPage } from "../features/sessions/SessionDetailPage.js";
import { StartSessionPage } from "../features/sessions/StartSessionPage.js";
import { WorkspaceHealthPanel } from "../features/workspace/WorkspaceHealthPanel.js";
import { CommandCenterPage } from "../features/command-center/CommandCenterPage.js";
import { SessionHistoryPage } from "../features/sessions/SessionHistoryPage.js";
import { SessionInvestigationTabs } from "../features/sessions/SessionInvestigationTabs.js";
import { useQuery } from "@tanstack/react-query";
import { sessionInvestigationSchema } from "@adlc/contracts";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api.js";

function SessionInvestigationPage() {
  const { sessionId = "" } = useParams();
  const investigation = useQuery({ queryKey: ["session-investigation", sessionId], queryFn: () => apiFetch(`/sessions/${sessionId}/investigation`, sessionInvestigationSchema), enabled: Boolean(sessionId) });
  return <main><h1>Session Investigation</h1><Link to="/sessions/history">Session history</Link>
    {investigation.isPending && <p role="status">Loading session evidence</p>}
    {investigation.isError && <p role="alert">Unable to load session evidence.</p>}
    {investigation.data && <SessionInvestigationTabs investigation={investigation.data} />}
  </main>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/command-center" replace />,
  },
  {
    path: "/command-center",
    element: <CommandCenterPage />,
  },
  {
    path: "/workspace",
    element: (
      <main>
        <h1>Workspace Environment</h1>
        <WorkspaceHealthPanel />
      </main>
    ),
  },
  {
    path: "/capabilities",
    element: <CapabilityRegistryPage />,
  },
  {
    path: "/agents/new",
    element: <AgentEditorPage />,
  },
  {
    path: "/agents/:agentId",
    element: <AgentEditorPage />,
  },
  {
    path: "/sessions/new",
    element: <StartSessionPage />,
  },
  {
    path: "/sessions/preview",
    element: <SessionDetailPage />,
  },
  {
    path: "/sessions/history",
    element: <SessionHistoryPage />,
  },
  {
    path: "/sessions/:sessionId",
    element: <SessionInvestigationPage />,
  },
]);
