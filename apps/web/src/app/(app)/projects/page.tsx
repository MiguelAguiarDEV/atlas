"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FolderIcon, PlusIcon, EditIcon, TrashIcon, EditProjectForm, ConfirmDialog, useIsDesktop, type EditProjectValues } from "@atlas/ui";
import { listProjects, createProject, updateProject, deleteProject, type ApiProject } from "@/lib/api/projects";
import { listTasks } from "@/lib/api/tasks";

interface ProjectStats {
  total: number;
  done: number;
  percent: number;
}

// Brief-compliant palette only. #3B82F6 (blue) is forbidden per design brief (restrained accent rule).
const PRESET_COLORS = ["#5E6AD2", "#2AF598", "#F5A524", "#E5484D", "#8B5CF6"];

// Accent fallback that tolerates legacy #3B82F6 rows coming from seed data.
function normalizeProjectColor(raw: string | null | undefined): string {
  if (!raw) return "#5E6AD2";
  if (raw.toLowerCase() === "#3b82f6") return "#5E6AD2";
  return raw;
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProjectsPage() {
  const isDesktop = useIsDesktop();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [tasksByProject, setTasksByProject] = useState<Map<number, ProjectStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  // Edit / delete state
  const [editingProject, setEditingProject] = useState<ApiProject | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingProject, setDeletingProject] = useState<ApiProject | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [projectsRes, tasksRes] = await Promise.all([
        listProjects(),
        listTasks({ limit: 500 }),
      ]);

      const projectsList = projectsRes.data ?? [];
      const tasksList = tasksRes.data ?? [];

      // Build stats per project
      const statsMap = new Map<number, ProjectStats>();
      for (const p of projectsList) {
        statsMap.set(p.id, { total: 0, done: 0, percent: 0 });
      }
      for (const t of tasksList) {
        if (t.project_id && statsMap.has(t.project_id)) {
          const s = statsMap.get(t.project_id)!;
          s.total++;
          if (t.status === "done") s.done++;
        }
      }
      for (const [, s] of statsMap) {
        s.percent = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
      }

      setProjects(projectsList);
      setTasksByProject(statsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    try {
      setCreating(true);
      const res = await createProject({ name: newName.trim(), color: newColor });
      setProjects((prev) => [...prev, res.data]);
      setTasksByProject((prev) => {
        const next = new Map(prev);
        next.set(res.data.id, { total: 0, done: 0, percent: 0 });
        return next;
      });
      setNewName("");
      setNewColor(PRESET_COLORS[0]);
      setShowCreate(false);
    } catch {
      // stay on form so user can retry
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (values: EditProjectValues) => {
    if (!editingProject) return;
    setSavingEdit(true);
    try {
      const res = await updateProject(editingProject.id, {
        name: values.name,
        description: values.description,
        color: values.color,
      });
      setProjects((prev) =>
        prev.map((p) => (p.id === editingProject.id ? res.data : p)),
      );
      setEditingProject(null);
    } catch (err) {
      console.error("Failed to update project:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProject) return;
    setDeletingLoading(true);
    try {
      await deleteProject(deletingProject.id);
      setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id));
      setDeletingProject(null);
    } catch (err) {
      console.error("Failed to delete project:", err);
    } finally {
      setDeletingLoading(false);
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
          <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Projects</h1>
          <p style={{ marginTop: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>
            Loading...
          </p>
        </header>
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)", gap: "12px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: "120px", animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={containerStyle}>
        <header style={{ paddingBottom: "24px" }}>
          <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Projects</h1>
        </header>
        <div className="glass-elevated" style={{ padding: "32px 16px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>
            Something went wrong loading your projects.
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

  const createForm = showCreate ? (
    <div
      className="animate-fade-in-up glass-elevated"
      style={{
        padding: "20px",
        marginBottom: "24px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Project name..."
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
            if (e.key === "Escape") setShowCreate(false);
          }}
          style={{
            width: "100%",
            minHeight: "44px",
            padding: "0 14px",
            fontSize: "14px",
            color: "var(--text-primary)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            outline: "none",
          }}
        />
        {/* Color picker */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Color:</span>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              aria-label={`Pick color ${c}`}
              style={{
                width: "44px",
                height: "44px",
                minWidth: "44px",
                minHeight: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "9999px",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: "28px",
                  height: "28px",
                  borderRadius: "9999px",
                  background: c,
                  border: newColor === c ? "2px solid var(--text-primary)" : "2px solid transparent",
                  transition: "all 150ms ease",
                }}
              />
            </button>
          ))}
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={() => setShowCreate(false)}
            style={{
              padding: "11px 16px",
              minHeight: "44px",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text-secondary)",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            style={{
              padding: "11px 16px",
              minHeight: "44px",
              fontSize: "13px",
              fontWeight: 500,
              color: "white",
              background: newName.trim() ? "var(--accent)" : "var(--bg-surface)",
              border: "none",
              borderRadius: "10px",
              cursor: newName.trim() ? "pointer" : "default",
              opacity: creating ? 0.6 : 1,
              transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

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
        <FolderIcon size={24} style={{ color: "var(--text-secondary)" }} />
      </div>
      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>
        No projects yet
      </p>
      <p style={{ marginTop: "6px", maxWidth: "240px", fontSize: "12px", color: "var(--text-tertiary)" }}>
        Create your first project to organize tasks.
      </p>
    </div>
  );

  const projectCards = projects.map((project, i) => {
    const stats = tasksByProject.get(project.id) ?? { total: 0, done: 0, percent: 0 };
    const color = normalizeProjectColor(project.color);
    return (
      <div
        key={project.id}
        className="glass-elevated animate-fade-in-up"
        style={{
          display: "flex",
          overflow: "hidden",
          borderRadius: "10px",
          animationDelay: `${50 + i * 40}ms`,
          position: "relative",
        }}
      >
        {/* Left accent bar */}
        <div style={{ width: "4px", flexShrink: 0, background: color }} />

        {/* Card content (clickable link) */}
        <Link
          href={`/projects/${project.id}`}
          style={{
            flex: 1,
            padding: "14px 16px 14px 13px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            textDecoration: "none",
            color: "inherit",
            minWidth: 0,
          }}
        >
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {project.name}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)", letterSpacing: "0.01em", flexShrink: 0 }}>
              {formatRelativeDate(project.updated_at)}
            </span>
          </div>

          {/* Stats row */}
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            {stats.total} tasks{" "}
            {stats.total > 0 && (
              <>
                &middot; {stats.done} done &middot; {stats.percent}%
              </>
            )}
          </span>

          {/* Progress bar */}
          {stats.total > 0 && (
            <div style={{
              width: "100%",
              height: "4px",
              borderRadius: "9999px",
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${stats.percent}%`,
                height: "100%",
                borderRadius: "9999px",
                background: color,
                transition: "width 300ms cubic-bezier(0.16,1,0.3,1)",
              }} />
            </div>
          )}
        </Link>

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            padding: "8px 8px 8px 0",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setEditingProject(project)}
            aria-label={`Edit ${project.name}`}
            style={{
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              borderRadius: "8px",
            }}
          >
            <EditIcon size={16} />
          </button>
          <button
            onClick={() => setDeletingProject(project)}
            aria-label={`Delete ${project.name}`}
            style={{
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              color: "var(--destructive)",
              cursor: "pointer",
              borderRadius: "8px",
            }}
          >
            <TrashIcon size={16} />
          </button>
        </div>
      </div>
    );
  });

  return (
    <div className="animate-fade-in" style={containerStyle}>
      {/* Header */}
      <header className="animate-fade-in-up" style={{ paddingBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Projects</h1>
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>
              {projects.length} project{projects.length !== 1 ? "s" : ""}
            </span>
          </div>
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
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
              New Project
            </button>
          )}
        </div>
      </header>

      {/* Create form */}
      {createForm}

      {/* Project grid */}
      {projects.length === 0 ? (
        emptyState
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: isDesktop ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
          gap: "12px",
        }}>
          {projectCards}
        </div>
      )}

      {/* Edit project form */}
      <EditProjectForm
        open={editingProject !== null}
        initial={{
          name: editingProject?.name ?? "",
          description: editingProject?.description ?? "",
          color: normalizeProjectColor(editingProject?.color),
        }}
        submitting={savingEdit}
        onCancel={() => setEditingProject(null)}
        onSubmit={handleEditSubmit}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deletingProject !== null}
        title="Delete project?"
        message={
          deletingProject
            ? `Delete "${deletingProject.name}"? Its tasks will become orphaned. This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        loading={deletingLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingProject(null)}
      />
    </div>
  );
}
