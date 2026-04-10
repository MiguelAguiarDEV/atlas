"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PriorityBadge } from "./priority-badge";
import type { TaskData } from "./task-card";

export interface TaskComment {
  id: number | string;
  text: string;
  created_at: string;
}

interface TaskDetailPanelProps {
  task: TaskData | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: (id: string, updates: Partial<TaskData>) => void;
  onDescriptionSave?: (id: string, description: string) => void;
  onCommentAdd?: (id: string, text: string) => void;
  onPriorityChange?: (id: string, priority: number) => void;
  comments?: TaskComment[];
  description?: string;
}

const STATUS_OPTIONS = [
  { value: "inbox", label: "Inbox" },
  { value: "ready", label: "Ready" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: 0, label: "Urgent", color: "var(--destructive)" },
  { value: 1, label: "High", color: "var(--warning)" },
  { value: 2, label: "Medium", color: "var(--accent)" },
  { value: 3, label: "Low", color: "var(--text-tertiary)" },
];

function statusBadgeStyle(status: string): React.CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    inbox: { bg: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" },
    ready: { bg: "rgba(56,189,248,0.15)", color: "#38bdf8" },
    in_progress: { bg: "var(--accent-glow)", color: "var(--accent)" },
    in_review: { bg: "rgba(245,165,36,0.15)", color: "var(--warning)" },
    done: { bg: "rgba(52,199,89,0.15)", color: "var(--success)" },
  };
  const s = map[status] ?? map.inbox;
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 600,
    borderRadius: "6px",
    background: s.bg,
    color: s.color,
  };
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

