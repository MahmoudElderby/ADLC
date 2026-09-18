export type StatusFamily = "completed" | "waiting" | "failed" | "idle";
export type StatusColor = "emerald" | "amber" | "red" | "slate";

export type CapabilityStatusInput = {
  validation?: string | null;
  reachability?: string | null;
  connectorOnline?: boolean;
};

export function mapCapabilityStatus(input: CapabilityStatusInput): {
  family: StatusFamily;
  color: StatusColor;
} {
  const validation = input.validation ?? "pending_validation";
  const reachability = input.reachability ?? "unverified";

  if (validation === "invalid" || reachability === "unreachable") {
    return { family: "failed", color: "red" };
  }
  if (validation === "valid" && reachability === "reachable") {
    return { family: "completed", color: "emerald" };
  }
  if (
    reachability === "unverified" ||
    input.connectorOnline === false ||
    validation === "pending_validation"
  ) {
    return { family: "waiting", color: "amber" };
  }
  return { family: "idle", color: "slate" };
}
