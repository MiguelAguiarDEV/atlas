"use client";

const MENU_ITEMS = [
  { label: "Inbox", description: "Unprocessed captures", count: 4 },
  { label: "Weekly Review", description: "Review and plan your week", count: 0 },
  { label: "Analytics", description: "Time tracking insights", count: 0 },
  { label: "Projects", description: "Manage your projects", count: 0 },
  { label: "Habits", description: "Configure habits and routines", count: 0 },
  { label: "Settings", description: "Preferences and account", count: 0 },
];

export default function MorePage() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-safe">
      <header className="pb-6 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">More</h1>
      </header>

      <div className="flex flex-col gap-1 pb-24">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.label}
            className="flex items-center gap-4 rounded-xl px-4 py-4 text-left transition-colors active:bg-[var(--atlas-surface-hover)] hover:bg-[var(--atlas-surface)]"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">{item.label}</span>
              <span className="text-xs text-[var(--atlas-muted)]">
                {item.description}
              </span>
            </div>
            {item.count > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--atlas-accent)] px-2 text-xs font-medium text-white">
                {item.count}
              </span>
            )}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-[var(--atlas-muted)]"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
