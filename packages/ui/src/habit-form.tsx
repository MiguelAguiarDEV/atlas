"use client";

import { useState, useEffect } from "react";

export interface HabitFormValues {
  name: string;
  description?: string;
  frequency: string;
  target_count: number;
  habit_group?: string;
}

export interface HabitFormInitial {
  name?: string;
  description?: string | null;
  frequency?: string;
  target_count?: number;
  habit_group?: string | null;
}

interface HabitFormProps {
  open: boolean;
  mode: "create" | "edit";
  initial?: HabitFormInitial;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: HabitFormValues) => void;
}

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom" },
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

export function HabitForm({
  open,
  mode,
  initial,
  submitting,
  onCancel,
  onSubmit,
}: HabitFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [targetCount, setTargetCount] = useState("1");
  const [habitGroup, setHabitGroup] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setFrequency(initial?.frequency ?? "daily");
      setTargetCount(String(initial?.target_count ?? 1));
      setHabitGroup(initial?.habit_group ?? "");
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
    if (!name.trim() || submitting) return;
    const target = parseInt(targetCount, 10);
    const values: HabitFormValues = {
      name: name.trim(),
      frequency,
      target_count: isNaN(target) || target < 1 ? 1 : target,
    };
    if (description.trim()) values.description = description.trim();
    if (habitGroup.trim()) values.habit_group = habitGroup.trim();
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
            {mode === "create" ? "New Habit" : "Edit Habit"}
          </h2>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="habit-form-name" style={LABEL_STYLE}>Name *</label>
            <input
              id="habit-form-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Read 30 minutes"
              autoFocus
              aria-label="Habit name"
              style={INPUT_STYLE}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="habit-form-description" style={LABEL_STYLE}>Description</label>
            <textarea
              id="habit-form-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              aria-label="Habit description"
              style={{
                ...INPUT_STYLE,
                minHeight: "64px",
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
              <label htmlFor="habit-form-frequency" style={LABEL_STYLE}>Frequency</label>
              <select
                id="habit-form-frequency"
                name="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                aria-label="Frequency"
                style={INPUT_STYLE}
              >
                {FREQUENCY_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="habit-form-target" style={LABEL_STYLE}>Target count</label>
              <input
                id="habit-form-target"
                name="target_count"
                type="number"
                min="1"
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                aria-label="Target count"
                style={INPUT_STYLE}
              />
            </div>
          </div>

          <div style={{ marginBottom: "4px" }}>
            <label htmlFor="habit-form-group" style={LABEL_STYLE}>Group (optional)</label>
            <input
              id="habit-form-group"
              name="habit_group"
              type="text"
              value={habitGroup}
              onChange={(e) => setHabitGroup(e.target.value)}
              placeholder="e.g. Morning routine"
              aria-label="Habit group"
              style={INPUT_STYLE}
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
            disabled={!name.trim() || submitting}
            style={{
              minHeight: "44px",
              padding: "0 20px",
              fontSize: "13px",
              fontWeight: 600,
              color: "white",
              background: name.trim() ? "var(--accent)" : "#2a2a30",
              border: "none",
              borderRadius: "10px",
              cursor: name.trim() && !submitting ? "pointer" : "not-allowed",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting
              ? "..."
              : mode === "create"
                ? "Create Habit"
                : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}
