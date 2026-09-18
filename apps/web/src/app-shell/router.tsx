import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShellLayout } from "./AppShellLayout.js";
import { AuthGate } from "./AuthGate.js";
import { SignInPage } from "../features/auth/SignInPage.js";
import { SkillCreationWorkspace } from "../features/capabilities/SkillCreationWorkspace.js";
import { SkillDetailPage } from "../features/capabilities/SkillDetailPage.js";
import { SkillsPage } from "../features/capabilities/SkillsPage.js";
import { McpCreationWorkspace } from "../features/capabilities/McpCreationWorkspace.js";
import { McpDetailPage } from "../features/capabilities/McpDetailPage.js";
import { McpServersPage } from "../features/capabilities/McpServersPage.js";

function ProtectedShell() {
  return (
    <AuthGate>
      <AppShellLayout />
    </AuthGate>
  );
}

export const router = createBrowserRouter([
  {
    path: "/sign-in",
    element: <SignInPage />,
  },
  {
    path: "/",
    element: <ProtectedShell />,
    children: [
      { index: true, element: <Navigate to="/skills" replace /> },
      { path: "skills", element: <SkillsPage /> },
      { path: "skills/new", element: <SkillCreationWorkspace /> },
      { path: "skills/:skillId", element: <SkillDetailPage /> },
      { path: "mcp", element: <McpServersPage /> },
      { path: "mcp/new", element: <McpCreationWorkspace /> },
      { path: "mcp/:mcpId", element: <McpDetailPage /> },
      { path: "command-center", element: <Navigate to="/skills" replace /> },
      { path: "agents/new", element: <Navigate to="/skills" replace /> },
      { path: "agents/:agentId", element: <Navigate to="/skills" replace /> },
      { path: "sessions/new", element: <Navigate to="/skills" replace /> },
      { path: "sessions/history", element: <Navigate to="/skills" replace /> },
      { path: "sessions/:sessionId", element: <Navigate to="/skills" replace /> },
      { path: "capabilities", element: <Navigate to="/skills" replace /> },
      { path: "workspace", element: <Navigate to="/skills" replace /> },
    ],
  },
]);
