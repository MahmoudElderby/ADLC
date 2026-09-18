import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Button,
  I,
  SvgIcon,
  WorkspaceShell,
  navRailItemClassName,
} from "@adlc/ui";
import { currentIdentitySchema } from "@adlc/contracts";
import { apiFetch, apiFetchRaw } from "../lib/api.js";
import { AssistantDock, useAssistantState } from "./AssistantDock.js";
import { EnvironmentHealthChip } from "./EnvironmentHealthChip.js";
import { McpEntityColumn } from "../features/capabilities/McpServersPage.js";
import { SkillsEntityColumn } from "../features/capabilities/SkillsPage.js";
import { productAreas } from "./product-areas.js";
import { useIdentityStore } from "./providers.js";

export function AppShellLayout() {
  const identityQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch("/auth/me", currentIdentitySchema),
  });
  const identity = identityQuery.data ?? useIdentityStore.getState().identity;
  const setIdentity = useIdentityStore((state) => state.setIdentity);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { state, setState } = useAssistantState();
  const isMcp = location.pathname.startsWith("/mcp");
  const contextLabel = isMcp ? "MCP Servers" : "Skills";

  const signOut = useMutation({
    mutationFn: () => apiFetchRaw("/auth/sign-out", { method: "POST", body: "{}" }),
    onSettled: async () => {
      setIdentity(null);
      await queryClient.clear();
      navigate("/sign-in", { replace: true });
    },
  });

  return (
    <WorkspaceShell
      assistantState={state}
      topBar={
        <>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-cyan-500 to-cyan-700">
              <SvgIcon d={I.command} size={10} className="text-white" />
            </div>
            <span className="text-[13px] font-semibold text-[#F1F5F9]">ADLC</span>
            <span className="text-[#2A2F3A]">·</span>
            <strong className="truncate text-[13px] font-medium text-[#F1F5F9]">
              {identity?.displayName ?? "Operator"}
            </strong>
            <span className="truncate text-[12px] text-[#8892A4]">
              {identity?.workspaceName ?? "ADLC workspace"}
            </span>
            <EnvironmentHealthChip />
          </div>
          <div className="flex items-center gap-2">
            {state === "hidden" ? (
              <Button type="button" variant="secondary" onClick={() => setState("expanded")}>
                Show assistant
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => signOut.mutate()}>
              Sign out
            </Button>
          </div>
        </>
      }
      rail={productAreas.map((area) => (
        <NavLink
          key={area.id}
          to={area.to}
          aria-label={area.label}
          title={area.label}
          className={({ isActive }) => navRailItemClassName(isActive)}
        >
          <SvgIcon d={area.id === "mcp" ? I.mcp : I.skills} size={16} />
        </NavLink>
      ))}
      entity={isMcp ? <McpEntityColumn /> : <SkillsEntityColumn />}
      assistant={<AssistantDock state={state} setState={setState} contextLabel={contextLabel} />}
    >
      <Outlet />
    </WorkspaceShell>
  );
}
