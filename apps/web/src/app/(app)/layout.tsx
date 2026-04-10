"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  HomeIcon,
  ListIcon,
  ClockIcon,
  MenuIcon,
  FolderIcon,
  type SidebarItem,
} from "@atlas/ui";

const navItems: SidebarItem[] = [
  { key: "today", label: "Today", icon: <HomeIcon size={20} />, href: "/today" },
  { key: "tasks", label: "Tasks", icon: <ListIcon size={20} />, href: "/tasks" },
  { key: "projects", label: "Projects", icon: <FolderIcon size={20} />, href: "/projects" },
  { key: "timer", label: "Timer", icon: <ClockIcon size={20} />, href: "/timer" },
  { key: "more", label: "More", icon: <MenuIcon size={20} />, href: "/more" },
];

function getActiveTab(pathname: string): string {
  if (pathname.startsWith("/today")) return "today";
  if (pathname.startsWith("/tasks")) return "tasks";
  if (pathname.startsWith("/projects")) return "projects";
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
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    setMenuMounted(true);
    // Force a layout read so the transition fires
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMenuVisible(true);
      });
    });
    setMobileMenuOpen(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setMobileMenuOpen(false);
    timeoutRef.current = setTimeout(() => {
      setMenuMounted(false);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (isDesktop) {
    return (
      <div style={{ display: "flex", minHeight: "100dvh", background: "var(--bg-base)" }}>
        <Sidebar items={navItems} activeItem={activeTab} />
        <main style={{ marginLeft: "240px", flex: 1, padding: "32px 48px", maxWidth: "1100px" }}>
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
        background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)",
      }}>
        <span style={{ fontSize: "18px", fontWeight: 600, color: "var(--accent)" }}>Atlas</span>
        <button
          onClick={() => mobileMenuOpen ? closeMenu() : openMenu()}
          style={{ width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "var(--text-primary)" }}
        >
          <MenuIcon size={24} />
        </button>
      </header>

      {/* Mobile slide-over menu (P0-01: animated) */}
      {menuMounted && (
        <>
          <div
            onClick={closeMenu}
            className={`mobile-overlay ${menuVisible ? "mobile-overlay-visible" : ""}`}
            style={{
              position: "fixed", inset: 0, zIndex: 60,
              background: "rgba(0,0,0,0.6)",
            }}
          />
          <nav
            className={`mobile-sidebar ${menuVisible ? "mobile-sidebar-visible" : ""}`}
            style={{
              position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 70,
              width: "280px", background: "var(--bg-deep)",
              borderRight: "1px solid var(--border)",
              padding: "24px 0",
            }}
          >
            <div style={{ padding: "0 20px 24px", fontSize: "20px", fontWeight: 600, color: "var(--accent)" }}>Atlas</div>
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={closeMenu}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "0 20px", height: "48px",
                    color: isActive ? "var(--accent)" : "var(--text-secondary)",
                    background: isActive ? "var(--accent-glow)" : "transparent",
                    borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                    fontSize: "15px", fontWeight: isActive ? 600 : 400,
                    textDecoration: "none",
                    transition: "all 200ms var(--ease-out-expo)",
                  }}
                >
                  {item.icon}
                  {item.label}
                </Link>
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
