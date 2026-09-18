import fs from "node:fs";
import path from "node:path";

export type ArtifactProbeResult = {
  status: "valid" | "missing" | "unreadable" | "outside_workspace" | "invalid_type";
  workspaceRelativePath: string;
};

export function probeMarkdownArtifact(
  workspaceRoot: string,
  workspaceRelativePath: string,
): ArtifactProbeResult {
  const normalized = workspaceRelativePath.replaceAll("\\", "/");
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedPath = path.resolve(resolvedRoot, normalized);

  if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
    return { status: "outside_workspace", workspaceRelativePath: normalized };
  }

  if (!normalized.toLowerCase().endsWith(".md")) {
    return { status: "invalid_type", workspaceRelativePath: normalized };
  }

  if (!fs.existsSync(resolvedPath)) {
    return { status: "missing", workspaceRelativePath: normalized };
  }

  try {
    fs.accessSync(resolvedPath, fs.constants.R_OK);
  } catch {
    return { status: "unreadable", workspaceRelativePath: normalized };
  }

  return { status: "valid", workspaceRelativePath: normalized };
}
