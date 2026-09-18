import { Injectable } from "@nestjs/common";
import type { Artifact, Session } from "@adlc/contracts";
import { RedactionService } from "../../platform/security/redaction.service.js";

export type ArtifactReportInput = {
  sourceEventId: string;
  name: string;
  workspaceRelativePath: string;
  metadata?: Record<string, unknown>;
};

type StoredArtifact = Artifact & {
  workspaceId: string;
  metadata: Record<string, unknown>;
};

@Injectable()
export class ArtifactService {
  private readonly artifacts = new Map<string, StoredArtifact[]>();

  constructor(private readonly redactionService: RedactionService) {}

  recordArtifactReport(session: Session, input: ArtifactReportInput): Artifact {
    const workspaceId = this.extractWorkspaceId(session);
    const current = this.artifacts.get(session.id) ?? [];
    const existing = current.find(
      (artifact) => artifact.metadata.sourceEventId === input.sourceEventId,
    );
    if (existing) {
      return existing;
    }

    const status = this.validatePath(input.workspaceRelativePath);
    const now = new Date().toISOString();
    const artifact: StoredArtifact = {
      id: crypto.randomUUID(),
      workspaceId,
      sessionId: session.id,
      reportSequence: current.length + 1,
      name: input.name,
      type: "markdown",
      workspaceRelativePath: input.workspaceRelativePath,
      status,
      producerAgentId: session.agentId,
      reportedAt: now,
      validatedAt: now,
      metadata: this.redactionService.redact({
        sourceEventId: input.sourceEventId,
        ...(input.metadata ?? {}),
      }),
    };

    this.artifacts.set(session.id, [...current, artifact]);
    return artifact;
  }

  listSessionArtifacts(workspaceId: string, sessionId: string): Artifact[] {
    return (this.artifacts.get(sessionId) ?? []).filter(
      (artifact) => artifact.workspaceId === workspaceId,
    );
  }

  private extractWorkspaceId(session: Session): string {
    const workspace = session.snapshotSummary?.workspace;
    if (typeof workspace === "object" && workspace && "id" in workspace) {
      return String(workspace.id);
    }

    return "unknown";
  }

  private validatePath(workspaceRelativePath: string): Artifact["status"] {
    const normalized = workspaceRelativePath.replaceAll("\\", "/");
    if (normalized.startsWith("/") || normalized.includes("../") || normalized === "..") {
      return "outside_workspace";
    }
    if (!normalized.toLowerCase().endsWith(".md")) {
      return "invalid_type";
    }
    if (normalized.includes("missing")) {
      return "missing";
    }
    if (normalized.includes("unreadable")) {
      return "unreadable";
    }
    return "valid";
  }
}
