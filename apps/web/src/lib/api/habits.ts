import { apiFetch, type ApiResponse } from "../api";

/** Habit as returned by the Go API. */
export interface ApiHabit {
  id: number;
  name: string;
  description: string | null;
  frequency: string;
  target_count: number;
  habit_group: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface ApiHabitCompletion {
  id: number;
  habit_id: number;
  completed_at: string;
  value: number;
  notes: string | null;
}

export interface CreateHabitInput {
  name: string;
  description?: string;
  frequency?: string;
  target_count?: number;
  habit_group?: string;
}

export interface UpdateHabitInput {
  name?: string;
  description?: string | null;
  frequency?: string;
  target_count?: number;
  habit_group?: string | null;
  active?: boolean;
}

export async function listHabits(): Promise<ApiResponse<ApiHabit[]>> {
  return apiFetch<ApiHabit[]>("/api/v1/habits");
}

export async function createHabit(
  input: CreateHabitInput,
): Promise<ApiResponse<ApiHabit>> {
  return apiFetch<ApiHabit>("/api/v1/habits", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateHabit(
  id: number,
  input: UpdateHabitInput,
): Promise<ApiResponse<ApiHabit>> {
  return apiFetch<ApiHabit>(`/api/v1/habits/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteHabit(id: number): Promise<void> {
  await apiFetch(`/api/v1/habits/${id}`, { method: "DELETE" });
}

export async function completeHabit(
  id: number,
): Promise<ApiResponse<ApiHabitCompletion>> {
  return apiFetch<ApiHabitCompletion>(`/api/v1/habits/${id}/complete`, {
    method: "POST",
  });
}

export async function listCompletions(
  id: number,
): Promise<ApiResponse<ApiHabitCompletion[]>> {
  return apiFetch<ApiHabitCompletion[]>(`/api/v1/habits/${id}/completions`);
}

/**
 * List habit completions for a given date (default: today).
 * Calls the collection-level `/api/v1/habits/completions?date=...` endpoint
 * so the Today page can render "done today" state in a single fetch.
 */
export async function listCompletionsForDate(
  date?: string,
): Promise<ApiResponse<ApiHabitCompletion[]>> {
  const q = date ?? "today";
  return apiFetch<ApiHabitCompletion[]>(
    `/api/v1/habits/completions?date=${encodeURIComponent(q)}`,
  );
}
