"use client";

type Priority = 0 | 1 | 2 | 3;

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const config: Record<Priority, { label: string; bg: string; color: string; dotColor: string; pulse: boolean }> = {
  0: { label: "P0", bg: "rgba(229,72,77,0.15)", color: "var(--destructive)", dotColor: "var(--destructive)", pulse: true },
  1: { label: "P1", bg: "rgba(245,165,36,0.15)", color: "var(--warning)", dotColor: "var(--warning)", pulse: false },
  2: { label: "P2", bg: "var(--accent-glow)", color: "var(--accent)", dotColor: "var(--accent)", pulse: false },
  3: { label: "P3", bg: "rgba(255,255,255,0.04)", color: "var(--text-tertiary)", dotColor: "var(--text-tertiary)", pulse: false },
};

export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  const { label, bg, color, dotColor, pulse } = config[priority];
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "12px",
        fontWeight: 600,
        background: bg,
        color: color,
        padding: "3px 8px",
        borderRadius: "6px",
      }}
    >
      <span
        className={pulse ? "pulse-dot" : ""}
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "9999px",
          backgroundColor: dotColor,
        }}
      />
      {label}
    </span>
  );
}
