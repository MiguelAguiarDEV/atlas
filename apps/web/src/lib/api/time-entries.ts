import { apiFetch, type ApiResponse } from "../api";

/** TimeEntry as returned by the Go API. */
export interface ApiTimeEntry {
  id: number;
  task_id: number | null;
  started_at: string;
  ended_at: string | null;
  duration_secs: number | null;
  entry_type: string;
  source: string;
  notes: string | null;
  created_at: string;
}

export async function listTimeEntries(params?: {
  task_id?: number;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<ApiTimeEntry[]>> {
  const qs = new URLSearchParams();
  if (params?.task_id) qs.set("task_id", String(params.task_id));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));

  const query = qs.toString();
  return apiFetch<ApiTimeEntry[]>(
    `/api/v1/time-entries${query ? `?${query}` : ""}`,
  );
}

export async function startTimer(
  taskId: number,
): Promise<ApiResponse<ApiTimeEntry>> {
  return apiFetch<ApiTimeEntry>(`/api/v1/tasks/${taskId}/timer/start`, {
    method: "POST",
  });
}

export async function stopTimer(
  taskId: number,
): Promise<ApiResponse<ApiTimeEntry>> {
  return apiFetch<ApiTimeEntry>(`/api/v1/tasks/${taskId}/timer/stop`, {
    method: "POST",
  });
}
