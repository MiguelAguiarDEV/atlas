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

  const priorityLeftBorder: Record<Priority, string> = {
    0: "#EF4444",
    1: "#F59E0B",
    2: "#5E6AD2",
    3: "transparent",
  };

  return (
    <div
      className={`group flex items-center gap-3 rounded-[var(--radius)] overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] hover:bg-[var(--surface-hover)] hover:border-[var(--border-highlight)] ${
        checked ? "opacity-50" : ""
      } ${className}`}
      style={{
        background: "#111113",
        border: "1px solid rgba(255,255,255,0.12)",
        borderLeft: `4px solid ${priorityLeftBorder[task.priority]}`,
        padding: "16px",
        boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        style={{width:"44px",height:"44px",minWidth:"44px",minHeight:"44px"}} className="flex shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
        aria-label={checked ? "Mark incomplete" : "Mark complete"}
      >
        <span
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px]"
          style={{
            borderColor: checked ? "var(--success)" : "rgba(255,255,255,0.15)",
            backgroundColor: checked ? "var(--success)" : "transparent",
            boxShadow: checked ? "0 0 12px var(--success-glow)" : "none",
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
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={`text-[14px] font-medium leading-tight transition-all duration-200 ${
            checked
              ? "line-through text-[var(--foreground-muted)]"
              : "text-[var(--foreground)]"
          }`}
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {task.title}
        </span>
        <div className="flex items-center gap-2">
          {showProject && task.project && (
            <span className="truncate rounded-[6px] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 text-[12px] text-[var(--foreground-muted)]">
              {task.project}
            </span>
          )}
          {showDueDate && task.dueDate && (
            <span className="text-[12px] text-[var(--foreground-muted)]">
              {task.dueDate}
            </span>
          )}
        </div>
      </div>

      {/* Right side: priority + estimate */}
      <div className="flex shrink-0 items-center gap-2.5">
        <PriorityBadge priority={task.priority} />
        {task.estimatedMinutes && (
          <span className="text-[12px] font-medium text-[var(--foreground-muted)] tabular-nums">
            {formatMinutes(task.estimatedMinutes)}
          </span>
        )}
      </div>
    </div>
  );
}
