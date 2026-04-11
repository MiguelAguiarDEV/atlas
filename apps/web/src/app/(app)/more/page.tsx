"use client";

import Link from "next/link";
import {
  InboxIcon,
  CalendarIcon,
  BarChartIcon,
  FolderIcon,
  RepeatIcon,
  SettingsIcon,
  ChevronRightIcon,
  useIsDesktop,
} from "@atlas/ui";

const MENU_ITEMS = [
  {
    label: "Inbox",
    description: "Unprocessed captures",
    icon: InboxIcon,
    count: 4,
    iconBg: "var(--accent-subtle)",
    iconColor: "var(--accent)",
    href: "/tasks?filter=inbox",
  },
  {
    label: "Weekly Review",
    description: "Review and plan your week",
    icon: CalendarIcon,
    count: 0,
    iconBg: "rgba(245,165,36,0.12)",
    iconColor: "var(--warning)",
    href: "/more",
  },
  {
    label: "Analytics",
    description: "Time tracking insights",
    icon: BarChartIcon,
    count: 0,
    iconBg: "rgba(42,245,152,0.12)",
    iconColor: "var(--success)",
    href: "/more",
  },
  {
    label: "Projects",
    description: "Manage your projects",
    icon: FolderIcon,
    count: 0,
    iconBg: "var(--accent-subtle)",
    iconColor: "var(--accent)",
    href: "/projects",
  },
  {
    label: "Habits",
    description: "Configure habits and routines",
    icon: RepeatIcon,
    count: 0,
    iconBg: "rgba(139,92,246,0.12)",
    iconColor: "var(--habit-purple)",
    href: "/more",
  },
  {
    label: "Settings",
    description: "Preferences and account",
    icon: SettingsIcon,
    count: 0,
    iconBg: "rgba(255,255,255,0.04)",
    iconColor: "var(--text-secondary)",
    href: "/more/settings",
  },
];

export default function MorePage() {
  const isDesktop = useIsDesktop();

  const containerStyle: React.CSSProperties = isDesktop
    ? {}
    : { padding: "32px 16px 120px 16px", maxWidth: "512px", margin: "0 auto" };

  /* P1-06: Single component tree */
  return (
    <div className="animate-fade-in" style={containerStyle}>
      <header className="animate-fade-in-up" style={{ paddingBottom: "24px" }}>
        <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>More</h1>
      </header>

      {isDesktop ? (
        /* Desktop: responsive auto-fill grid (3 col ~1280, 4 col ~1920) */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px", alignItems: "start" }}>
          {MENU_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="glass-elevated animate-fade-in-up"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "16px",
                  padding: "24px",
                  textAlign: "left",
                  textDecoration: "none",
                  color: "inherit",
                  minHeight: "140px",
                  borderRadius: "10px",
                  transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
                  animationDelay: `${50 + i * 40}ms`,
                }}
              >
                {/* Top row: icon + badge */}
                <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "10px",
                      background: item.iconBg,
                    }}
                  >
                    <Icon size={22} style={{ color: item.iconColor }} />
                  </div>
                  {item.count > 0 && (
                    <span style={{
                      display: "flex",
                      height: "20px",
                      minWidth: "20px",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "9999px",
                      background: "var(--accent)",
                      padding: "0 6px",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "white",
                      boxShadow: "0 0 8px var(--accent-glow)",
                    }}>
                      {item.count}
                    </span>
                  )}
                </div>

                {/* Label + description */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* Mobile: list cards */
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {MENU_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="glass-elevated animate-fade-in-up"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "16px",
                  textDecoration: "none",
                  color: "inherit",
                  minHeight: "64px",
                  borderRadius: "10px",
                  transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
                  animationDelay: `${50 + i * 40}ms`,
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "10px",
                    background: item.iconBg,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} style={{ color: item.iconColor }} />
                </div>

                {/* Text */}
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    {item.description}
                  </span>
                </div>

                {/* Count badge */}
                {item.count > 0 && (
                  <span style={{
                    display: "flex",
                    height: "20px",
                    minWidth: "20px",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "9999px",
                    background: "var(--accent)",
                    padding: "0 6px",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "white",
                    boxShadow: "0 0 8px var(--accent-glow)",
                  }}>
                    {item.count}
                  </span>
                )}

                {/* Chevron */}
                <ChevronRightIcon
                  size={16}
                  style={{ flexShrink: 0, color: "var(--text-tertiary)", opacity: 0.6 }}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
