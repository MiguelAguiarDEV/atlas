"use client";

import { useState, useEffect, useCallback } from "react";
import { TaskCard, type TaskData } from "@atlas/ui";
import { listTasks, updateTask } from "@/lib/api/tasks";
import { listProjects, type ApiProject } from "@/lib/api/projects";
import { toTaskData } from "@/lib/mappers";

type Filter = "all" | "inbox" | "in_progress" | "done";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "inbox", label: "Inbox" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

function filterTasks(tasks: TaskData[], filter: Filter): TaskData[] {
  if (filter === "all") return tasks;
  if (filter === "inbox") return tasks.filter((t) => t.status === "inbox");
  if (filter === "in_progress")
    return tasks.filter(
      (t) => t.status === "in_progress" || t.status === "ready",
    );
  if (filter === "done") return tasks.filter((t) => t.status === "done");
  return tasks;
}

export default function TasksPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksRes, projectsRes] = await Promise.all([
        listTasks({ limit: 100 }),
        listProjects(),
      ]);

      const pMap = new Map<number, ApiProject>();
      for (const p of projectsRes.data ?? []) {
        pMap.set(p.id, p);
      }

      setTasks((tasksRes.data ?? []).map((t) => toTaskData(t, pMap)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus = task.status === "done" ? "ready" : "done";
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
    );

    try {
      await updateTask(Number(id), { status: newStatus });
    } catch {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: task.status } : t)),
      );
    }
  };

  const filtered = filterTasks(tasks, activeFilter);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <header className="pb-4 pt-8">
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-[var(--atlas-muted)]">Loading...</p>
        </header>
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-[var(--atlas-surface)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <header className="pb-4 pt-8">
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        </header>
        <div className="rounded-xl bg-red-500/10 px-4 py-6 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 rounded-lg bg-[var(--atlas-accent)] px-4 py-2 text-sm text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-safe">
      {/* Header */}
      <header className="pb-4 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="mt-1 text-sm text-[var(--atlas-muted)]">
          {tasks.length} total &middot;{" "}
          {tasks.filter((t) => t.status === "done").length} completed
        </p>
      </header>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
              activeFilter === f.key
                ? "bg-[var(--atlas-accent)] text-white"
                : "bg-[var(--atlas-surface)] text-[var(--atlas-muted)] border border-[var(--atlas-border)]"
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs opacity-70">
              {filterTasks(tasks, f.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-2 pb-24">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium text-[var(--atlas-muted)]">
              No tasks here
            </p>
            <p className="mt-1 text-sm text-[var(--atlas-muted)]/60">
              {activeFilter === "done"
                ? "Nothing completed yet. Keep going!"
                : "All caught up. Nice work!"}
            </p>
          </div>
        ) : (
          filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={handleToggle}
              showProject
              showDueDate
            />
          ))
        )}
      </div>
    </div>
  );
}
