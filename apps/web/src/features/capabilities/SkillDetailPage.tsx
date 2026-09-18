import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, CreationWorkspace, IdChip, LoadingState, shortId } from "@adlc/ui";
import { auditResponseSchema, skillSchema, type Skill } from "@adlc/contracts";
import { apiFetch, ApiRequestError } from "../../lib/api.js";
import {
  SkillDraftPanels,
  SkillFormFields,
  emptySkillForm,
  formToPayload,
  skillToForm,
  useSkillDraft,
  type SkillFormValue,
} from "./SkillCreationWorkspace.js";

export function SkillDetailPage() {
  const { skillId } = useParams();
  const queryClient = useQueryClient();
  const [value, setValue] = useState<SkillFormValue | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const skillQuery = useQuery({
    queryKey: ["capabilities", "skills", skillId],
    enabled: Boolean(skillId),
    queryFn: () => apiFetch(`/capabilities/skills/${skillId}`, skillSchema),
    initialData: () => {
      const listed = queryClient.getQueryData<Skill[]>(["capabilities", "skills"]);
      return listed?.find((item) => item.id === skillId);
    },
  });
  const auditQuery = useQuery({
    queryKey: ["capabilities", "skills", skillId, "audit"],
    enabled: Boolean(skillId),
    queryFn: () => apiFetch(`/capabilities/skills/${skillId}/audit`, auditResponseSchema),
  });

  useEffect(() => {
    if (skillQuery.data) {
      setValue(skillToForm(skillQuery.data));
    }
  }, [skillQuery.data]);

  const formValue = value ?? (skillQuery.data ? skillToForm(skillQuery.data) : emptySkillForm);
  const draft = useSkillDraft(formValue);

  const save = useMutation({
    mutationFn: () => {
      if (!skillQuery.data) {
        throw new Error("Skill is not loaded.");
      }
      return apiFetch(`/capabilities/skills/${skillQuery.data.id}`, skillSchema, {
        method: "PATCH",
        body: JSON.stringify({
          ...formToPayload(formValue),
          updatedAt: skillQuery.data.updatedAt,
        }),
      });
    },
    onSuccess: async (skill) => {
      queryClient.setQueryData(["capabilities", "skills", skill.id], skill);
      await queryClient.invalidateQueries({ queryKey: ["capabilities", "skills"] });
    },
    onError: (error) => {
      if (error instanceof ApiRequestError) {
        const body = error.body as { detail?: string; errors?: { message: string }[] };
        const message =
          error.status === 409
            ? body.detail ?? "This skill was changed by someone else. Refresh and retry."
            : body.errors?.[0]?.message ?? body.detail ?? "Save refused.";
        setSaveError(message);
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

  if (skillQuery.isLoading && !skillQuery.data) {
    return <LoadingState>Loading skill…</LoadingState>;
  }

  if (skillQuery.isError || !skillQuery.data) {
    return (
      <section className="px-6 py-8">
        <h1 className="text-sm font-semibold text-[#F1F5F9]">Skill</h1>
        <p className="mt-2 text-[13px] text-[#8892A4]">Skill was not found in this workspace.</p>
      </section>
    );
  }

  const skill = skillQuery.data;

  return (
    <CreationWorkspace>
      <form aria-label="Edit skill" onSubmit={onSubmit} className="grid content-start gap-4">
        <div className="flex items-center gap-3">
          <h1 className="m-0 text-sm font-semibold text-[#F1F5F9]">{skill.name}</h1>
          <IdChip>{shortId(skill.id)}</IdChip>
        </div>
        <p data-testid="skill-attribution" className="m-0 text-[12px] text-[#8892A4]">
          Registered by {skill.createdBy.displayName} at{" "}
          <time dateTime={skill.createdAt} className="font-mono text-[#4A5568]">
            {skill.createdAt}
          </time>
          . Last changed by {skill.lastChangedBy.displayName} at{" "}
          <time dateTime={skill.updatedAt} className="font-mono text-[#4A5568]">
            {skill.updatedAt}
          </time>
          .
        </p>
        <ol
          data-testid="skill-history"
          aria-label="Skill history"
          className="m-0 grid list-none gap-1.5 p-0"
        >
          {(auditQuery.data ?? []).map((entry) => (
            <li key={entry.id} className="font-mono text-[11px] text-[#4A5568]">
              {entry.action} · {entry.actor.displayName} · {entry.createdAt}
            </li>
          ))}
        </ol>
        <SkillFormFields value={formValue} onChange={setValue} />
        {saveError ? (
          <p
            role="alert"
            data-testid={saveError.toLowerCase().includes("someone else") ? "concurrent-edit-error" : undefined}
            className="m-0 text-[11px] text-red-400"
          >
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
