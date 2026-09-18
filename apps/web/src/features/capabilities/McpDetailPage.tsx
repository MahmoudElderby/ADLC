import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, CreationWorkspace, IdChip, LoadingState, StatusBadge, shortId } from "@adlc/ui";
import { auditResponseSchema, mcpServerSchema, type McpServer } from "@adlc/contracts";
import { apiFetch, apiFetchRaw, ApiRequestError } from "../../lib/api.js";
import {
  McpDraftPanels,
  McpFormFields,
  emptyMcpForm,
  formToPayload,
  mcpToForm,
  useMcpDraft,
  type McpFormValue,
} from "./McpCreationWorkspace.js";

function statusLabel(mcp: McpServer): string {
  return mcp.reachabilityStatus.replaceAll("_", " ");
}

export function McpDetailPage() {
  const { mcpId } = useParams();
  const queryClient = useQueryClient();
  const [value, setValue] = useState<McpFormValue | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const mcpQuery = useQuery({
    queryKey: ["capabilities", "mcp", mcpId],
    enabled: Boolean(mcpId),
    refetchInterval: (query) =>
      query.state.data?.reachabilityStatus === "unverified" ? 1500 : false,
    queryFn: () => apiFetch(`/capabilities/mcp/${mcpId}`, mcpServerSchema),
    initialData: () => {
      const listed = queryClient.getQueryData<McpServer[]>(["capabilities", "mcp"]);
      return listed?.find((item) => item.id === mcpId);
    },
  });
  const auditQuery = useQuery({
    queryKey: ["capabilities", "mcp", mcpId, "audit"],
    enabled: Boolean(mcpId),
    queryFn: () => apiFetch(`/capabilities/mcp/${mcpId}/audit`, auditResponseSchema),
  });

  useEffect(() => {
    if (mcpQuery.data) {
      setValue(mcpToForm(mcpQuery.data));
    }
  }, [mcpQuery.data]);

  const formValue = value ?? (mcpQuery.data ? mcpToForm(mcpQuery.data) : emptyMcpForm);
  const draft = useMcpDraft(formValue, false);

  const save = useMutation({
    mutationFn: () => {
      if (!mcpQuery.data) {
        throw new Error("MCP server is not loaded.");
      }
      return apiFetch(`/capabilities/mcp/${mcpQuery.data.id}`, mcpServerSchema, {
        method: "PATCH",
        body: JSON.stringify({
          ...formToPayload(formValue, Boolean(formValue.credential.trim())),
          updatedAt: mcpQuery.data.updatedAt,
        }),
      });
    },
    onSuccess: async (mcp) => {
      queryClient.setQueryData(["capabilities", "mcp", mcp.id], mcp);
      await queryClient.invalidateQueries({ queryKey: ["capabilities", "mcp"] });
    },
    onError: (error) => {
      if (error instanceof ApiRequestError) {
        const body = error.body as { detail?: string; errors?: { message: string }[] };
        const message =
          error.status === 409
            ? body.detail ?? "This MCP server was changed by someone else. Refresh and retry."
            : body.errors?.[0]?.message ?? body.detail ?? "Save refused.";
        setSaveError(message);
        return;
      }
      setSaveError("Save refused.");
    },
  });

  const revalidate = useMutation({
    mutationFn: () => apiFetch(`/capabilities/mcp/${mcpId}/validate`, mcpServerSchema, { method: "POST" }),
    onSuccess: async (mcp) => {
      queryClient.setQueryData(["capabilities", "mcp", mcp.id], mcp);
      await queryClient.invalidateQueries({ queryKey: ["capabilities", "mcp"] });
    },
  });

  const remove = useMutation({
    mutationFn: () => apiFetchRaw(`/capabilities/mcp/${mcpId}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["capabilities", "mcp"] });
    },
    onError: (error) => {
      if (error instanceof ApiRequestError) {
        const body = error.body as {
          detail?: string;
          referencingAgents?: { id: string; name: string }[];
        };
        const names = body.referencingAgents?.map((agent) => agent.name).join(", ");
        setDeleteError(names ? `${body.detail ?? "Delete refused."} ${names}` : body.detail ?? "Delete refused.");
        return;
      }
      setDeleteError("Delete refused.");
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    save.mutate();
  }

  if (mcpQuery.isLoading && !mcpQuery.data) {
    return <LoadingState>Loading MCP server…</LoadingState>;
  }

  if (mcpQuery.isError || !mcpQuery.data) {
    return (
      <section className="px-6 py-8">
        <h1 className="text-sm font-semibold text-[#F1F5F9]">MCP server</h1>
        <p className="mt-2 text-[13px] text-[#8892A4]">MCP server was not found in this workspace.</p>
      </section>
    );
  }

  const mcp = mcpQuery.data;

  return (
    <CreationWorkspace>
      <form aria-label="Edit MCP server" onSubmit={onSubmit} className="grid content-start gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-sm font-semibold text-[#F1F5F9]">{mcp.label}</h1>
          <IdChip>{shortId(mcp.id)}</IdChip>
          <span data-testid="mcp-status">
            <StatusBadge
              status={{ validation: mcp.status, reachability: mcp.reachabilityStatus }}
              label={statusLabel(mcp)}
            />
          </span>
        </div>
        <p data-testid="mcp-credential-reference" className="m-0 font-mono text-[11px] text-[#4A5568]">
          Credential reference {mcp.credentialSecretId ?? "missing"} · health {mcp.credentialHealth}
        </p>
        <p data-testid="mcp-attribution" className="m-0 text-[12px] text-[#8892A4]">
          Registered by {mcp.createdBy.displayName} at{" "}
          <time dateTime={mcp.createdAt} className="font-mono text-[#4A5568]">
            {mcp.createdAt}
          </time>
          . Last changed by {mcp.lastChangedBy.displayName} at{" "}
          <time dateTime={mcp.updatedAt} className="font-mono text-[#4A5568]">
            {mcp.updatedAt}
          </time>
          .
        </p>
        {mcp.reachabilitySummary ? (
          <p className="m-0 text-[12px] text-[#8892A4]">{mcp.reachabilitySummary}</p>
        ) : null}
        <ol
          data-testid="mcp-history"
          aria-label="MCP history"
          className="m-0 grid list-none gap-1.5 p-0"
        >
          {(auditQuery.data ?? []).map((entry) => (
            <li key={entry.id} className="font-mono text-[11px] text-[#4A5568]">
              {entry.action} · {entry.actor.displayName} · {entry.createdAt}
            </li>
          ))}
        </ol>
        <McpFormFields value={formValue} onChange={setValue} credentialMode="stored" />
        {saveError ? (
          <p
            role="alert"
            data-testid={saveError.toLowerCase().includes("someone else") ? "concurrent-edit-error" : undefined}
            className="m-0 text-[11px] text-red-400"
          >
            {saveError}
          </p>
        ) : null}
        {deleteError ? (
          <p data-testid="mcp-delete-error" role="alert" className="m-0 text-[11px] text-red-400">
            {deleteError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary">
            Save MCP server
          </Button>
          <Button type="button" variant="secondary" onClick={() => revalidate.mutate()}>
            Revalidate reachability
          </Button>
          <Button type="button" variant="danger" onClick={() => remove.mutate()}>
            Delete MCP server
          </Button>
        </div>
      </form>
      <McpDraftPanels draft={draft} />
    </CreationWorkspace>
  );
}
