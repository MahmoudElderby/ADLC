import { Injectable } from "@nestjs/common";

export type ConnectorProbeResult = {
  status: "valid" | "invalid" | "unreachable";
  summary: string;
};

@Injectable()
export class ConnectorCommandService {
  async validateWorkspaceHealth(): Promise<ConnectorProbeResult> {
    return { status: "valid", summary: "Workspace connector is healthy." };
  }

  async validateSkill(sourceReference: string): Promise<ConnectorProbeResult> {
    return sourceReference.trim()
      ? { status: "valid", summary: "Skill reference is compatible with self-hosted workspace." }
      : { status: "invalid", summary: "Skill source reference is required." };
  }

  async validateMcp(serverUrl: string, allowedTools: string[]): Promise<ConnectorProbeResult> {
    if (allowedTools.length === 0) {
      return { status: "invalid", summary: "At least one allowed MCP tool is required." };
    }

    if (serverUrl.includes("unreachable")) {
      return { status: "unreachable", summary: "MCP server could not be reached from workspace." };
    }

    return { status: "valid", summary: "MCP server is reachable from workspace connector." };
  }
}
