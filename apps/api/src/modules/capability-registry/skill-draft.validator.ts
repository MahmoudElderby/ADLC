import type { DraftValidation } from "@adlc/contracts";

const SOURCE_TYPES = new Set(["openai_skill_id", "source_reference"]);

type SkillDraftInput = {
  name: string;
  description: string;
  sourceType: string;
  sourceReference: string;
  version: string;
  capabilityDirectories: string[];
  compatibleEnvironmentTypes: string[] | undefined;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function normalizeSkillDraft(input: unknown): SkillDraftInput {
  const body = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    name: asString(body.name),
    description: asString(body.description),
    sourceType: asString(body.sourceType),
    sourceReference: asString(body.sourceReference),
    version: asString(body.version),
    capabilityDirectories: asStringArray(body.capabilityDirectories),
    compatibleEnvironmentTypes: Array.isArray(body.compatibleEnvironmentTypes)
      ? body.compatibleEnvironmentTypes.map((item) => String(item))
      : undefined,
  };
}

export function validateSkillDraft(input: unknown): DraftValidation {
  const data = normalizeSkillDraft(input);
  const blockingErrors: DraftValidation["blockingErrors"] = [];
  const warnings: DraftValidation["warnings"] = [];

  if (!data.name.trim()) {
    blockingErrors.push({ field: "name", message: "Name is required." });
  } else if (data.name.length > 120) {
    blockingErrors.push({ field: "name", message: "Name must be 120 characters or fewer." });
  }

  if (!data.description.trim()) {
    blockingErrors.push({ field: "description", message: "Description is required." });
  } else if (data.description.length > 1000) {
    blockingErrors.push({
      field: "description",
      message: "Description must be 1,000 characters or fewer.",
    });
  }

  if (!SOURCE_TYPES.has(data.sourceType)) {
    blockingErrors.push({
      field: "sourceType",
      message: "Source type must be openai_skill_id or source_reference.",
    });
  }

  if (!data.sourceReference.trim()) {
    blockingErrors.push({ field: "sourceReference", message: "Source reference is required." });
  }

  if (!data.version.trim()) {
    blockingErrors.push({ field: "version", message: "Version is required." });
  } else if (data.version.length > 80) {
    blockingErrors.push({ field: "version", message: "Version must be 80 characters or fewer." });
  }

  const compatibleEnvironmentTypes = data.compatibleEnvironmentTypes ?? ["self_hosted"];
  if (!compatibleEnvironmentTypes.includes("self_hosted")) {
    blockingErrors.push({
      field: "compatibleEnvironmentTypes",
      message: "Compatible environment types must include self_hosted.",
    });
  }

  if (data.capabilityDirectories.length === 0) {
    warnings.push({
      field: "capabilityDirectories",
      message: "No capability directories specified.",
    });
  }

  return {
    blockingErrors,
    warnings,
    preview: {
      name: data.name,
      description: data.description,
      sourceType: data.sourceType,
      sourceReference: data.sourceReference,
      version: data.version,
      capabilityDirectories: data.capabilityDirectories,
      compatibleEnvironmentTypes,
    },
  };
}
