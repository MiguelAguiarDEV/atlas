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
      className={`flex items-center gap-3 rounded-[var(--radius)] border px-4 py-3.5 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] min-h-[52px] ${
        checked
          ? "bg-[var(--success)]/8 border-[var(--success)]/20"
          : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-highlight)]"
      } ${className}`}
      style={{
        boxShadow: checked
          ? "inset 0 1px 0 0 rgba(34,197,94,0.08)"
          : "inset 0 1px 0 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Circle checkbox with fill animation */}
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          checked
            ? "border-[var(--success)] bg-[var(--success)]"
            : "border-[rgba(255,255,255,0.15)]"
        }`}
        style={{
          boxShadow: checked ? "0 0 12px var(--success-glow)" : "none",
        }}
      >
        {checked && (
          <CheckIcon size={12} className="text-white animate-check" />
        )}
      </div>

      {/* Label */}
      <span
        className={`flex-1 text-left text-[13px] font-medium transition-colors duration-200 ${
          checked ? "text-[var(--success)]" : "text-[var(--foreground)]"
        }`}
      >
        {label}
      </span>

      {/* Streak badge */}
      {streak > 0 && (
        <span
          className="rounded-[var(--radius-full)] px-2 py-0.5 text-[12px] font-medium tabular-nums"
          style={{
            background: checked
              ? "rgba(34,197,94,0.15)"
              : "rgba(255,255,255,0.06)",
            color: checked ? "var(--success)" : "var(--foreground-muted)",
          }}
        >
          {streak}d
        </span>
      )}
    </button>
  );
}
