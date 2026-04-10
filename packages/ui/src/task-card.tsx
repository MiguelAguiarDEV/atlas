"use client";

import { useState } from "react";
import { PriorityBadge } from "./priority-badge";
import { CheckIcon } from "./icons";

type Priority = 0 | 1 | 2 | 3;

export interface TaskData {
  id: string;
  title: string;
  priority: Priority;
  estimatedMinutes?: number;
  project?: string;
  dueDate?: string;
  status?: string;
  labels?: string[];
  /** Numeric project ID for filtering */
  projectId?: number;
  /** Raw task type string for filtering (task, bug, idea, etc.) */
  taskType?: string;
  /** Raw ISO due date for date-range filtering */
  dueDateRaw?: string;
  /** Energy level for filtering (high, medium, low) */
  energy?: string;
}

interface TaskCardProps {
  task: TaskData;
  onToggle?: (id: string) => void;
  showProject?: boolean;
  showDueDate?: boolean;
  className?: string;
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const priorityDotColor: Record<Priority, string> = {
  0: "var(--destructive)",
  1: "var(--warning)",
  2: "var(--accent)",
  3: "var(--text-tertiary)",
};

export function TaskCard({
  task,
  onToggle,
  showProject = false,
  showDueDate = false,
  className = "",
}: TaskCardProps) {
  const [checked, setChecked] = useState(task.status === "done");

  const handleToggle = () => {
    setChecked(!checked);
    onToggle?.(task.id);
  };

  return (
    <div
      className={`group ${checked ? "opacity-50" : ""} ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "14px 16px",
        transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
        cursor: "pointer",
      }}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", borderRadius: "9999px", flexShrink: 0 }}
        aria-label={checked ? "Mark incomplete" : "Mark complete"}
      >
        <span
          style={{
            display: "flex",
            width: "22px",
            height: "22px",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9999px",
            borderWidth: "1.5px",
            borderStyle: "solid",
            borderColor: checked ? "var(--success)" : "rgba(255,255,255,0.15)",
            backgroundColor: checked ? "var(--success)" : "transparent",
            boxShadow: checked ? "0 0 12px var(--success-glow)" : "none",
            transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {checked && (
            <CheckIcon
              size={12}
              className="text-white animate-check"
            />
          )}
        </span>
      </button>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Priority dot inline before title */}
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "9999px",
              backgroundColor: priorityDotColor[task.priority],
              flexShrink: 0,
            }}
            className={task.priority === 0 ? "pulse-dot" : ""}
          />
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              lineHeight: 1.4,
              color: checked ? "var(--text-secondary)" : "var(--text-primary)",
              textDecoration: checked ? "line-through" : "none",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              transition: "color 200ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {task.title}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "16px" }}>
          {showProject && task.project && (
            <span style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {task.project}
            </span>
          )}
          {showDueDate && task.dueDate && (
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {task.dueDate}
            </span>
          )}
        </div>
      </div>

      {/* Right side: priority badge + estimate */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <PriorityBadge priority={task.priority} />
        {task.estimatedMinutes && (
          <span style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--text-secondary)",
            fontVariantNumeric: "tabular-nums",
          }}>
            {formatMinutes(task.estimatedMinutes)}
          </span>
        )}
      </div>
    </div>
  );
}
