"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TaskDetailPanel,
  FilterBar,
  applyFilters,
  DEFAULT_FILTERS,
  type TaskData,
  type TaskFilters,
  type ProjectOption,
} from "@atlas/ui";
import { listTasks, updateTask } from "@/lib/api/tasks";
import { listProjects, type ApiProject } from "@/lib/api/projects";
import { toTaskData } from "@/lib/mappers";

const STATUSES = [
  { key: "inbox", label: "Inbox" },
  { key: "ready", label: "Ready" },
  { key: "in_progress", label: "In Progress" },
  { key: "in_review", label: "In Review" },
  { key: "done", label: "Done" },
];

const statusHeaderColor: Record<string, string> = {
  inbox: "var(--text-secondary)",
  ready: "#38bdf8",
  in_progress: "var(--accent)",
  in_review: "var(--warning)",
  done: "var(--success)",
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

function CompactCard({
  task,
  onClick,
}: {
  task: TaskData;
  onClick: () => void;
}) {
  const priorityDotColor: Record<number, string> = {
    0: "var(--destructive)",
    1: "var(--warning)",
    2: "var(--accent)",
    3: "var(--text-tertiary)",
  };

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "12px",
        cursor: "pointer",
        transition: "border-color 200ms cubic-bezier(0.16,1,0.3,1)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: task.status === "done" ? "var(--text-secondary)" : "var(--text-primary)",
          lineHeight: 1.4,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textDecoration: task.status === "done" ? "line-through" : "none",
        }}
      >
        {task.title}
      </div>

      {/* Bottom row: priority dot + project name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginTop: "8px",
        }}
      >
        <span
          className={task.priority === 0 ? "pulse-dot" : ""}
          style={{
            width: "8px",
            height: "8px",
            minWidth: "8px",
            borderRadius: "9999px",
            backgroundColor: priorityDotColor[task.priority] ?? "var(--text-tertiary)",
          }}
        />
        {task.project && (
          <span
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {task.project}
          </span>
        )}
      </div>
    </div>
  );
}

export default function BoardPage() {
  const isDesktop = useIsDesktop();
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({ ...DEFAULT_FILTERS });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksRes, projectsRes] = await Promise.all([
        listTasks({ limit: 200 }),
        listProjects(),
      ]);

      const pMap = new Map<number, ApiProject>();
      const projectList: ProjectOption[] = [];
      for (const p of projectsRes.data ?? []) {
        pMap.set(p.id, p);
        projectList.push({ id: p.id, name: p.name });
      }

      setProjects(projectList);
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

  const handleCardClick = (task: TaskData) => {
    setSelectedTask(task);
    setPanelOpen(true);
  };

  const handlePanelClose = () => {
    setPanelOpen(false);
  };

  const handleTaskUpdate = async (id: string, updates: Partial<TaskData>) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );
    if (selectedTask?.id === id) {
      setSelectedTask((prev) => (prev ? { ...prev, ...updates } : prev));
    }

    try {
      const apiUpdates: Record<string, unknown> = {};
      if (updates.status) apiUpdates.status = updates.status;
      if (updates.title) apiUpdates.title = updates.title;
      await updateTask(Number(id), apiUpdates);
    } catch {
      // Revert on error
      fetchData();
    }
  };

  // Apply filters, then group by status
  const filtered = applyFilters(tasks, filters);

  const grouped = new Map<string, TaskData[]>();
  for (const status of STATUSES) {
    grouped.set(status.key, []);
  }
  for (const task of filtered) {
    const key = task.status ?? "inbox";
    const list = grouped.get(key);
    if (list) {
      list.push(task);
    } else {
      // Tasks with unknown status go to inbox
      grouped.get("inbox")?.push(task);
    }
  }

  const containerPadding = isDesktop ? "0" : "0 0 120px 0";

  if (loading) {
    return (
      <div style={{ padding: isDesktop ? "0" : "24px 20px" }}>
        <header style={{ paddingBottom: "16px" }}>
          <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Board</h1>
          <p style={{ marginTop: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>
            Loading...
          </p>
        </header>
        <div style={{ display: "flex", gap: "12px" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ width: "280px", height: "200px", flexShrink: 0, animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: isDesktop ? "0" : "24px 20px" }}>
        <header style={{ paddingBottom: "16px" }}>
          <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Board</h1>
        </header>
        <div className="glass-elevated" style={{ padding: "32px 16px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>
            Something went wrong loading your tasks.
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "16px" }}>
            {error}
          </p>
          <button
            onClick={fetchData}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: 500,
              color: "white",
              background: "var(--accent)",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: containerPadding }}>
      {/* Filter bar above columns */}
      <div style={{ padding: isDesktop ? "0 0 16px 0" : "12px 20px 12px 20px" }}>
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          projects={projects}
          totalCount={tasks.length}
          filteredCount={filtered.length}
        />
      </div>

      {/* Board container */}
      <div
        className="scrollbar-none"
        style={{
          display: "flex",
          gap: "0",
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: isDesktop ? "none" : "x mandatory",
          WebkitOverflowScrolling: "touch",
          minHeight: isDesktop ? "calc(100dvh - 160px)" : "calc(100dvh - 240px)",
        }}
      >
        {STATUSES.map((status, colIdx) => {
          const columnTasks = grouped.get(status.key) ?? [];
          return (
            <div
              key={status.key}
              style={{
                width: "280px",
                minWidth: "280px",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                scrollSnapAlign: "start",
                background: "var(--bg-base)",
                borderRight: colIdx < STATUSES.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              {/* Column header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 12px 12px 12px",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "9999px",
                      backgroundColor: statusHeaderColor[status.key] ?? "var(--text-secondary)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {status.label}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--text-tertiary)",
                    background: "rgba(255,255,255,0.04)",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {columnTasks.length}
                </span>
              </div>

              {/* Card list */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "0 12px 12px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {columnTasks.length === 0 ? (
                  <div
                    style={{
                      padding: "24px 12px",
                      textAlign: "center",
                      fontSize: "12px",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No tasks
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <CompactCard
                      key={task.id}
                      task={task}
                      onClick={() => handleCardClick(task)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      <TaskDetailPanel
        task={selectedTask}
        open={panelOpen}
        onClose={handlePanelClose}
        onUpdate={handleTaskUpdate}
      />
    </div>
  );
}
