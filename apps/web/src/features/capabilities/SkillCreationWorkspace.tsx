import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  CreationWorkspace,
  Field,
  FormSection,
  JsonPreview,
  ReviewPanel,
  TInput,
  TSelect,
  TTextarea,
  ValidationList,
} from "@adlc/ui";
import {
  draftValidationSchema,
  skillSchema,
  type DraftValidation,
  type Skill,
} from "@adlc/contracts";
import { apiFetch, ApiRequestError } from "../../lib/api.js";

export type SkillFormValue = {
  name: string;
  description: string;
  sourceType: "openai_skill_id" | "source_reference";
  sourceReference: string;
  version: string;
  capabilityDirectories: string;
  compatibleEnvironmentTypes: string[];
};

export const emptySkillForm: SkillFormValue = {
  name: "",
  description: "",
  sourceType: "source_reference",
  sourceReference: "",
  version: "",
  capabilityDirectories: "",
  compatibleEnvironmentTypes: ["self_hosted"],
};

export function skillToForm(skill: Skill): SkillFormValue {
  return {
    name: skill.name,
    description: skill.description,
    sourceType: skill.sourceType,
    sourceReference: skill.sourceReference,
    version: skill.version,
    capabilityDirectories: skill.capabilityDirectories.join("\n"),
    compatibleEnvironmentTypes: ["self_hosted"],
  };
}

export function formToPayload(value: SkillFormValue) {
  return {
    name: value.name,
    description: value.description,
    sourceType: value.sourceType,
    sourceReference: value.sourceReference,
    version: value.version,
    capabilityDirectories: value.capabilityDirectories
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
    compatibleEnvironmentTypes: value.compatibleEnvironmentTypes,
  };
}

export function SkillDraftPanels({
  draft,
}: {
  draft: DraftValidation | null;
}) {
  return (
    <ReviewPanel>
      <ValidationList
        testId="skill-blocking-errors"
        severity="blocking"
        items={draft?.blockingErrors ?? []}
      />
      <ValidationList
        testId="skill-warnings"
        severity="warning"
        items={draft?.warnings ?? []}
      />
      <JsonPreview testId="skill-configuration-preview" value={draft?.preview ?? {}} />
    </ReviewPanel>
  );
}

export function SkillFormFields({
  value,
  onChange,
}: {
  value: SkillFormValue;
  onChange: (value: SkillFormValue) => void;
}) {
  const toggleSelfHosted = (checked: boolean) => {
    onChange({
      ...value,
      compatibleEnvironmentTypes: checked ? ["self_hosted"] : [],
    });
  };

  return (
    <div className="grid gap-4">
      <FormSection title="Basics">
        <Field label="Name" htmlFor="skill-name" required>
          <TInput
            id="skill-name"
            value={value.name}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
          />
        </Field>
        <Field label="Description" htmlFor="skill-description">
          <TTextarea
            id="skill-description"
            value={value.description}
            onChange={(event) => onChange({ ...value, description: event.target.value })}
            rows={4}
          />
        </Field>
      </FormSection>
      <FormSection title="Source">
        <Field label="Source type" htmlFor="skill-source-type">
          <TSelect
            id="skill-source-type"
            value={value.sourceType}
            onChange={(event) =>
              onChange({
                ...value,
                sourceType: event.target.value as SkillFormValue["sourceType"],
              })
            }
          >
            <option value="source_reference">source_reference</option>
            <option value="openai_skill_id">openai_skill_id</option>
          </TSelect>
        </Field>
        <Field label="Source reference" htmlFor="skill-source-reference">
          <TInput
            id="skill-source-reference"
            mono
            value={value.sourceReference}
            onChange={(event) => onChange({ ...value, sourceReference: event.target.value })}
          />
        </Field>
        <Field label="Version" htmlFor="skill-version">
          <TInput
            id="skill-version"
            mono
            value={value.version}
            onChange={(event) => onChange({ ...value, version: event.target.value })}
          />
        </Field>
      </FormSection>
      <FormSection title="Compatibility">
        <Field label="Capability directories" htmlFor="skill-directories">
          <TTextarea
            id="skill-directories"
            mono
            value={value.capabilityDirectories}
            onChange={(event) => onChange({ ...value, capabilityDirectories: event.target.value })}
            rows={3}
          />
        </Field>
        <label className="flex items-center gap-2 text-[12px] text-[#C4CDD8]">
          <input
            type="checkbox"
            checked={value.compatibleEnvironmentTypes.includes("self_hosted")}
            onChange={(event) => toggleSelfHosted(event.target.checked)}
            className="accent-[#06B6D4]"
          />
          self_hosted
        </label>
      </FormSection>
    </div>
  );
}

export function useSkillDraft(value: SkillFormValue) {
  const [draft, setDraft] = useState<DraftValidation | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void apiFetch("/capabilities/skills/draft:validate", draftValidationSchema, {
        method: "POST",
        body: JSON.stringify(formToPayload(value)),
      }).then(setDraft)
        .catch(() => {
          setDraft({
            blockingErrors: value.name.trim()
              ? []
              : [{ field: "name", message: "Name is required." }],
            warnings: value.capabilityDirectories.trim()
              ? []
              : [{ field: "capabilityDirectories", message: "No capability directories specified." }],
            preview: formToPayload(value),
          });
        });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [value]);

  return draft;
}

export function SkillCreationWorkspace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [value, setValue] = useState<SkillFormValue>(emptySkillForm);
  const [saveError, setSaveError] = useState<string | null>(null);
  const draft = useSkillDraft(value);

  const save = useMutation({
    mutationFn: () =>
      apiFetch("/capabilities/skills", skillSchema, {
        method: "POST",
        body: JSON.stringify(formToPayload(value)),
      }),
    onSuccess: async (skill) => {
      queryClient.setQueryData(["capabilities", "skills", skill.id], skill);
      await queryClient.invalidateQueries({ queryKey: ["capabilities", "skills"] });
      navigate(`/skills/${skill.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiRequestError) {
        const body = error.body as { detail?: string; errors?: { message: string }[] };
        setSaveError(body.errors?.[0]?.message ?? body.detail ?? "Save refused.");
        return;
      }
      setSaveError("Save refused.");
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    save.mutate();
  }

  return (
    <CreationWorkspace>
      <form aria-label="Create skill" onSubmit={onSubmit} className="grid content-start gap-4">
        <h1 className="m-0 text-sm font-semibold text-[#F1F5F9]">New skill</h1>
        <SkillFormFields value={value} onChange={setValue} />
        {saveError ? (
          <p role="alert" className="m-0 text-[11px] text-red-400">
            {saveError}
          </p>
        ) : null}
        <div>
          <Button type="submit" variant="primary">
            Save skill
          </Button>
        </div>
      </form>
      <SkillDraftPanels draft={draft} />
    </CreationWorkspace>
  );
}
