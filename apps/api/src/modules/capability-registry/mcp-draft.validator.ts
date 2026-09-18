import type { DraftValidation } from "@adlc/contracts";

type McpDraftInput = {
  label: string;
  serverUrl: string;
  transportType: string;
  connectionOrigin: string;
  allowedTools: string[];
  required: boolean;
  credential: string | undefined;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function normalizeMcpDraft(input: unknown): McpDraftInput {
  const body = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    label: asString(body.label),
    serverUrl: asString(body.serverUrl),
    transportType: asString(body.transportType) || "http",
    connectionOrigin: asString(body.connectionOrigin) || "environment",
    allowedTools: asStringArray(body.allowedTools),
    required: body.required !== false,
    credential: body.credential === undefined ? undefined : asString(body.credential),
  };
}

export function validateMcpDraft(input: unknown): DraftValidation {
  const data = normalizeMcpDraft(input);
  const blockingErrors: DraftValidation["blockingErrors"] = [];
  const warnings: DraftValidation["warnings"] = [];

  if (!data.label.trim()) {
    blockingErrors.push({ field: "label", message: "Label is required." });
  } else if (data.label.length > 80) {
    blockingErrors.push({ field: "label", message: "Label must be 80 characters or fewer." });
  }

  let parsedUrl: URL | undefined;
  try {
    parsedUrl = new URL(data.serverUrl);
  } catch {
    blockingErrors.push({ field: "serverUrl", message: "Server URL must be a valid http or https address." });
  }
  if (parsedUrl && !["http:", "https:"].includes(parsedUrl.protocol)) {
    blockingErrors.push({ field: "serverUrl", message: "Server URL must use http or https." });
  }

  if (data.transportType !== "http") {
    blockingErrors.push({ field: "transportType", message: "Transport type must be http." });
  }

  if (data.connectionOrigin !== "environment") {
    blockingErrors.push({
      field: "connectionOrigin",
      message: "Connection origin must be environment.",
    });
  }

  if (data.allowedTools.length === 0) {
    blockingErrors.push({ field: "allowedTools", message: "At least one allowed tool is required." });
  }

  if (data.credential === undefined) {
    warnings.push({
      field: "credential",
      message: "Credential is unchanged; the stored secret will be kept.",
    });
  } else if (!data.credential.trim()) {
    blockingErrors.push({ field: "credential", message: "Credential is required on first save." });
  }

  return {
    blockingErrors,
    warnings,
    preview: {
      label: data.label,
      serverUrl: data.serverUrl,
      transportType: data.transportType,
      connectionOrigin: data.connectionOrigin,
      allowedTools: data.allowedTools,
      required: data.required,
      credential: data.credential ? "[REDACTED]" : undefined,
    },
  };
}
