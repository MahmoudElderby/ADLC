import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { liveFleetResponseSchema } from "@adlc/contracts";
import { apiFetch } from "../../lib/api.js";
import { LiveFleetCanvas, type FleetNode } from "./LiveFleetCanvas.js";

export function CommandCenterPage() {
  const fleet = useQuery({ queryKey: ["live-fleet"], queryFn: () => apiFetch("/dashboard/live-fleet", liveFleetResponseSchema) });
  const sessions: FleetNode[] = fleet.data ?? [];
  return <main><header><h1>Command Center</h1><Link to="/sessions/history">Session history</Link></header>
    {fleet.isPending && <p role="status">Loading active sessions</p>}
    {fleet.isError && <p role="alert">Unable to load active sessions.</p>}
    {!fleet.isPending && !fleet.isError && <LiveFleetCanvas sessions={sessions} />}
  </main>;
}
