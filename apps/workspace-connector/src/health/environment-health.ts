import { access, constants, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";

export type EnvironmentHealthResult = {
  filesystem: "healthy" | "unreadable" | "unwritable" | "missing";
  outboundHttp: boolean;
  message: string | null;
};

export async function probeEnvironmentHealth(workspacePath: string): Promise<EnvironmentHealthResult> {
  try {
    await access(workspacePath, constants.F_OK);
  } catch {
    return { filesystem: "missing", outboundHttp: false, message: "Workspace path is missing." };
  }

  try {
    await access(workspacePath, constants.R_OK);
  } catch {
    return { filesystem: "unreadable", outboundHttp: false, message: "Workspace path is unreadable." };
  }

  try {
    const probe = join(workspacePath, `.adlc-health-${Date.now()}`);
    await writeFile(probe, "ok", { flag: "w" });
    await unlink(probe);
  } catch {
    return { filesystem: "unwritable", outboundHttp: false, message: "Workspace path is unwritable." };
  }

  let outboundHttp = false;
  try {
    const response = await fetch("http://127.0.0.1:3000/api/v1/health", {
      signal: AbortSignal.timeout(3_000),
    });
    outboundHttp = response.ok;
  } catch {
    outboundHttp = false;
  }

  return {
    filesystem: "healthy",
    outboundHttp,
    message: outboundHttp ? null : "Outbound HTTP from the connector could not be confirmed.",
  };
}
