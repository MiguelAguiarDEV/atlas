import { apiFetch, type ApiResponse } from "../api";

/** Project as returned by the Go API. */
export interface ApiProject {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  area: string;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function listProjects(): Promise<ApiResponse<ApiProject[]>> {
  return apiFetch<ApiProject[]>("/api/v1/projects");
}

export async function getProject(
  id: number,
): Promise<ApiResponse<ApiProject>> {
  return apiFetch<ApiProject>(`/api/v1/projects/${id}`);
}

export async function createProject(input: {
  name: string;
  color?: string;
  description?: string;
}): Promise<ApiResponse<ApiProject>> {
  return apiFetch<ApiProject>("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
