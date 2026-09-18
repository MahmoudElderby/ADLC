export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`Request failed (${status}).`);
  }
}

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

function headers(init?: RequestInit): HeadersInit {
  const result: Record<string, string> = {
    Accept: "application/json",
  };
  if (init?.body !== undefined) {
    result["Content-Type"] = "application/json";
  }
  return result;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...headers(init), ...init?.headers },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ApiRequestError(response.status, null);
    }
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiRequestError(response.status, body);
  }
  return response;
}

export async function apiFetch<TSchema extends { parse: (data: unknown) => unknown }>(
  path: string,
  schema: TSchema,
  init?: RequestInit,
): Promise<ReturnType<TSchema["parse"]>> {
  const response = await request(path, init);
  if (response.status === 204) {
    return schema.parse(null) as ReturnType<TSchema["parse"]>;
  }
  return schema.parse(await response.json()) as ReturnType<TSchema["parse"]>;
}

export async function apiFetchRaw<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init);
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
