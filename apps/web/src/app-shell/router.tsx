import { createBrowserRouter, Navigate } from "react-router-dom";
import { AgentEditorPage } from "../features/agents/AgentEditorPage.js";
import { CapabilityRegistryPage } from "../features/capabilities/CapabilityRegistryPage.js";
import { SessionDetailPage } from "../features/sessions/SessionDetailPage.js";
import { StartSessionPage } from "../features/sessions/StartSessionPage.js";
import { WorkspaceHealthPanel } from "../features/workspace/WorkspaceHealthPanel.js";
import { CommandCenterPage } from "../features/command-center/CommandCenterPage.js";
import { SessionHistoryPage } from "../features/sessions/SessionHistoryPage.js";

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
    path: "/sessions/history",
    element: <SessionHistoryPage />,
  },
  {
    path: "/sessions/:sessionId",
    element: <SessionDetailPage />,
  },
]);
