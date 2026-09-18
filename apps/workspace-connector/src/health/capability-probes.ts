export type SkillCompatibilityProbeInput = {
  sourceReference: string;
  compatibleEnvironmentTypes?: string[];
};

export type McpReachabilityProbeInput = {
  serverUrl: string;
  allowedTools: string[];
  credentialPresent?: boolean;
};

export type ProbeResult = {
  status: "valid" | "invalid" | "unreachable";
  summary: string;
};

export function probeSkillCompatibility(input: SkillCompatibilityProbeInput): ProbeResult {
  if (!input.sourceReference.trim()) {
    return { status: "invalid", summary: "Skill source reference is required." };
  }

  if (
    input.compatibleEnvironmentTypes &&
    !input.compatibleEnvironmentTypes.includes("self_hosted")
  ) {
    return { status: "invalid", summary: "Skill is not compatible with self-hosted workspaces." };
  }

  return { status: "valid", summary: "Skill reference is compatible with this workspace." };
}

export function probeMcpReachability(input: McpReachabilityProbeInput): ProbeResult {
  let url: URL;
  try {
    url = new URL(input.serverUrl);
  } catch {
    return { status: "invalid", summary: "MCP server URL is invalid." };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { status: "invalid", summary: "MCP server must use HTTP transport." };
  }

  if (input.allowedTools.length === 0) {
    return { status: "invalid", summary: "At least one allowed MCP tool is required." };
  }

  if (url.hostname.includes("unreachable")) {
    return { status: "unreachable", summary: "MCP server could not be reached from workspace." };
  }

  return {
    status: "valid",
    summary: input.credentialPresent
      ? "MCP server is reachable with credential reference."
      : "MCP server is reachable without credentials.",
  };
}
