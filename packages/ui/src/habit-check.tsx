"use client";

import { useState, useEffect } from "react";
import { CheckIcon } from "./icons";

interface HabitCheckProps {
  id: string;
  label: string;
  streak?: number;
  /** Controlled checked state. When provided, component reflects this value. */
  checked?: boolean;
  defaultChecked?: boolean;
  onToggle?: (id: string, checked: boolean) => void;
  className?: string;
}

export function HabitCheck({
  id,
  label,
  streak = 0,
  checked: controlledChecked,
  defaultChecked = false,
  onToggle,
  className = "",
}: HabitCheckProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);

  // Sync internal state when a controlled value is provided (e.g., after
  // the Today page loads "completed today" state post-mount).
  useEffect(() => {
    if (controlledChecked !== undefined) {
      setInternalChecked(controlledChecked);
    }
  }, [controlledChecked]);

  const checked = controlledChecked ?? internalChecked;

  const handleToggle = () => {
    const next = !checked;
    if (controlledChecked === undefined) {
      setInternalChecked(next);
    }
    onToggle?.(id, next);
  };

  return (
    <button
      onClick={handleToggle}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        minHeight: "56px",
        height: "56px",
        padding: "0 16px",
        borderRadius: "10px",
        border: checked
          ? "1px solid rgba(42,245,152,0.20)"
          : "1px solid var(--border)",
        background: checked ? "rgba(42,245,152,0.08)" : "var(--bg-elevated)",
        cursor: "pointer",
        transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {/* Circle checkbox with fill animation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "24px",
          height: "24px",
          borderRadius: "9999px",
          flexShrink: 0,
          borderWidth: "1.5px",
          borderStyle: "solid",
          borderColor: checked ? "var(--success)" : "rgba(255,255,255,0.15)",
          backgroundColor: checked ? "var(--success)" : "transparent",
          boxShadow: checked ? "0 0 12px var(--success-glow)" : "none",
          transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {checked && (
          <CheckIcon size={14} className="text-white animate-check" />
        )}
      </div>

      {/* Label */}
      <span
        style={{
          flex: 1,
          textAlign: "left",
          fontSize: "14px",
          fontWeight: 500,
          color: checked ? "var(--success)" : "var(--text-primary)",
          transition: "color 200ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {label}
      </span>

      {/* Streak badge */}
      {streak > 0 && (
        <span
          style={{
            padding: "4px 10px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            background: checked
              ? "rgba(42,245,152,0.20)"
              : "var(--accent-glow)",
            color: checked ? "var(--success)" : "var(--accent)",
          }}
        >
          {streak}d
        </span>
      )}
    </button>
  );
}
