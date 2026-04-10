"use client";

import { useState, useEffect, useCallback } from "react";
import { TaskCard, TaskDetailPanel, SearchIcon, ListIcon, BoardIcon, FilterBar, applyFilters, DEFAULT_FILTERS, type TaskData, type TaskComment, type TaskFilters, type ProjectOption } from "@atlas/ui";
import { listTasks, updateTask, getTask, createTaskEvent, listTaskEvents } from "@/lib/api/tasks";
import { listProjects, type ApiProject } from "@/lib/api/projects";
import { toTaskData, toPriorityString } from "@/lib/mappers";
import Link from "next/link";

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

export default function TasksPage() {
  const isDesktop = useIsDesktop();
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [taskDescription, setTaskDescription] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksRes, projectsRes] = await Promise.all([
        listTasks({ limit: 100 }),
        listProjects(),
      ]);

      const projectList = projectsRes.data ?? [];
      const pMap = new Map<number, ApiProject>();
      for (const p of projectList) {
        pMap.set(p.id, p);
      }

      setProjectOptions(projectList.map((p) => ({ id: p.id, name: p.name })));
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

    // Fetch task details and comments in parallel
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

  const handleTaskUpdate = async (id: string, updates: Partial<TaskData>) => {
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
      fetchData();
    }
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
    // Optimistic update
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

  const filtered = applyFilters(tasks, filters);

  const containerStyle: React.CSSProperties = isDesktop
    ? {}
    : { padding: "24px 20px 120px 20px", maxWidth: "512px", margin: "0 auto" };

  // Loading state
  if (loading) {
    return (
      <div style={containerStyle}>
        <header style={{ paddingBottom: "16px" }}>
          <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Tasks</h1>
          <p style={{ marginTop: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>
            Loading...
          </p>
        </header>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: "60px", animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state (P1-09)
  if (error) {
    return (
      <div style={containerStyle}>
        <header style={{ paddingBottom: "16px" }}>
          <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Tasks</h1>
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
              boxShadow: "0 0 20px var(--accent-glow)",
              transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* Shared pieces */
  const viewToggle = (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "10px", padding: "3px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          padding: "6px 12px",
          minHeight: "32px",
          fontSize: "13px",
          fontWeight: 600,
          borderRadius: "8px",
          background: "var(--bg-elevated)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-hover)",
          cursor: "default",
        }}
      >
        <ListIcon size={14} />
        List
      </div>
      <Link
        href="/tasks/board"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          padding: "6px 12px",
          minHeight: "32px",
          fontSize: "13px",
          fontWeight: 500,
          borderRadius: "8px",
          background: "transparent",
          color: "var(--text-secondary)",
          border: "1px solid transparent",
          cursor: "pointer",
          textDecoration: "none",
          transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <BoardIcon size={14} />
        Board
      </Link>
    </div>
  );

  const headerBlock = (
    <header className="animate-fade-in-up" style={{ paddingBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Tasks</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
            {tasks.length} total
          </span>
          {viewToggle}
        </div>
      </div>
    </header>
  );

  const searchInput = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "0 14px",
        minHeight: "44px",
        flex: isDesktop ? "0 0 320px" : undefined,
      }}
    >
      <SearchIcon
        size={16}
        style={{ flexShrink: 0, color: "var(--text-secondary)" }}
      />
      <input
        type="text"
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        placeholder="Search tasks..."
        style={{
          flex: 1,
          minHeight: "44px",
          background: "transparent",
          fontSize: "14px",
          color: "var(--text-primary)",
          border: "none",
          outline: "none",
        }}
      />
    </div>
  );

  const emptyState = (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", textAlign: "center" }}>
      <div style={{
        width: "56px",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "9999px",
        background: "var(--bg-elevated)",
        marginBottom: "16px",
      }}>
        <ListIcon size={24} style={{ color: "var(--text-secondary)" }} />
      </div>
      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>
        No tasks here
      </p>
      <p style={{ marginTop: "6px", maxWidth: "240px", fontSize: "12px", color: "var(--text-tertiary)" }}>
        {filters.statuses.includes("done")
          ? "Nothing completed yet. Keep going!"
          : filters.search
            ? "No tasks match your search."
            : "All caught up. Nice work!"}
      </p>
    </div>
  );

  const taskCards = filtered.map((task, i) => (
    <div
      key={task.id}
      className="animate-fade-in-up"
      style={{ animationDelay: `${150 + i * 40}ms` }}
      onClick={() => handleCardClick(task)}
    >
      <TaskCard
        task={task}
        onToggle={handleToggle}
        showProject
        showDueDate
      />
    </div>
  ));

  /* P1-06: Single component tree that adapts via isDesktop */
  return (
    <div className="animate-fade-in" style={containerStyle}>
      {headerBlock}

      {/* Toolbar: search + filters */}
      <div
        className="animate-fade-in-up"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          paddingBottom: "24px",
        }}
      >
        {searchInput}
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          projects={projectOptions}
          totalCount={tasks.length}
          filteredCount={filtered.length}
        />
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        emptyState
      ) : isDesktop ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
          {taskCards}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {taskCards}
        </div>
      )}

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