export function TaskDetailPanel({
  task,
  open,
  onClose,
  onUpdate,
  onDescriptionSave,
  onCommentAdd,
  onPriorityChange,
  comments = [],
  description: externalDescription,
}: TaskDetailPanelProps) {
  const isDesktop = useIsDesktop();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [descValue, setDescValue] = useState("");
  const [commentValue, setCommentValue] = useState("");
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSaved = useCallback(() => {
    setSavedIndicator(true);
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => setSavedIndicator(false), 1500);
  }, []);

  useEffect(() => {
    if (open && task) {
      setTitleValue(task.title);
      setDescValue(externalDescription ?? "");
      setCommentValue("");
      setEditingTitle(false);
      setSavedIndicator(false);
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      timeoutRef.current = setTimeout(() => {
        setMounted(false);
      }, 280);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [open, task, externalDescription]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (descDebounceRef.current) clearTimeout(descDebounceRef.current);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  if (!mounted || !task) return null;

  const panelWidth = isDesktop ? "480px" : "100%";

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue !== task.title) {
      onUpdate?.(task.id, { title: titleValue.trim() });
      showSaved();
    }
  };

  const handleStatusChange = (newStatus: string) => {
    onUpdate?.(task.id, { status: newStatus } as Partial<TaskData>);
    showSaved();
  };

  const handlePriorityChange = (newPriority: number) => {
    if (onPriorityChange) {
      onPriorityChange(task.id, newPriority);
    } else {
      onUpdate?.(task.id, { priority: newPriority as 0 | 1 | 2 | 3 });
    }
    showSaved();
  };

  const handleDescChange = (value: string) => {
    setDescValue(value);
    // Debounce description save at 500ms
    if (descDebounceRef.current) clearTimeout(descDebounceRef.current);
    descDebounceRef.current = setTimeout(() => {
      if (onDescriptionSave) {
        onDescriptionSave(task.id, value);
        showSaved();
      }
    }, 500);
  };

  const handleCommentSubmit = async () => {
    const text = commentValue.trim();
    if (!text || submittingComment) return;
    setSubmittingComment(true);
    try {
      onCommentAdd?.(task.id, text);
      setCommentValue("");
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatCommentTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 90,
          background: isDesktop ? "transparent" : "rgba(0,0,0,0.5)",
          opacity: visible ? 1 : 0,
          transition: "opacity 250ms cubic-bezier(0.16,1,0.3,1)",
          pointerEvents: visible ? "auto" : "none",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: panelWidth,
          zIndex: 100,
          background: "var(--bg-elevated)",
          borderLeft: "1px solid var(--border)",
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 250ms cubic-bezier(0.16,1,0.3,1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
            <span style={statusBadgeStyle(task.status ?? "inbox")}>
              {STATUS_OPTIONS.find((s) => s.value === task.status)?.label ?? "Inbox"}
            </span>
            <PriorityBadge priority={task.priority} />
            {/* Saved indicator */}
            {savedIndicator && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "var(--success)",
                  opacity: savedIndicator ? 1 : 0,
                  transition: "opacity 200ms ease",
                  marginLeft: "4px",
                }}
              >
                Saved
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            style={{
              width: "44px",
              height: "44px",
              minWidth: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              borderRadius: "10px",
              flexShrink: 0,
              transition: "color 200ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
          }}
        >
          {/* Title */}
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleBlur();
                if (e.key === "Escape") {
                  setTitleValue(task.title);
                  setEditingTitle(false);
                }
              }}
              style={{
                width: "100%",
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--text-primary)",
                background: "transparent",
                border: "1px solid var(--accent)",
                borderRadius: "10px",
                padding: "8px 12px",
                outline: "none",
                lineHeight: 1.3,
              }}
            />
          ) : (
            <h2
              onClick={() => setEditingTitle(true)}
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--text-primary)",
                lineHeight: 1.3,
                cursor: "text",
                padding: "8px 0",
                margin: 0,
              }}
            >
              {task.title}
            </h2>
          )}

          {/* Metadata bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginTop: "20px",
              padding: "16px",
              background: "var(--bg-base)",
              borderRadius: "10px",
              border: "1px solid var(--border)",
            }}
          >
            {/* Status */}
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                Status
              </div>
              <select
                value={task.status ?? "inbox"}
                onChange={(e) => handleStatusChange(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "36px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "0 8px",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority - now editable */}
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                Priority
              </div>
              <select
                value={task.priority}
                onChange={(e) => handlePriorityChange(Number(e.target.value))}
                style={{
                  width: "100%",
                  minHeight: "36px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "0 8px",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                Project
              </div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", minHeight: "36px", display: "flex", alignItems: "center" }}>
                {task.project ?? "No project"}
              </div>
            </div>

            {/* Due date */}
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                Due Date
              </div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", minHeight: "36px", display: "flex", alignItems: "center" }}>
                {task.dueDate ?? "No date"}
              </div>
            </div>

            {/* Estimated time */}
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                Estimated
              </div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", minHeight: "36px", display: "flex", alignItems: "center" }}>
                {task.estimatedMinutes
                  ? task.estimatedMinutes < 60
                    ? `${task.estimatedMinutes}m`
                    : `${Math.floor(task.estimatedMinutes / 60)}h ${task.estimatedMinutes % 60}m`
                  : "Not set"}
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginTop: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
              Description
            </div>
            <textarea
              value={descValue}
              onChange={(e) => handleDescChange(e.target.value)}
              placeholder="Add a description..."
              style={{
                width: "100%",
                minHeight: "120px",
                fontSize: "14px",
                lineHeight: 1.6,
                color: "var(--text-primary)",
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "12px",
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Activity section */}
          <div style={{ marginTop: "24px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "12px" }}>
              Activity
            </div>

            {/* Comments list */}
            {comments.length === 0 ? (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  background: "var(--bg-base)",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  marginBottom: "12px",
                }}
              >
                <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                  No activity yet
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: "12px",
                      background: "var(--bg-base)",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "9999px",
                            background: "rgba(255,255,255,0.06)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          U
                        </div>
                        <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>You</span>
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                        {formatCommentTime(comment.created_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.5, margin: 0 }}>
                      {comment.text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Comment input */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
              }}
            >
              {/* Avatar placeholder */}
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  minWidth: "32px",
                  borderRadius: "9999px",
                  background: "rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  flexShrink: 0,
                }}
              >
                U
              </div>
              <div style={{ flex: 1, display: "flex", gap: "8px" }}>
                <input
                  value={commentValue}
                  onChange={(e) => setCommentValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleCommentSubmit();
                    }
                  }}
                  placeholder="Add a comment..."
                  style={{
                    flex: 1,
                    minHeight: "44px",
                    fontSize: "13px",
                    color: "var(--text-primary)",
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "0 12px",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={handleCommentSubmit}
                  disabled={!commentValue.trim() || submittingComment}
                  style={{
                    minWidth: "44px",
                    height: "44px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: commentValue.trim() ? "var(--accent)" : "rgba(255,255,255,0.04)",
                    color: commentValue.trim() ? "white" : "var(--text-tertiary)",
                    border: "none",
                    borderRadius: "10px",
                    cursor: commentValue.trim() && !submittingComment ? "pointer" : "default",
                    transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
                    flexShrink: 0,
                    opacity: submittingComment ? 0.6 : 1,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
