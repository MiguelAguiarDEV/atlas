"use client";

type Priority = 0 | 1 | 2 | 3;

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const config: Record<Priority, { label: string; dotColor: string; textColor: string; pulse: boolean }> = {
  0: { label: "P0", dotColor: "bg-red-400", textColor: "text-red-400", pulse: true },
  1: { label: "P1", dotColor: "bg-orange-400", textColor: "text-orange-400", pulse: false },
  2: { label: "P2", dotColor: "bg-[var(--accent)]", textColor: "text-[var(--accent)]", pulse: false },
  3: { label: "P3", dotColor: "bg-[var(--foreground-muted)]", textColor: "text-[var(--foreground-muted)]", pulse: false },
};

export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  const { label, dotColor, textColor, pulse } = config[priority];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${textColor} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotColor} ${pulse ? "pulse-dot" : ""}`}
      />
      {label}
    </span>
  );
}
