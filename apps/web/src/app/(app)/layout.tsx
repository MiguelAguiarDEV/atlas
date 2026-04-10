"use client";

import { usePathname } from "next/navigation";
import {
  BottomTabBar,
  Sidebar,
  HomeIcon,
  ListIcon,
  ClockIcon,
  MenuIcon,
  type Tab,
  type SidebarItem,
} from "@atlas/ui";

const tabs: Tab[] = [
  {
    key: "today",
    label: "Today",
    icon: <HomeIcon size={22} />,
    href: "/today",
  },
  {
    key: "tasks",
    label: "Tasks",
    icon: <ListIcon size={22} />,
    href: "/tasks",
  },
  {
    key: "timer",
    label: "Timer",
    icon: <ClockIcon size={22} />,
    href: "/timer",
  },
  {
    key: "more",
    label: "More",
    icon: <MenuIcon size={22} />,
    href: "/more",
  },
];

const sidebarItems: SidebarItem[] = [
  {
    key: "today",
    label: "Today",
    icon: <HomeIcon size={20} />,
    href: "/today",
  },
  {
    key: "tasks",
    label: "Tasks",
    icon: <ListIcon size={20} />,
    href: "/tasks",
  },
  {
    key: "timer",
    label: "Timer",
    icon: <ClockIcon size={20} />,
    href: "/timer",
  },
  {
    key: "more",
    label: "More",
    icon: <MenuIcon size={20} />,
    href: "/more",
  },
];

function getActiveTab(pathname: string): string {
  if (pathname.startsWith("/today")) return "today";
  if (pathname.startsWith("/tasks")) return "tasks";
  if (pathname.startsWith("/timer")) return "timer";
  if (pathname.startsWith("/more")) return "more";
  return "today";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-base)]">
      {/* Desktop sidebar - hidden on mobile via desktop-only class */}
      <Sidebar items={sidebarItems} activeItem={activeTab} />

      {/* Main content area */}
      <main
        className="flex-1"
        style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        {/* On desktop, offset for sidebar and center content */}
        <div className="desktop-only" style={{ marginLeft: "240px" }}>
          <div style={{ maxWidth: "960px", margin: "0 auto", padding: "32px" }}>
            {children}
          </div>
        </div>
        {/* On mobile, render children directly */}
        <div className="mobile-only" style={{ display: "block" }}>
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar - hidden on desktop via mobile-only class */}
      <div className="mobile-only">
        <BottomTabBar tabs={tabs} activeTab={activeTab} />
      </div>
    </div>
  );
}
