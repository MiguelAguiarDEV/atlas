"use client";

import { useState } from "react";
import { CheckIcon } from "./icons";

interface HabitCheckProps {
  id: string;
  label: string;
  streak?: number;
  defaultChecked?: boolean;
  onToggle?: (id: string, checked: boolean) => void;
  className?: string;
}

export function HabitCheck({
  id,
  label,
  streak = 0,
  defaultChecked = false,
  onToggle,
  className = "",
}: HabitCheckProps) {
  const [checked, setChecked] = useState(defaultChecked);

  const handleToggle = () => {
    const next = !checked;
    setChecked(next);
    onToggle?.(id, next);
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 active:scale-[0.98] ${
        checked
          ? "bg-[var(--atlas-success)]/10"
          : "bg-[var(--atlas-surface)]"
      } ${className}`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
          checked
            ? "border-[var(--atlas-success)] bg-[var(--atlas-success)]"
            : "border-[var(--atlas-border)]"
        }`}
      >
        {checked && <CheckIcon size={14} className="text-white" />}
      </div>

      <span
        className={`flex-1 text-left text-sm font-medium transition-colors duration-200 ${
          checked ? "text-[var(--atlas-success)]" : ""
        }`}
      >
        {label}
      </span>

      {streak > 0 && (
        <span className="rounded-full bg-[var(--atlas-surface-hover)] px-2 py-0.5 text-xs text-[var(--atlas-muted)]">
          {streak}d
        </span>
      )}
    </button>
  );
}
