"use client";

import { type ReactNode } from "react";

export interface Tab {
  key: string;
  label: string;
  icon: ReactNode;
  href: string;
}

interface BottomTabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange?: (key: string) => void;
  className?: string;
}

export function BottomTabBar({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: BottomTabBarProps) {
  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] ${className}`}
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "rgba(5,5,6,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <a
              key={tab.key}
              href={tab.href}
              onClick={(e) => {
                if (onTabChange) {
                  e.preventDefault();
                  onTabChange(tab.key);
                }
              }}
              style={{
                minWidth: "48px",
                minHeight: "48px",
              }}
              className={`relative flex flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] px-3 py-1.5 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.93] ${
                isActive
                  ? "text-[var(--accent)]"
                  : "text-[var(--foreground-muted)] active:text-[var(--foreground)]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active indicator line */}
              {isActive && (
                <span
                  className="absolute -top-1 h-[2px] w-5 rounded-full bg-[var(--accent)]"
                  style={{
                    boxShadow: "0 0 8px var(--accent-glow), 0 2px 12px var(--accent-glow)",
                  }}
                />
              )}
              <span className="flex h-6 w-6 items-center justify-center">
                {tab.icon}
              </span>
              <span className="text-[12px] font-medium">{tab.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
