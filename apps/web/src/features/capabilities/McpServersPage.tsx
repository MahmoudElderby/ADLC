import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import {
  EmptyWorkspace,
  EntityColumnHeader,
  EntityRowBody,
  I,
  StatusBadge,
  SvgIcon,
  createActionClassName,
  entityRowClassName,
} from "@adlc/ui";
import { mcpServerSchema } from "@adlc/contracts";
import { z } from "zod";
import { apiFetch } from "../../lib/api.js";

const mcpsSchema = z.array(mcpServerSchema);

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

function mcpDotStatus(reachability: string, validation: string): string {
  if (validation === "invalid" || reachability === "unreachable") return "failed";
  if (validation === "valid" && reachability === "reachable") return "healthy";
  if (reachability === "unverified" || validation === "pending_validation") return "waiting";
  return "idle";
}

export function McpEntityColumn() {
  const location = useLocation();
  const servers = useQuery({
    queryKey: ["capabilities", "mcp"],
    queryFn: () => apiFetch("/capabilities/mcp", mcpsSchema),
    refetchInterval: 2_000,
  });

  return (
    <div className="flex min-h-0 flex-col">
      <EntityColumnHeader
        title="MCP Servers"
        createAction={
          <Link to="/mcp/new" aria-label="Create MCP server" className={createActionClassName()}>
            <SvgIcon d={I.plus} size={14} />
          </Link>
        }
      />
      <div className="min-h-0 flex-1 overflow-auto">
        {servers.isPending ? <p className="px-3 py-3 text-[12px] text-[#4A5568]">Loading MCP servers…</p> : null}
        {servers.data?.length ? (
          <ul className="m-0 list-none p-0">
            {servers.data.map((server) => {
              const selected = location.pathname === `/mcp/${server.id}`;
              return (
                <li key={server.id}>
                  <Link to={`/mcp/${server.id}`} className={entityRowClassName(selected)}>
                    <EntityRowBody
                      name={server.label}
                      selected={selected}
                      status={mcpDotStatus(server.reachabilityStatus, server.status)}
                      meta={server.connectionOrigin}
                    >
                      <span data-testid="mcp-status">
                        <StatusBadge
                          status={{
                            validation: server.status,
                            reachability: server.reachabilityStatus,
                          }}
                          label={statusLabel(server.reachabilityStatus)}
                        />
                      </span>
                    </EntityRowBody>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : servers.isSuccess ? (
          <p className="px-3 py-3 text-[12px] text-[#4A5568]">No MCP servers registered yet.</p>
        ) : null}
      </div>
    </div>
  );
}

export function McpServersPage() {
  return (
    <EmptyWorkspace
      title="MCP Servers"
      body="Select an MCP server from the entity column or register one to continue."
    />
  );
}
