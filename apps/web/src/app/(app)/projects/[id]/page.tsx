"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TaskCard, ArrowLeftIcon, FolderIcon, useIsDesktop, type TaskData } from "@atlas/ui";
import { getProject, type ApiProject } from "@/lib/api/projects";
import { listTasks, updateTask, type ApiTask } from "@/lib/api/tasks";
import { toTaskData } from "@/lib/mappers";

function normalizeProjectColor(raw: string | null | undefined): string {
  if (!raw) return "#5E6AD2";
  if (raw.toLowerCase() === "#3b82f6") return "#5E6AD2";
  return raw;
}

type ViewMode = "list" | "board";
type StatusGroup = "inbox" | "ready" | "in_progress" | "done";

const STATUS_LABELS: Record<StatusGroup, string> = {
  inbox: "Inbox",
  ready: "Ready",
  in_progress: "In Progress",
  done: "Done",
};

const STATUS_COLORS: Record<StatusGroup, string> = {
  inbox: "var(--text-tertiary)",
  ready: "var(--accent)",
  in_progress: "var(--warning)",
  done: "var(--success)",
};

const STATUS_ORDER: StatusGroup[] = ["inbox", "ready", "in_progress", "done"];

function groupByStatus(tasks: TaskData[]): Record<StatusGroup, TaskData[]> {
  const groups: Record<StatusGroup, TaskData[]> = {
    inbox: [],
    ready: [],
    in_progress: [],
    done: [],
  };
  for (const t of tasks) {
    const status = (t.status || "inbox") as StatusGroup;
    if (groups[status]) {
      groups[status].push(t);
    } else {
      groups.inbox.push(t);
    }
  }
  return groups;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const isDesktop = useIsDesktop();

  const [project, setProject] = useState<ApiProject | null>(null);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [projectRes, tasksRes] = await Promise.all([
        getProject(projectId),
        listTasks({ project_id: projectId, limit: 200 }),
      ]);

      const pMap = new Map<number, ApiProject>();
      pMap.set(projectRes.data.id, projectRes.data);

      setProject(projectRes.data);
      setTasks((tasksRes.data ?? []).map((t) => toTaskData(t, pMap)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

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

  const containerStyle: React.CSSProperties = isDesktop
    ? {}
    : { padding: "24px 20px 120px 20px", maxWidth: "512px", margin: "0 auto" };

  // Loading state
  if (loading) {
    return (
      <div style={containerStyle}>
        <header style={{ paddingBottom: "24px" }}>
          <Link href="/projects" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-secondary)", textDecoration: "none", marginBottom: "16px" }}>
            <ArrowLeftIcon size={16} /> Back to projects
          </Link>
          <div className="skeleton" style={{ height: "28px", width: "200px", marginTop: "8px" }} />
        </header>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: "60px", animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div style={containerStyle}>
        <header style={{ paddingBottom: "24px" }}>
          <Link href="/projects" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-secondary)", textDecoration: "none", marginBottom: "16px" }}>
            <ArrowLeftIcon size={16} /> Back to projects
          </Link>
          <h1 className="text-h1" style={{ color: "var(--text-primary)", marginTop: "8px" }}>Project</h1>
        </header>
        <div className="glass-elevated" style={{ padding: "32px 16px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>
            {error || "Project not found."}
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

  const color = normalizeProjectColor(project.color);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const overdueTasks = 0; // Would need due_at comparison; kept for future
  const percent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const statusGroups = groupByStatus(tasks);

  // Stats bar
  const statItems = [
    { label: "Total", value: totalTasks, color: "var(--text-primary)" },
    { label: "Done", value: doneTasks, color: "var(--success)" },
    { label: "In Progress", value: inProgressTasks, color: "var(--warning)" },
    { label: "Overdue", value: overdueTasks, color: "var(--destructive)" },
  ];

  // View toggle
  const viewToggle = (
    <div style={{ display: "flex", gap: "4px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "10px", padding: "4px" }}>
      {(["list", "board"] as ViewMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          style={{
            padding: "11px 18px",
            minHeight: "44px",
            fontSize: "13px",
            fontWeight: 600,
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            background: viewMode === mode ? "var(--bg-surface)" : "transparent",
            color: viewMode === mode ? "var(--text-primary)" : "var(--text-secondary)",
            transition: "all 150ms ease",
          }}
        >
          {mode === "list" ? "List" : "Board"}
        </button>
      ))}
    </div>
  );

  // Board view
  const boardView = (
    <div style={{
      display: "grid",
      gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)",
      gap: "12px",
    }}>
      {STATUS_ORDER.map((status) => (
        <div key={status} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Column header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            paddingBottom: "10px",
            borderBottom: "1px solid var(--border)",
          }}>
            <span style={{
              width: "6px",
              height: "6px",
              borderRadius: "9999px",
              background: STATUS_COLORS[status],
              flexShrink: 0,
            }} />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {STATUS_LABELS[status]}
            </span>
            <span style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              background: "var(--bg-surface)",
              padding: "2px 8px",
              borderRadius: "9999px",
              fontVariantNumeric: "tabular-nums",
            }}>
              {statusGroups[status].length}
            </span>
          </div>

          {/* Cards */}
          {statusGroups[status].map((task, i) => (
            <div
              key={task.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${50 + i * 30}ms` }}
            >
              <TaskCard task={task} onToggle={handleToggle} showDueDate />
            </div>
          ))}
          {statusGroups[status].length === 0 && (
            <div style={{
              padding: "24px 12px",
              textAlign: "center",
              fontSize: "12px",
              color: "var(--text-tertiary)",
              background: "var(--bg-elevated)",
              borderRadius: "10px",
              border: "1px solid var(--border)",
            }}>
              No tasks
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // List view
  const listView = tasks.length === 0 ? (
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
        <FolderIcon size={24} style={{ color: "var(--text-secondary)" }} />
      </div>
      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>
        No tasks in this project
      </p>
      <p style={{ marginTop: "6px", maxWidth: "240px", fontSize: "12px", color: "var(--text-tertiary)" }}>
        Add tasks to this project from the Tasks page.
      </p>
    </div>
  ) : (
    <div style={{
      display: isDesktop ? "grid" : "flex",
      gridTemplateColumns: isDesktop ? "repeat(2, 1fr)" : undefined,
      flexDirection: isDesktop ? undefined : "column",
      gap: "12px",
    }}>
      {tasks.map((task, i) => (
        <div
          key={task.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${100 + i * 40}ms` }}
        >
          <TaskCard task={task} onToggle={handleToggle} showDueDate />
        </div>
      ))}
    </div>
  );

  return (
    <div className="animate-fade-in" style={containerStyle}>
      {/* Back link */}
      <Link
        href="/projects"
        className="animate-fade-in"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "13px",
          color: "var(--text-secondary)",
          textDecoration: "none",
          marginBottom: "16px",
          transition: "color 150ms ease",
        }}
      >
        <ArrowLeftIcon size={16} /> Back to projects
      </Link>

      {/* Header */}
      <header className="animate-fade-in-up" style={{ paddingBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          {/* Color indicator */}
          <div style={{
            width: "12px",
            height: "12px",
            borderRadius: "9999px",
            background: color,
            flexShrink: 0,
          }} />
          <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>
            {project.name}
          </h1>
        </div>
        {project.description && (
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {project.description}
          </p>
        )}
      </header>

      {/* Stats bar */}
      <div
        className="animate-fade-in-up"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          paddingBottom: "24px",
        }}
      >
        {statItems.map((item) => (
          <div
            key={item.label}
            className="glass-elevated"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              padding: "12px 8px",
            }}
          >
            <span style={{
              fontSize: "22px",
              fontWeight: 600,
              color: item.color,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
            }}>
              {item.value}
            </span>
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="animate-fade-in-up" style={{ paddingBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>Progress</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: color, fontVariantNumeric: "tabular-nums" }}>{percent}%</span>
          </div>
          <div style={{
            width: "100%",
            height: "6px",
            borderRadius: "9999px",
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}>
            <div style={{
              width: `${percent}%`,
              height: "100%",
              borderRadius: "9999px",
              background: color,
              transition: "width 300ms cubic-bezier(0.16,1,0.3,1)",
            }} />
          </div>
        </div>
      )}

      {/* View toggle + task count */}
      <div
        className="animate-fade-in-up"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "20px",
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
          Tasks
          <span style={{
            marginLeft: "8px",
            fontSize: "12px",
            fontWeight: 600,
            background: "var(--bg-surface)",
            color: "var(--text-secondary)",
            padding: "2px 8px",
            borderRadius: "9999px",
          }}>
            {totalTasks}
          </span>
        </span>
        {viewToggle}
      </div>

      {/* Task content */}
      {viewMode === "board" ? boardView : listView}
    </div>
  );
}
