"use client";

type Priority = 0 | 1 | 2 | 3;

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const config: Record<Priority, { label: string; bg: string; color: string; dotColor: string; pulse: boolean }> = {
  0: { label: "P0", bg: "rgba(239,68,68,0.15)", color: "#F87171", dotColor: "#F87171", pulse: true },
  1: { label: "P1", bg: "rgba(245,158,11,0.15)", color: "#FBBF24", dotColor: "#FBBF24", pulse: false },
  2: { label: "P2", bg: "rgba(94,106,210,0.15)", color: "#818CF8", dotColor: "#818CF8", pulse: false },
  3: { label: "P3", bg: "rgba(255,255,255,0.06)", color: "var(--foreground-muted)", dotColor: "var(--foreground-muted)", pulse: false },
};

export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  const { label, bg, color, dotColor, pulse } = config[priority];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${className}`}
      style={{
        background: bg,
        color: color,
        padding: "3px 8px",
        borderRadius: "6px",
      }}
    >
      <span
        className={`rounded-full ${pulse ? "pulse-dot" : ""}`}
        style={{
          width: "6px",
          height: "6px",
          backgroundColor: dotColor,
        }}
      />
      {label}
    </span>
  );
}
