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
      className={`flex items-center gap-3 rounded-[var(--radius)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] w-full ${className}`}
      style={{
        minHeight: "56px",
        height: "56px",
        padding: "0 16px",
        background: checked ? "rgba(34,197,94,0.08)" : "#111113",
        border: checked
          ? "1px solid rgba(34,197,94,0.20)"
          : "1px solid rgba(255,255,255,0.12)",
        boxShadow: checked
          ? "inset 0 1px 0 0 rgba(34,197,94,0.08)"
          : "inset 0 1px 0 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Circle checkbox with fill animation */}
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          checked
            ? "border-[var(--success)] bg-[var(--success)]"
            : "border-[rgba(255,255,255,0.15)]"
        }`}
        style={{
          width: "24px",
          height: "24px",
          boxShadow: checked ? "0 0 12px var(--success-glow)" : "none",
        }}
      >
        {checked && (
          <CheckIcon size={14} className="text-white animate-check" />
        )}
      </div>

      {/* Label */}
      <span
        className={`flex-1 text-left text-[14px] font-medium transition-colors duration-200 ${
          checked ? "text-[var(--success)]" : "text-[var(--foreground)]"
        }`}
      >
        {label}
      </span>

      {/* Streak badge */}
      {streak > 0 && (
        <span
          className="rounded-[var(--radius-full)] px-2.5 py-1 text-[12px] font-semibold tabular-nums"
          style={{
            background: checked
              ? "rgba(34,197,94,0.20)"
              : "rgba(94,106,210,0.15)",
            color: checked ? "var(--success)" : "var(--accent)",
          }}
        >
          {streak}d
        </span>
      )}
    </button>
  );
}
