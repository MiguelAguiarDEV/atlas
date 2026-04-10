"use client";

import { useState, useEffect, useCallback } from "react";
import { TaskCard, TaskDetailPanel, SearchIcon, ListIcon, BoardIcon, type TaskData } from "@atlas/ui";
import { listTasks, updateTask } from "@/lib/api/tasks";
import { listProjects, type ApiProject } from "@/lib/api/projects";
import { toTaskData } from "@/lib/mappers";
import Link from "next/link";

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
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

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

  const handleCardClick = (task: TaskData) => {
    setSelectedTask(task);
    setPanelOpen(true);
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
      await updateTask(Number(id), apiUpdates);
    } catch {
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

  const filtered = filterTasks(tasks, activeFilter).filter((t) =>
    searchQuery
      ? t.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

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
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
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

  const filterPills = FILTERS.map((f) => {
    const count = filterTasks(tasks, f.key).length;
    const isActive = activeFilter === f.key;
    return (
      <button
        key={f.key}
        onClick={() => setActiveFilter(f.key)}
        style={{
          flexShrink: 0,
          padding: "8px 16px",
          minHeight: "44px",
          fontSize: "13px",
          fontWeight: 500,
          borderRadius: "9999px",
          border: isActive ? "1px solid var(--border-hover)" : "1px solid transparent",
          background: isActive ? "var(--bg-elevated)" : "transparent",
          color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
          cursor: "pointer",
          transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
          position: "relative" as const,
        }}
      >
        {f.label}
        <span style={{ marginLeft: "6px", fontSize: "12px", opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>
          {count}
        </span>
      </button>
    );
  });

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
        {activeFilter === "done"
          ? "Nothing completed yet. Keep going!"
          : searchQuery
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
          flexDirection: isDesktop ? "row" : "column",
          alignItems: isDesktop ? "center" : "stretch",
          gap: isDesktop ? "16px" : "12px",
          paddingBottom: "24px",
        }}
      >
        {searchInput}
        <div className="scrollbar-none" style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
          {filterPills}
        </div>
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
      />
    </div>
  );
}
