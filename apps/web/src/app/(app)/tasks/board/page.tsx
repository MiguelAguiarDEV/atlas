"use client";

import { useState, useEffect, useCallback, useRef, type DragEvent } from "react";
import { TaskDetailPanel, type TaskData, type TaskComment } from "@atlas/ui";
import { listTasks, updateTask, getTask, createTaskEvent, listTaskEvents } from "@/lib/api/tasks";
import { listProjects, type ApiProject } from "@/lib/api/projects";
import { toTaskData, toPriorityString } from "@/lib/mappers";

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
  isDesktop,
  onDragStart,
  onDragEnd,
  onStatusChange,
}: {
  task: TaskData;
  onClick: () => void;
  isDesktop: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>, task: TaskData) => void;
  onDragEnd: (e: DragEvent<HTMLDivElement>) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
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
      draggable={isDesktop}
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "12px",
        cursor: isDesktop ? "grab" : "pointer",
        transition: "border-color 200ms cubic-bezier(0.16,1,0.3,1), opacity 200ms ease",
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

      {/* Bottom row: priority dot + project name + mobile status selector */}
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
              flex: 1,
            }}
          >
            {task.project}
          </span>
        )}
        {/* Mobile-only status dropdown */}
        {!isDesktop && onStatusChange && (
          <select
            value={task.status ?? "inbox"}
            onChange={(e) => {
              e.stopPropagation();
              onStatusChange(task.id, e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              marginLeft: "auto",
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--text-secondary)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "4px 6px",
              cursor: "pointer",
              appearance: "auto",
              minWidth: "44px",
              minHeight: "28px",
            }}
          >
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

export default function BoardPage() {
  const isDesktop = useIsDesktop();
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [taskDescription, setTaskDescription] = useState<string>("");

  // Drag-and-drop state
  const draggedTaskRef = useRef<TaskData | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksRes, projectsRes] = await Promise.all([
        listTasks({ limit: 200 }),
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

  const handleCardClick = async (task: TaskData) => {
    setSelectedTask(task);
    setPanelOpen(true);
    setTaskComments([]);
    setTaskDescription("");

    try {
      const [taskRes, eventsRes] = await Promise.all([
        getTask(Number(task.id)),
        listTaskEvents(Number(task.id)).catch(() => ({ data: [] as { id: number; task_id: number; event_type: string; payload: Record<string, unknown>; created_at: string }[] })),
      ]);
      setTaskDescription(taskRes.data.description ?? "");
      const comments: TaskComment[] = (eventsRes.data ?? [])
        .filter((e) => e.event_type === "comment")
        .map((e) => ({
          id: e.id,
          text: (e.payload?.text as string) ?? "",
          created_at: e.created_at,
        }));
      setTaskComments(comments);
    } catch (err) {
      console.error("Failed to load task details:", err);
    }
  };

  const handlePanelClose = () => {
    setPanelOpen(false);
  };

  const handleDescriptionSave = async (id: string, description: string) => {
    try {
      await updateTask(Number(id), { description });
    } catch (err) {
      console.error("Failed to save description:", err);
    }
  };

  const handleCommentAdd = async (id: string, text: string) => {
    try {
      const res = await createTaskEvent(Number(id), "comment", { text });
      setTaskComments((prev) => [
        ...prev,
        { id: res.data.id, text, created_at: res.data.created_at },
      ]);
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handlePriorityChange = async (id: string, priority: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, priority: priority as 0 | 1 | 2 | 3 } : t)),
    );
    if (selectedTask?.id === id) {
      setSelectedTask((prev) => (prev ? { ...prev, priority: priority as 0 | 1 | 2 | 3 } : prev));
    }
    try {
      await updateTask(Number(id), { priority: toPriorityString(priority) });
    } catch (err) {
      console.error("Failed to update priority:", err);
      fetchData();
    }
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
      if (updates.priority !== undefined) apiUpdates.priority = toPriorityString(updates.priority);
      await updateTask(Number(id), apiUpdates);
    } catch {
      // Revert on error
      fetchData();
    }
  };

  // --- Drag-and-drop handlers (desktop) ---
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, task: TaskData) => {
      draggedTaskRef.current = task;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", task.id);
      // Visual: reduce opacity on the dragged card
      requestAnimationFrame(() => {
        (e.target as HTMLElement).style.opacity = "0.5";
      });
    },
    [],
  );

  const handleDragEnd = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      (e.target as HTMLElement).style.opacity = "1";
      draggedTaskRef.current = null;
      setDragOverColumn(null);
    },
    [],
  );

  const handleColumnDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>, statusKey: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverColumn(statusKey);
    },
    [],
  );

  const handleColumnDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      // Only clear if we actually left the column (not entering a child)
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDragOverColumn(null);
      }
    },
    [],
  );

  const handleColumnDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, targetStatus: string) => {
      e.preventDefault();
      setDragOverColumn(null);
      const task = draggedTaskRef.current;
      if (!task || task.status === targetStatus) return;
      // Use the existing handleTaskUpdate for optimistic update + API call
      handleTaskUpdate(task.id, { status: targetStatus });
    },
    [handleTaskUpdate],
  );

  // --- Mobile status change handler ---
  const handleMobileStatusChange = useCallback(
    (taskId: string, newStatus: string) => {
      handleTaskUpdate(taskId, { status: newStatus });
    },
    [handleTaskUpdate],
  );

  // Group tasks by status
  const grouped = new Map<string, TaskData[]>();
  for (const status of STATUSES) {
    grouped.set(status.key, []);
  }
  for (const task of tasks) {
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
          minHeight: isDesktop ? "calc(100dvh - 100px)" : "calc(100dvh - 180px)",
        }}
      >
        {STATUSES.map((status, colIdx) => {
          const columnTasks = grouped.get(status.key) ?? [];
          const isDragOver = dragOverColumn === status.key;
          return (
            <div
              key={status.key}
              onDragOver={(e) => handleColumnDragOver(e, status.key)}
              onDragLeave={handleColumnDragLeave}
              onDrop={(e) => handleColumnDrop(e, status.key)}
              style={{
                width: "280px",
                minWidth: "280px",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                scrollSnapAlign: "start",
                background: isDragOver ? "rgba(94,106,210,0.05)" : "var(--bg-base)",
                borderRight: colIdx < STATUSES.length - 1 ? "1px solid var(--border)" : "none",
                border: isDragOver ? "2px dashed var(--accent)" : undefined,
                borderRadius: isDragOver ? "8px" : undefined,
                transition: "background 150ms ease, border 150ms ease",
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
                  minHeight: "60px",
                }}
              >
                {columnTasks.length === 0 ? (
                  <div
                    style={{
                      padding: "24px 12px",
                      textAlign: "center",
                      fontSize: "12px",
                      color: isDragOver ? "var(--accent)" : "var(--text-tertiary)",
                      transition: "color 150ms ease",
                    }}
                  >
                    {isDragOver ? "Drop here" : "No tasks"}
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <CompactCard
                      key={task.id}
                      task={task}
                      isDesktop={isDesktop}
                      onClick={() => handleCardClick(task)}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onStatusChange={handleMobileStatusChange}
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
        onDescriptionSave={handleDescriptionSave}
        onCommentAdd={handleCommentAdd}
        onPriorityChange={handlePriorityChange}
        comments={taskComments}
        description={taskDescription}
      />
    </div>
  );
}
