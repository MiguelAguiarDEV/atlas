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

export async function listHabits(): Promise<ApiResponse<ApiHabit[]>> {
  return apiFetch<ApiHabit[]>("/api/v1/habits");
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
