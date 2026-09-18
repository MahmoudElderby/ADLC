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
  mcpServerSchema,
  type DraftValidation,
  type McpServer,
} from "@adlc/contracts";
import { apiFetch, ApiRequestError } from "../../lib/api.js";

export type McpFormValue = {
  label: string;
  serverUrl: string;
  allowedTools: string;
  connectionOrigin: "environment";
  required: boolean;
  credential: string;
};

export const emptyMcpForm: McpFormValue = {
  label: "",
  serverUrl: "",
  allowedTools: "",
  connectionOrigin: "environment",
  required: true,
  credential: "",
};

export function mcpToForm(mcp: McpServer): McpFormValue {
  return {
    label: mcp.label,
    serverUrl: mcp.serverUrl,
    allowedTools: mcp.allowedTools.join("\n"),
    connectionOrigin: "environment",
    required: mcp.required,
    credential: "",
  };
}

export function formToPayload(value: McpFormValue, includeCredential: boolean) {
  const payload: Record<string, unknown> = {
    label: value.label,
    serverUrl: value.serverUrl,
    transportType: "http",
    connectionOrigin: "environment",
    allowedTools: value.allowedTools
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean),
    required: value.required,
  };
  if (includeCredential && value.credential.trim()) {
    payload.credential = value.credential;
  }
  return payload;
}

export function McpDraftPanels({ draft }: { draft: DraftValidation | null }) {
  return (
    <ReviewPanel>
      <ValidationList
        testId="mcp-blocking-errors"
        severity="blocking"
        items={draft?.blockingErrors ?? []}
      />
      <ValidationList
        testId="mcp-warnings"
        severity="warning"
        items={draft?.warnings ?? []}
      />
      <JsonPreview testId="mcp-configuration-preview" value={draft?.preview ?? {}} />
    </ReviewPanel>
  );
}

export function McpFormFields({
  value,
  onChange,
  credentialMode,
}: {
  value: McpFormValue;
  onChange: (value: McpFormValue) => void;
  credentialMode: "create" | "stored";
}) {
  return (
    <div className="grid gap-4">
      <FormSection title="Connection">
        <Field label="Label" htmlFor="mcp-label" required>
          <TInput
            id="mcp-label"
            value={value.label}
            onChange={(event) => onChange({ ...value, label: event.target.value })}
          />
        </Field>
        <Field label="Server URL" htmlFor="mcp-url">
          <TInput
            id="mcp-url"
            mono
            value={value.serverUrl}
            onChange={(event) => onChange({ ...value, serverUrl: event.target.value })}
          />
        </Field>
        <Field label="Connection origin" htmlFor="mcp-origin">
          <TSelect
            id="mcp-origin"
            value={value.connectionOrigin}
            onChange={() => onChange({ ...value, connectionOrigin: "environment" })}
          >
            <option value="environment">environment</option>
          </TSelect>
        </Field>
        <label className="flex items-center gap-2 text-[12px] text-[#C4CDD8]">
          <input
            type="checkbox"
            checked={value.required}
            onChange={(event) => onChange({ ...value, required: event.target.checked })}
            className="accent-[#06B6D4]"
          />
          Required
        </label>
      </FormSection>
      <FormSection title="Tools">
        <Field label="Allowed tools" htmlFor="mcp-tools">
          <TTextarea
            id="mcp-tools"
            mono
            value={value.allowedTools}
            onChange={(event) => onChange({ ...value, allowedTools: event.target.value })}
            rows={3}
          />
        </Field>
      </FormSection>
      <FormSection title="Credential">
        <Field label="Credential" htmlFor="mcp-credential">
          <TInput
            id="mcp-credential"
            type="password"
            autoComplete="off"
            placeholder={credentialMode === "stored" ? "Stored — paste only to replace" : undefined}
            value={value.credential}
            onChange={(event) => onChange({ ...value, credential: event.target.value })}
          />
        </Field>
      </FormSection>
    </div>
  );
}

export function useMcpDraft(value: McpFormValue, includeCredential: boolean) {
  const [draft, setDraft] = useState<DraftValidation | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void apiFetch("/capabilities/mcp/draft:validate", draftValidationSchema, {
        method: "POST",
        body: JSON.stringify(formToPayload(value, includeCredential)),
      })
        .then(setDraft)
        .catch(() => {
          setDraft({
            blockingErrors: value.label.trim()
              ? []
              : [{ field: "label", message: "Label is required." }],
            warnings: [],
            preview: {
              ...formToPayload(value, false),
            },
          });
        });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [value, includeCredential]);

  return draft;
}

export function McpCreationWorkspace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [value, setValue] = useState<McpFormValue>(emptyMcpForm);
  const [saveError, setSaveError] = useState<string | null>(null);
  const draft = useMcpDraft(value, true);

  const save = useMutation({
    mutationFn: () =>
      apiFetch("/capabilities/mcp", mcpServerSchema, {
        method: "POST",
        body: JSON.stringify(formToPayload(value, true)),
      }),
    onSuccess: async (mcp) => {
      queryClient.setQueryData(["capabilities", "mcp", mcp.id], mcp);
      await queryClient.invalidateQueries({ queryKey: ["capabilities", "mcp"] });
      navigate(`/mcp/${mcp.id}`);
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
      <form aria-label="Create MCP server" onSubmit={onSubmit} className="grid content-start gap-4">
        <h1 className="m-0 text-sm font-semibold text-[#F1F5F9]">New MCP server</h1>
        <McpFormFields value={value} onChange={setValue} credentialMode="create" />
        {saveError ? (
          <p role="alert" className="m-0 text-[11px] text-red-400">
            {saveError}
          </p>
        ) : null}
        <div>
          <Button type="submit" variant="primary">
            Save MCP server
          </Button>
        </div>
      </form>
      <McpDraftPanels draft={draft} />
    </CreationWorkspace>
  );
}
