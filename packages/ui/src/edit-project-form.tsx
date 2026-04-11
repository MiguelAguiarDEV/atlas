"use client";

import { useState, useEffect } from "react";

export interface EditProjectValues {
  name: string;
  description?: string | null;
  color: string;
}

interface EditProjectFormProps {
  open: boolean;
  initial: {
    name: string;
    description?: string | null;
    color: string;
  };
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: EditProjectValues) => void;
}

const PRESET_COLORS = ["#5E6AD2", "#2AF598", "#F5A524", "#E5484D", "#8B5CF6"];

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

export function EditProjectForm({
  open,
  initial,
  submitting,
  onCancel,
  onSubmit,
}: EditProjectFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (open) {
      setName(initial.name);
      setDescription(initial.description ?? "");
      setColor(initial.color || PRESET_COLORS[0]);
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
    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      color,
    });
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
            Edit Project
          </h2>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="edit-project-name" style={LABEL_STYLE}>Name *</label>
            <input
              id="edit-project-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              aria-label="Project name"
              style={INPUT_STYLE}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="edit-project-description" style={LABEL_STYLE}>Description</label>
            <textarea
              id="edit-project-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the project..."
              rows={3}
              aria-label="Project description"
              style={{
                ...INPUT_STYLE,
                minHeight: "80px",
                padding: "10px 12px",
                resize: "vertical",
              }}
            />
          </div>

          <div>
            <label style={LABEL_STYLE}>Color</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
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
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      width: "28px",
                      height: "28px",
                      borderRadius: "9999px",
                      background: c,
                      border:
                        color === c
                          ? "2px solid var(--text-primary)"
                          : "2px solid transparent",
                    }}
                  />
                </button>
              ))}
            </div>
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
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}
