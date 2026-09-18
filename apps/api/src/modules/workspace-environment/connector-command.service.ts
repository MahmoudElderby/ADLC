import { Injectable } from "@nestjs/common";
import {
  probeMcpReachability,
  probeSkillCompatibility,
} from "../../../../workspace-connector/src/health/capability-probes.js";
import { probeMarkdownArtifact } from "../../../../workspace-connector/src/health/artifact-probe.js";

export type ConnectorProbeResult = {
  status: "valid" | "invalid" | "unreachable";
  summary: string;
};

export type ArtifactValidationResult = {
  status: "valid" | "missing" | "unreadable" | "outside_workspace" | "invalid_type";
  workspaceRelativePath: string;
};

@Injectable()
export class ConnectorCommandService {
  async validateWorkspaceHealth(workspacePath = "/workspace/adlc"): Promise<ConnectorProbeResult> {
    const skill = probeSkillCompatibility({
      sourceReference: workspacePath,
      compatibleEnvironmentTypes: ["self_hosted"],
    });
    return { status: skill.status, summary: "Workspace connector health probe completed." };
  }

  async validateSkill(
    sourceReference: string,
    compatibleEnvironmentTypes: string[] = ["self_hosted"],
  ): Promise<ConnectorProbeResult> {
    return probeSkillCompatibility({ sourceReference, compatibleEnvironmentTypes });
  }

  async validateMcp(
    serverUrl: string,
    allowedTools: string[],
    credentialPresent = false,
  ): Promise<ConnectorProbeResult> {
    return probeMcpReachability({ serverUrl, allowedTools, credentialPresent });
  }

  async validateArtifact(
    workspaceRoot: string,
    workspaceRelativePath: string,
  ): Promise<ArtifactValidationResult> {
    return probeMarkdownArtifact(workspaceRoot, workspaceRelativePath);
  }
}
