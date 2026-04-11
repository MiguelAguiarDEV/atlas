"use client";

import { useState, useEffect } from "react";

export interface ManualTimeEntryValues {
  task_id?: number;
  started_at: string; // ISO
  ended_at?: string; // ISO
  duration_secs?: number;
  notes?: string;
}

export interface ManualTimeEntryInitial {
  task_id?: number | null;
  started_at?: string;
  ended_at?: string | null;
  duration_secs?: number | null;
  notes?: string | null;
}

interface TaskOption {
  id: number;
  title: string;
}

interface ManualTimeEntryFormProps {
  open: boolean;
  mode: "create" | "edit";
  tasks: TaskOption[];
  initial?: ManualTimeEntryInitial;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: ManualTimeEntryValues) => void;
}

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

function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

export function ManualTimeEntryForm({
  open,
  mode,
  tasks,
  initial,
  submitting,
  onCancel,
  onSubmit,
}: ManualTimeEntryFormProps) {
  const [taskId, setTaskId] = useState<string>("");
  const [startedAt, setStartedAt] = useState<string>("");
  const [endedAt, setEndedAt] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (open) {
      setTaskId(initial?.task_id ? String(initial.task_id) : "");
      setStartedAt(
        toLocalInput(initial?.started_at) ||
          toLocalInput(new Date().toISOString()),
      );
      setEndedAt(toLocalInput(initial?.ended_at));
      setNotes(initial?.notes ?? "");
    }
  }, [open, initial]);

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
    if (!startedAt || submitting) return;
    const startIso = new Date(startedAt).toISOString();
    const values: ManualTimeEntryValues = {
      started_at: startIso,
    };
    if (taskId) values.task_id = Number(taskId);
    if (endedAt) {
      const endIso = new Date(endedAt).toISOString();
      values.ended_at = endIso;
      const secs = Math.floor(
        (new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000,
      );
      if (secs > 0) values.duration_secs = secs;
    }
    if (notes.trim()) values.notes = notes.trim();
    onSubmit(values);
  };

  return (
    <>
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
          maxWidth: "460px",
          background: "#111113",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "14px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
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
            {mode === "create" ? "Manual Time Entry" : "Edit Time Entry"}
          </h2>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="manual-time-task" style={LABEL_STYLE}>Task</label>
            <select
              id="manual-time-task"
              name="task_id"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              aria-label="Task"
              style={INPUT_STYLE}
            >
              <option value="">No task (general)</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
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
              <label htmlFor="manual-time-start" style={LABEL_STYLE}>Start *</label>
              <input
                id="manual-time-start"
                name="started_at"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                aria-label="Start time"
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <label htmlFor="manual-time-end" style={LABEL_STYLE}>End</label>
              <input
                id="manual-time-end"
                name="ended_at"
                type="datetime-local"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
                aria-label="End time"
                style={INPUT_STYLE}
              />
            </div>
          </div>

          <div>
            <label htmlFor="manual-time-notes" style={LABEL_STYLE}>Notes</label>
            <textarea
              id="manual-time-notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you work on?"
              rows={3}
              aria-label="Notes"
              style={{
                ...INPUT_STYLE,
                minHeight: "80px",
                padding: "10px 12px",
                resize: "vertical",
              }}
            />
          </div>
        </div>

        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
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
            disabled={!startedAt || submitting}
            style={{
              minHeight: "44px",
              padding: "0 20px",
              fontSize: "13px",
              fontWeight: 600,
              color: "white",
              background: startedAt ? "var(--accent)" : "#2a2a30",
              border: "none",
              borderRadius: "10px",
              cursor: startedAt && !submitting ? "pointer" : "not-allowed",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "..." : mode === "create" ? "Add Entry" : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}
