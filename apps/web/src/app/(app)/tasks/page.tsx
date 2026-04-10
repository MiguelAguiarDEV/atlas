"use client";

import { useState, useEffect, useCallback } from "react";
import { TaskCard, SearchIcon, ListIcon, type TaskData } from "@atlas/ui";
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
  const [searchQuery, setSearchQuery] = useState("");
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
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
    );

    try {
      await updateTask(Number(id), { status: newStatus });
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: task.status } : t)),
      );
    }
  };

  const filtered = filterTasks(tasks, activeFilter).filter((t) =>
    searchQuery
      ? t.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <header className="pb-4 pt-8">
          <h1 className="text-h1 text-[var(--foreground)]">Tasks</h1>
          <p className="mt-1 text-[13px] text-[var(--foreground-muted)]">
            Loading...
          </p>
        </header>
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[60px] skeleton"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <header className="pb-4 pt-8">
          <h1 className="text-h1 text-[var(--foreground)]">Tasks</h1>
        </header>
        <div className="glass-elevated px-4 py-8 text-center">
          <p className="text-[13px] text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 inline-flex items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_0_20px_var(--accent-glow)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
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
      <header className="pb-4 pt-8 animate-fade-in-up">
        <div className="flex items-baseline justify-between">
          <h1 className="text-h1 text-[var(--foreground)]">Tasks</h1>
          <span className="text-[13px] text-[var(--foreground-muted)] tabular-nums">
            {tasks.length} total
          </span>
        </div>
      </header>

      {/* Search bar */}
      <div className="pb-4 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <div
          className="flex items-center gap-2.5 rounded-[var(--radius)] px-3.5 py-2.5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04)",
          }}
        >
          <SearchIcon
            size={16}
            className="shrink-0 text-[var(--foreground-muted)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="flex-1 bg-transparent text-[13px] text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)]"
          />
        </div>
      </div>

      {/* Filter Pills */}
      <div
        className="flex gap-2 overflow-x-auto pb-5 scrollbar-none animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        {FILTERS.map((f) => {
          const count = filterTasks(tasks, f.key).length;
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`relative shrink-0 rounded-[var(--radius-full)] px-4 py-2 text-[13px] font-medium transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] min-h-[36px] ${
                isActive
                  ? "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border-highlight)]"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-transparent"
              }`}
              style={
                isActive
                  ? {
                      boxShadow:
                        "inset 0 1px 0 0 rgba(255,255,255,0.06)",
                    }
                  : undefined
              }
            >
              {f.label}
              <span className="ml-1.5 text-[11px] opacity-60 tabular-nums">
                {count}
              </span>
              {/* Active underline accent */}
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-[var(--accent)] shadow-[0_0_6px_var(--accent-glow)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-3 pb-24">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface)]">
              <ListIcon size={24} className="text-[var(--foreground-muted)]" />
            </div>
            <p className="text-h3 text-[var(--foreground-muted)]">
              No tasks here
            </p>
            <p className="mt-1.5 max-w-[240px] text-[13px] text-[var(--foreground-muted)] opacity-60">
              {activeFilter === "done"
                ? "Nothing completed yet. Keep going!"
                : searchQuery
                  ? "No tasks match your search."
                  : "All caught up. Nice work!"}
            </p>
          </div>
        ) : (
          filtered.map((task, i) => (
            <div
              key={task.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${150 + i * 40}ms` }}
            >
              <TaskCard
                task={task}
                onToggle={handleToggle}
                showProject
                showDueDate
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
