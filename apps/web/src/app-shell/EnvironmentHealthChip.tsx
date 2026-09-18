import { useQuery } from "@tanstack/react-query";
import { Badge, StatusDot } from "@adlc/ui";
import { workspaceHealthSchema } from "@adlc/contracts";
import { apiFetch } from "../lib/api.js";

export function EnvironmentHealthChip() {
  const health = useQuery({
    queryKey: ["workspace-environment", "health"],
    queryFn: () => apiFetch("/workspace-environment/health", workspaceHealthSchema),
    refetchInterval: 3_000,
  });

  const canProbe = health.data?.canProbeReachability === true && health.data.connector === "online";
  const label = canProbe ? "Online" : "Offline — unable to probe";

  return (
    <span data-testid="environment-health" className="inline-flex items-center gap-1.5">
      <StatusDot status={canProbe ? "healthy" : "waiting"} />
      <Badge label={label.toUpperCase()} variant={canProbe ? "emerald" : "amber"} />
    </span>
  );
}
