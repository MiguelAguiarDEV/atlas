import { apiFetch, type ApiResponse } from "../api";

/** Task as returned by the Go API. */
export interface ApiTask {
  id: number;
  project_id: number | null;
  parent_id: number | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  energy: string | null;
  estimated_mins: number | null;
  task_type: string;
  context_tags: string[] | null;
  deep_work: boolean;
  quick_win: boolean;
  recurrence: string | null;
  sort_order: number;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  project_id?: number;
  status?: string;
  priority?: string;
  estimated_mins?: number;
  due_at?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  project_id?: number;
  estimated_mins?: number;
  due_at?: string;
}

export interface ApiTaskEvent {
  id: number;
  task_id: number;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export async function createTaskEvent(
  taskId: number,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<ApiResponse<ApiTaskEvent>> {
  return apiFetch<ApiTaskEvent>(`/api/v1/tasks/${taskId}/events`, {
    method: "POST",
    body: JSON.stringify({ event_type: eventType, payload }),
  });
}

export async function listTaskEvents(
  taskId: number,
): Promise<ApiResponse<ApiTaskEvent[]>> {
  return apiFetch<ApiTaskEvent[]>(`/api/v1/tasks/${taskId}/events`);
}

export interface TaskListParams {
  status?: string;
  priority?: string;
  project_id?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listTasks(
  params?: TaskListParams,
): Promise<ApiResponse<ApiTask[]>> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.priority) qs.set("priority", params.priority);
  if (params?.project_id) qs.set("project_id", String(params.project_id));
  if (params?.search) qs.set("search", params.search);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));

  const query = qs.toString();
  return apiFetch<ApiTask[]>(`/api/v1/tasks${query ? `?${query}` : ""}`);
}

export async function getTask(id: number): Promise<ApiResponse<ApiTask>> {
  return apiFetch<ApiTask>(`/api/v1/tasks/${id}`);
}

export async function createTask(
  input: CreateTaskInput,
): Promise<ApiResponse<ApiTask>> {
  return apiFetch<ApiTask>("/api/v1/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTask(
  id: number,
  input: UpdateTaskInput,
): Promise<ApiResponse<ApiTask>> {
  return apiFetch<ApiTask>(`/api/v1/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteTask(id: number): Promise<void> {
  await apiFetch(`/api/v1/tasks/${id}`, { method: "DELETE" });
}
