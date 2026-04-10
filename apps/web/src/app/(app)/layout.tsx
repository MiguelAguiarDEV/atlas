"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  BottomTabBar,
  HomeIcon,
  ListIcon,
  ClockIcon,
  MenuIcon,
  type Tab,
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
      <main className="flex-1" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
        {children}
      </main>
      <BottomTabBar tabs={tabs} activeTab={activeTab} />
    </div>
  );
}
