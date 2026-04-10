"use client";

type Priority = 0 | 1 | 2 | 3;

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const config: Record<Priority, { label: string; color: string; bg: string }> = {
  0: { label: "P0", color: "text-red-400", bg: "bg-red-400/15" },
  1: { label: "P1", color: "text-orange-400", bg: "bg-orange-400/15" },
  2: { label: "P2", color: "text-blue-400", bg: "bg-blue-400/15" },
  3: { label: "P3", color: "text-zinc-400", bg: "bg-zinc-400/15" },
};

export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  const { label, color, bg } = config[priority];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${color} ${bg} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          priority === 0
            ? "bg-red-400"
            : priority === 1
              ? "bg-orange-400"
              : priority === 2
                ? "bg-blue-400"
                : "bg-zinc-400"
        }`}
      />
      {label}
    </span>
  );
}
