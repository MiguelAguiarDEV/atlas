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

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  area?: string;
  status?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  color?: string;
  icon?: string | null;
  area?: string;
  status?: string;
}

export async function listProjects(): Promise<ApiResponse<ApiProject[]>> {
  return apiFetch<ApiProject[]>("/api/v1/projects");
}

export async function getProject(
  id: number,
): Promise<ApiResponse<ApiProject>> {
  return apiFetch<ApiProject>(`/api/v1/projects/${id}`);
}

export async function createProject(
  input: CreateProjectInput,
): Promise<ApiResponse<ApiProject>> {
  return apiFetch<ApiProject>("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProject(
  id: number,
  input: UpdateProjectInput,
): Promise<ApiResponse<ApiProject>> {
  return apiFetch<ApiProject>(`/api/v1/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteProject(id: number): Promise<void> {
  await apiFetch(`/api/v1/projects/${id}`, { method: "DELETE" });
}
