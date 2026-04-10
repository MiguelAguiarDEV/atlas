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

  return (
    <div
      className={`flex items-center gap-3 rounded-xl bg-[var(--atlas-surface)] px-4 py-3 transition-all duration-200 active:scale-[0.98] ${
        checked ? "opacity-50" : ""
      } ${className}`}
    >
      <button
        onClick={handleToggle}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200"
        style={{
          borderColor: checked ? "var(--atlas-success)" : "var(--atlas-border)",
          backgroundColor: checked ? "var(--atlas-success)" : "transparent",
        }}
        aria-label={checked ? "Mark incomplete" : "Mark complete"}
      >
        {checked && <CheckIcon size={14} className="text-white" />}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={`truncate text-sm font-medium transition-all duration-200 ${
            checked ? "line-through text-[var(--atlas-muted)]" : ""
          }`}
        >
          {task.title}
        </span>
        <div className="flex items-center gap-2">
          {showProject && task.project && (
            <span className="truncate text-xs text-[var(--atlas-muted)]">
              {task.project}
            </span>
          )}
          {showDueDate && task.dueDate && (
            <span className="text-xs text-[var(--atlas-muted)]">
              {task.dueDate}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <PriorityBadge priority={task.priority} />
        {task.estimatedMinutes && (
          <span className="text-xs text-[var(--atlas-muted)]">
            {formatMinutes(task.estimatedMinutes)}
          </span>
        )}
      </div>
    </div>
  );
}
