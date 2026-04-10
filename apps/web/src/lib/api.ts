const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Unified API response envelope matching the Go backend. */
export interface ApiResponse<T> {
  data: T;
  error: string | null;
  meta?: { total: number; limit: number; offset: number };
}

/** Generic fetch wrapper with error handling. */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body: ApiResponse<T> = await res.json();

  if (!res.ok || body.error) {
    throw new Error(body.error ?? `API error ${res.status}`);
  }

  return body;
}
