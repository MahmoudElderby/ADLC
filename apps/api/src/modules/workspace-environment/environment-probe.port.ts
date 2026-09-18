import type { McpReachabilityStatus } from "@adlc/contracts";

export type EnvironmentProbeResult = {
  reachabilityStatus: McpReachabilityStatus;
  summary: string;
  checkedAt: Date | null;
};

export const ENVIRONMENT_PROBE_PORT = Symbol("EnvironmentProbePort");

export type EnvironmentProbePort = {
  currentMcpReachability(workspaceId: string, mcpId: string): Promise<EnvironmentProbeResult>;
};
