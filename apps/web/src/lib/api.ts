import type { z } from "zod";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export async function apiFetch<TSchema extends z.ZodTypeAny>(
  path: string,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const response = await fetch(`${apiBase}${path}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Request failed (${response.status}).`);
  return schema.parse(await response.json());
}
