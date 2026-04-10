"use client";

import {
  InboxIcon,
  CalendarIcon,
  BarChartIcon,
  FolderIcon,
  RepeatIcon,
  SettingsIcon,
  ChevronRightIcon,
} from "@atlas/ui";

const MENU_ITEMS = [
  {
    label: "Inbox",
    description: "Unprocessed captures",
    icon: InboxIcon,
    count: 4,
    iconBg: "rgba(94,106,210,0.12)",
    iconColor: "var(--accent)",
  },
  {
    label: "Weekly Review",
    description: "Review and plan your week",
    icon: CalendarIcon,
    count: 0,
    iconBg: "rgba(245,158,11,0.12)",
    iconColor: "var(--warning)",
  },
  {
    label: "Analytics",
    description: "Time tracking insights",
    icon: BarChartIcon,
    count: 0,
    iconBg: "rgba(34,197,94,0.12)",
    iconColor: "var(--success)",
  },
  {
    label: "Projects",
    description: "Manage your projects",
    icon: FolderIcon,
    count: 0,
    iconBg: "rgba(94,106,210,0.12)",
    iconColor: "var(--accent)",
  },
  {
    label: "Habits",
    description: "Configure habits and routines",
    icon: RepeatIcon,
    count: 0,
    iconBg: "rgba(139,92,246,0.12)",
    iconColor: "#8B5CF6",
  },
  {
    label: "Settings",
    description: "Preferences and account",
    icon: SettingsIcon,
    count: 0,
    iconBg: "rgba(255,255,255,0.06)",
    iconColor: "var(--foreground-muted)",
  },
];

function MenuCard({ item, index }: { item: typeof MENU_ITEMS[number]; index: number }) {
  const Icon = item.icon;
  return (
    <button
      className="glass-elevated flex items-center gap-4 px-4 py-4 text-left transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] hover:bg-[var(--surface-hover)] animate-fade-in-up"
      style={{ animationDelay: `${50 + index * 40}ms`, minHeight: "64px" }}
    >
      {/* Icon */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
        style={{ background: item.iconBg }}
      >
        <Icon size={20} style={{ color: item.iconColor }} />
      </div>

      {/* Text */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13px] font-medium text-[var(--foreground)]">
          {item.label}
        </span>
        <span className="text-[12px] text-[var(--foreground-muted)]">
          {item.description}
        </span>
      </div>

      {/* Count badge */}
      {item.count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-[var(--radius-full)] bg-[var(--accent)] px-1.5 text-[12px] font-medium text-white shadow-[0_0_8px_var(--accent-glow)]">
          {item.count}
        </span>
      )}

      {/* Chevron */}
      <ChevronRightIcon
        size={16}
        className="shrink-0 text-[var(--foreground-muted)] opacity-40"
      />
    </button>
  );
}

export default function MorePage() {
  return (
    <>
      {/* Mobile layout */}
      <div className="mobile-only" style={{ display: "block" }}>
        <div className="mx-auto max-w-lg px-4 pt-safe">
          <header className="pb-6 pt-8 animate-fade-in-up">
            <h1 className="text-h1 text-[var(--foreground)]">More</h1>
          </header>

          <div className="flex flex-col gap-2 pb-24">
            {MENU_ITEMS.map((item, i) => (
              <MenuCard key={item.label} item={item} index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop layout - 2x3 grid */}
      <div className="desktop-only" style={{ flexDirection: "column" }}>
        <header className="animate-fade-in-up" style={{ paddingBottom: "24px" }}>
          <h1 className="text-h1 text-[var(--foreground)]">More</h1>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}
        >
          {MENU_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="glass-elevated flex flex-col items-start gap-4 p-6 text-left transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] hover:bg-[var(--surface-hover)] animate-fade-in-up"
                style={{
                  animationDelay: `${50 + i * 40}ms`,
                  minHeight: "140px",
                  borderRadius: "var(--radius)",
                }}
              >
                {/* Top row: icon + badge */}
                <div className="flex w-full items-center justify-between">
                  <div
                    className="flex items-center justify-center rounded-[var(--radius-sm)]"
                    style={{
                      width: "44px",
                      height: "44px",
                      background: item.iconBg,
                    }}
                  >
                    <Icon size={22} style={{ color: item.iconColor }} />
                  </div>
                  {item.count > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-[var(--radius-full)] bg-[var(--accent)] px-1.5 text-[12px] font-medium text-white shadow-[0_0_8px_var(--accent-glow)]">
                      {item.count}
                    </span>
                  )}
                </div>

                {/* Label + description */}
                <div className="flex flex-col gap-1">
                  <span className="text-[15px] font-semibold text-[var(--foreground)]">
                    {item.label}
                  </span>
                  <span className="text-[13px] text-[var(--foreground-muted)]">
                    {item.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
