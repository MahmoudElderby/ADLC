import type { PropsWithChildren } from "react";
import { Badge, type BadgeVariant, StatusDot } from "../primitives.js";
import { mapCapabilityStatus, type CapabilityStatusInput } from "./status-mapping.js";

const variantByColor: Record<string, BadgeVariant> = {
  emerald: "emerald",
  amber: "amber",
  red: "red",
  slate: "slate",
};

const statusForDot: Record<string, string> = {
  completed: "healthy",
  waiting: "waiting",
  failed: "failed",
  idle: "idle",
};

export function StatusBadge({
  status,
  label,
}: PropsWithChildren<{ status: CapabilityStatusInput; label: string }>) {
  const mapped = mapCapabilityStatus(status);
  return (
    <span className="inline-flex items-center gap-1.5" data-status-family={mapped.family} data-status-color={mapped.color}>
      <StatusDot status={statusForDot[mapped.family] ?? "idle"} />
      <Badge label={label.toUpperCase()} variant={variantByColor[mapped.color] ?? "slate"} />
    </span>
  );
}
