"use client";

import { useState, useEffect } from "react";
import type { ProjectOption } from "./filter-bar";

export interface NewTaskFormValues {
  title: string;
  description?: string;
  project_id?: number;
  priority?: string;
  status?: string;
  energy?: string;
  estimated_mins?: number;
  task_type?: string;
  context_tags?: string[];
  due_at?: string;
}

interface NewTaskFormProps {
  open: boolean;
  projects: ProjectOption[];
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: NewTaskFormValues) => void;
}

const STATUS_OPTIONS = [
  { value: "inbox", label: "Inbox" },
  { value: "ready", label: "Ready" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "p0", label: "P0 - Urgent" },
  { value: "p1", label: "P1 - High" },
  { value: "p2", label: "P2 - Medium" },
  { value: "p3", label: "P3 - Low" },
];

const ENERGY_OPTIONS = [
  { value: "", label: "Any energy" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const TASK_TYPE_OPTIONS = [
  { value: "task", label: "Task" },
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "chore", label: "Chore" },
  { value: "idea", label: "Idea" },
];

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  minHeight: "44px",
  padding: "0 12px",
  fontSize: "14px",
  color: "var(--text-primary)",
  background: "#0b0b0d",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "10px",
  outline: "none",
  fontFamily: "inherit",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--text-secondary)",
  marginBottom: "6px",
};

export function NewTaskForm({
  open,
  projects,
  submitting,
  onCancel,
  onSubmit,
}: NewTaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [priority, setPriority] = useState("p2");
  const [status, setStatus] = useState("inbox");
  const [energy, setEnergy] = useState("");
  const [estimatedMins, setEstimatedMins] = useState<string>("");
  const [taskType, setTaskType] = useState("task");
  const [dueAt, setDueAt] = useState<string>("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setProjectId("");
      setPriority("p2");
      setStatus("inbox");
      setEnergy("");
      setEstimatedMins("");
      setTaskType("task");
      setDueAt("");
      setTags("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!title.trim() || submitting) return;
    const values: NewTaskFormValues = {
      title: title.trim(),
      priority,
      status,
      task_type: taskType,
    };
    if (description.trim()) values.description = description.trim();
    if (projectId) values.project_id = Number(projectId);
    if (energy) values.energy = energy;
    if (estimatedMins) {
      const mins = parseInt(estimatedMins, 10);
      if (!isNaN(mins) && mins > 0) values.estimated_mins = mins;
    }
    if (dueAt) {
      // Convert local datetime to ISO
      values.due_at = new Date(dueAt).toISOString();
    }
    if (tags.trim()) {
      values.context_tags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
    onSubmit(values);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 150,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 151,
          width: "calc(100% - 32px)",
          maxWidth: "520px",
          maxHeight: "calc(100vh - 80px)",
          background: "#111113",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "14px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            New Task
          </h2>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="new-task-title" style={LABEL_STYLE}>Title *</label>
            <input
              id="new-task-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
              autoFocus
              aria-label="Task title"
              style={INPUT_STYLE}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                  handleSubmit();
              }}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="new-task-description" style={LABEL_STYLE}>Description</label>
            <textarea
              id="new-task-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              aria-label="Task description"
              style={{
                ...INPUT_STYLE,
                minHeight: "80px",
                padding: "10px 12px",
                resize: "vertical",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "14px",
            }}
          >
            <div>
              <label htmlFor="new-task-project" style={LABEL_STYLE}>Project</label>
              <select
                id="new-task-project"
                name="project_id"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                aria-label="Project"
                style={INPUT_STYLE}
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="new-task-priority" style={LABEL_STYLE}>Priority</label>
              <select
                id="new-task-priority"
                name="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                aria-label="Priority"
                style={INPUT_STYLE}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "14px",
            }}
          >
            <div>
              <label htmlFor="new-task-status" style={LABEL_STYLE}>Status</label>
              <select
                id="new-task-status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Status"
                style={INPUT_STYLE}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="new-task-energy" style={LABEL_STYLE}>Energy</label>
              <select
                id="new-task-energy"
                name="energy"
                value={energy}
                onChange={(e) => setEnergy(e.target.value)}
                aria-label="Energy"
                style={INPUT_STYLE}
              >
                {ENERGY_OPTIONS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "14px",
            }}
          >
            <div>
              <label htmlFor="new-task-estimated" style={LABEL_STYLE}>Estimated (minutes)</label>
              <input
                id="new-task-estimated"
                name="estimated_mins"
                type="number"
                min="0"
                value={estimatedMins}
                onChange={(e) => setEstimatedMins(e.target.value)}
                placeholder="e.g. 30"
                aria-label="Estimated minutes"
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <label htmlFor="new-task-type" style={LABEL_STYLE}>Type</label>
              <select
                id="new-task-type"
                name="task_type"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                aria-label="Task type"
                style={INPUT_STYLE}
              >
                {TASK_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="new-task-due" style={LABEL_STYLE}>Due date</label>
            <input
              id="new-task-due"
              name="due_at"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              aria-label="Due date"
              style={INPUT_STYLE}
            />
          </div>

          <div style={{ marginBottom: "4px" }}>
            <label htmlFor="new-task-tags" style={LABEL_STYLE}>Tags (comma-separated)</label>
            <input
              id="new-task-tags"
              name="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="deep-work, home, phone"
              aria-label="Tags"
              style={INPUT_STYLE}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onCancel}
            disabled={submitting}
            style={{
              minHeight: "44px",
              padding: "0 16px",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text-secondary)",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "10px",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            style={{
              minHeight: "44px",
              padding: "0 20px",
              fontSize: "13px",
              fontWeight: 600,
              color: "white",
              background: title.trim() ? "var(--accent)" : "#2a2a30",
              border: "none",
              borderRadius: "10px",
              cursor: title.trim() && !submitting ? "pointer" : "not-allowed",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Creating..." : "Create Task"}
          </button>
        </div>
      </div>
    </>
  );
}
