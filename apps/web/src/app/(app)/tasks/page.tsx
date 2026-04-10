"use client";

import { useState } from "react";
import { TaskCard, type TaskData } from "@atlas/ui";

type Filter = "all" | "inbox" | "in_progress" | "done";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "inbox", label: "Inbox" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

const MOCK_TASKS: TaskData[] = [
  {
    id: "t1",
    title: "Fix authentication middleware bug",
    priority: 0,
    estimatedMinutes: 60,
    project: "Atlas",
    dueDate: "Today",
    status: "in_progress",
  },
  {
    id: "t2",
    title: "Design onboarding flow wireframes",
    priority: 1,
    estimatedMinutes: 120,
    project: "Atlas",
    dueDate: "Tomorrow",
    status: "ready",
  },
  {
    id: "t3",
    title: "Migrate user data to new schema",
    priority: 0,
    estimatedMinutes: 180,
    project: "Backend",
    dueDate: "Apr 12",
    status: "ready",
  },
  {
    id: "t4",
    title: "Write API documentation for /tasks endpoint",
    priority: 1,
    estimatedMinutes: 45,
    project: "Atlas",
    dueDate: "Apr 11",
    status: "inbox",
  },
  {
    id: "t5",
    title: "Set up CI/CD pipeline for staging",
    priority: 2,
    estimatedMinutes: 90,
    project: "DevOps",
    dueDate: "Apr 14",
    status: "inbox",
  },
  {
    id: "t6",
    title: "Review pull request #42",
    priority: 2,
    estimatedMinutes: 30,
    project: "Atlas",
    dueDate: "Today",
    status: "in_progress",
  },
  {
    id: "t7",
    title: "Update dependencies to latest versions",
    priority: 3,
    estimatedMinutes: 15,
    project: "Atlas",
    status: "done",
  },
  {
    id: "t8",
    title: "Add dark mode toggle to settings",
    priority: 3,
    estimatedMinutes: 60,
    project: "Atlas",
    dueDate: "Apr 15",
    status: "inbox",
  },
  {
    id: "t9",
    title: "Configure PostgreSQL connection pooling",
    priority: 1,
    estimatedMinutes: 45,
    project: "Backend",
    status: "done",
  },
  {
    id: "t10",
    title: "Create habit tracking schema migration",
    priority: 2,
    estimatedMinutes: 30,
    project: "Backend",
    dueDate: "Apr 13",
    status: "ready",
  },
];

function filterTasks(tasks: TaskData[], filter: Filter): TaskData[] {
  if (filter === "all") return tasks;
  if (filter === "inbox") return tasks.filter((t) => t.status === "inbox");
  if (filter === "in_progress")
    return tasks.filter(
      (t) => t.status === "in_progress" || t.status === "ready"
    );
  if (filter === "done") return tasks.filter((t) => t.status === "done");
  return tasks;
}

export default function TasksPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [tasks, setTasks] = useState<TaskData[]>(MOCK_TASKS);

  const filtered = filterTasks(tasks, activeFilter);

  const handleToggle = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "done" ? "ready" : "done" }
          : t
      )
    );
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-safe">
      {/* Header */}
      <header className="pb-4 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="mt-1 text-sm text-[var(--atlas-muted)]">
          {tasks.length} total &middot; {tasks.filter((t) => t.status === "done").length} completed
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
