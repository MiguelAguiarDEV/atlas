"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { TaskCard, TaskDetailPanel, SearchIcon, ListIcon, BoardIcon, FilterBar, NewTaskForm, PlusIcon, applyFilters, DEFAULT_FILTERS, useIsDesktop, type TaskData, type TaskComment, type TaskFilters, type ProjectOption, type NewTaskFormValues } from "@atlas/ui";
import { listTasks, createTask, updateTask, deleteTask, getTask, createTaskEvent, listTaskEvents } from "@/lib/api/tasks";
import { listProjects, type ApiProject } from "@/lib/api/projects";
import { toTaskData, toPriorityString } from "@/lib/mappers";
import Link from "next/link";

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
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [submittingNewTask, setSubmittingNewTask] = useState(false);

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

  const handleTaskDelete = async (id: string) => {
    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setPanelOpen(false);
    setSelectedTask(null);
    try {
      await deleteTask(Number(id));
    } catch (err) {
      console.error("Failed to delete task:", err);
      setTasks(previous);
    }
  };

  const handleCreateTask = async (values: NewTaskFormValues) => {
    setSubmittingNewTask(true);
    try {
      await createTask({
        title: values.title,
        description: values.description,
        project_id: values.project_id,
        priority: values.priority,
        status: values.status,
        energy: values.energy,
        estimated_mins: values.estimated_mins,
        task_type: values.task_type,
        context_tags: values.context_tags,
        due_at: values.due_at,
      });
      setShowNewTaskForm(false);
      await fetchData();
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setSubmittingNewTask(false);
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
        <header style={{ paddingBottom: "24px" }}>
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
        <header style={{ paddingBottom: "24px" }}>
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
              outline: "1px solid var(--accent)",
              outlineOffset: "2px",
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
  const segmentMinHeight = isDesktop ? "40px" : "44px";
  const viewToggle = (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "10px", padding: "4px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          padding: "8px 14px",
          minHeight: segmentMinHeight,
          fontSize: "13px",
          fontWeight: 600,
          borderRadius: "8px",
          background: "var(--bg-surface)",
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
          padding: "8px 14px",
          minHeight: segmentMinHeight,
          fontSize: "13px",
          fontWeight: 600,
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
    <header className="animate-fade-in-up" style={{ paddingBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Tasks</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--text-secondary)",
            fontVariantNumeric: "tabular-nums",
            padding: "4px 10px",
            borderRadius: "9999px",
            background: "var(--bg-surface)",
          }}>
            {tasks.length} total
          </span>
          <button
            onClick={() => setShowNewTaskForm(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "11px 16px",
              minHeight: "44px",
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
            <PlusIcon size={16} />
            New Task
          </button>
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
        width: isDesktop ? "320px" : "100%",
        maxWidth: "100%",
        flexShrink: 0,
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
      style={{ animationDelay: `${80 + Math.min(i, 11) * 30}ms` }}
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

      {/* Task list — mobile: single column stack; desktop: responsive auto-fit grid */}
      {filtered.length === 0 ? (
        emptyState
      ) : isDesktop ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "12px",
            alignItems: "start",
          }}
        >
          {taskCards}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
        onDelete={handleTaskDelete}
        comments={taskComments}
        description={taskDescription}
      />

      {/* New Task Form */}
      <NewTaskForm
        open={showNewTaskForm}
        projects={projectOptions}
        submitting={submittingNewTask}
        onCancel={() => setShowNewTaskForm(false)}
        onSubmit={handleCreateTask}
      />
    </div>
  );
}
