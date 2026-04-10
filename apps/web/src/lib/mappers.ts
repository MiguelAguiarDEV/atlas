import type { TaskData } from "@atlas/ui";
import type { ApiTask } from "./api/tasks";
import type { ApiProject } from "./api/projects";

/** Map API priority string ("p0","p1","p2","p3") to UI numeric priority (0-3). */
function mapPriority(p: string): 0 | 1 | 2 | 3 {
  const map: Record<string, 0 | 1 | 2 | 3> = {
    p0: 0,
    p1: 1,
    p2: 2,
    p3: 3,
  };
  return map[p] ?? 3;
}

/** Format an ISO date string to a short human label. */
function formatDueDate(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d >= today && d < tomorrow) return "Today";
  if (d >= tomorrow && d < new Date(tomorrow.getTime() + 86_400_000))
    return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Convert an API task to the UI TaskData shape. */
export function toTaskData(
  task: ApiTask,
  projects: Map<number, ApiProject>,
): TaskData {
  const project = task.project_id ? projects.get(task.project_id) : undefined;
  return {
    id: String(task.id),
    title: task.title,
    priority: mapPriority(task.priority),
    estimatedMinutes: task.estimated_mins ?? undefined,
    project: project?.name,
    dueDate: formatDueDate(task.due_at),
    status: task.status,
    projectId: task.project_id ?? undefined,
    taskType: task.task_type || undefined,
    dueDateRaw: task.due_at ?? undefined,
    energy: task.energy ?? undefined,
  };
}

/** Map UI numeric priority back to API string. */
export function toPriorityString(p: number): string {
  return `p${p}`;
}

/** Format seconds to "Xh Ym" string. */
export function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
