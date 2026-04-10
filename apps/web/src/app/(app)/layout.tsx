"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  HomeIcon,
  ListIcon,
  ClockIcon,
  MenuIcon,
  type SidebarItem,
} from "@atlas/ui";

const navItems: SidebarItem[] = [
  { key: "today", label: "Today", icon: <HomeIcon size={20} />, href: "/today" },
  { key: "tasks", label: "Tasks", icon: <ListIcon size={20} />, href: "/tasks" },
  { key: "timer", label: "Timer", icon: <ClockIcon size={20} />, href: "/timer" },
  { key: "more", label: "More", icon: <MenuIcon size={20} />, href: "/more" },
];

function getActiveTab(pathname: string): string {
  if (pathname.startsWith("/today")) return "today";
  if (pathname.startsWith("/tasks")) return "tasks";
  if (pathname.startsWith("/timer")) return "timer";
  if (pathname.startsWith("/more")) return "more";
  return "today";
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);
  const isDesktop = useIsDesktop();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isDesktop) {
    return (
      <div style={{ display: "flex", minHeight: "100dvh", background: "var(--bg-base)" }}>
        <Sidebar items={navItems} activeItem={activeTab} />
        <main style={{ marginLeft: "240px", flex: 1, maxWidth: "960px", padding: "32px", margin: "0 auto 0 240px" }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg-base)" }}>
      {/* Mobile top bar */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "56px", padding: "0 20px",
        background: "#111113", borderBottom: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
      }}>
        <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent)" }}>Atlas</span>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "var(--foreground)" }}
        >
          <MenuIcon size={24} />
        </button>
      </header>

      {/* Mobile slide-over menu */}
      {mobileMenuOpen && (
        <>
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 60,
              background: "rgba(0,0,0,0.6)",
            }}
          />
          <nav style={{
            position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 70,
            width: "280px", background: "#111113",
            borderRight: "1px solid rgba(255,255,255,0.12)",
            padding: "24px 0",
            boxShadow: "4px 0 30px rgba(0,0,0,0.5)",
          }}>
            <div style={{ padding: "0 20px 24px", fontSize: "20px", fontWeight: 700, color: "var(--accent)" }}>Atlas</div>
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <a
                  key={item.key}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "0 20px", height: "48px",
                    color: isActive ? "var(--accent)" : "var(--foreground-muted)",
                    background: isActive ? "rgba(94,106,210,0.1)" : "transparent",
                    borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                    fontSize: "15px", fontWeight: isActive ? 600 : 400,
                    textDecoration: "none",
                  }}
                >
                  {item.icon}
                  {item.label}
                </a>
              );
            })}
          </nav>
        </>
      )}

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
