import type { z } from "zod";
import { useWorkspaceStore } from "../app-shell/providers.js";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

function headers(): HeadersInit {
  const { workspaceId, actorId } = useWorkspaceStore.getState();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-adlc-workspace-id": workspaceId,
    "x-adlc-actor-id": actorId,
  };
}

export async function apiFetch<TSchema extends z.ZodTypeAny>(
  path: string,
  schema: TSchema,
  init?: RequestInit,
): Promise<z.infer<TSchema>> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { ...headers(), ...init?.headers },
  });
  if (!response.ok) throw new Error(`Request failed (${response.status}).`);
  if (response.status === 204) {
    return schema.parse(null);
  }
  return schema.parse(await response.json());
}

export async function apiFetchRaw<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { ...headers(), ...init?.headers },
  });
  if (!response.ok) throw new Error(`Request failed (${response.status}).`);
  return (await response.json()) as T;
}
