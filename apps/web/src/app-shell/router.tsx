import { createBrowserRouter, Navigate } from "react-router-dom";
import { AgentEditorPage } from "../features/agents/AgentEditorPage.js";
import { CapabilityRegistryPage } from "../features/capabilities/CapabilityRegistryPage.js";

function CommandCenterPlaceholder() {
  return <section aria-label="Command Center">Command Center foundation ready.</section>;
}

function WorkspacePlaceholder() {
  return (
    <section aria-label="Workspace Environment">Workspace environment foundation ready.</section>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/command-center" replace />,
  },
  {
    path: "/command-center",
    element: <CommandCenterPlaceholder />,
  },
  {
    path: "/workspace",
    element: <WorkspacePlaceholder />,
  },
  {
    path: "/capabilities",
    element: <CapabilityRegistryPage />,
  },
  {
    path: "/agents/new",
    element: <AgentEditorPage />,
  },
]);
