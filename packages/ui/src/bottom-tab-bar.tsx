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
      className={`fixed bottom-0 left-0 right-0 z-50 ${className}`}
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "#111113",
        borderTop: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="mx-auto flex max-w-lg items-center justify-evenly"
        style={{ height: "64px", padding: "0 8px" }}
      >
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
                minWidth: "56px",
                minHeight: "48px",
              }}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] px-3 py-1.5 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.93] ${
                isActive
                  ? "text-[var(--accent)]"
                  : "text-[var(--foreground-muted)] active:text-[var(--foreground)]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className="flex items-center justify-center"
                style={{ width: "22px", height: "22px" }}
              >
                {tab.icon}
              </span>
              <span
                className="text-[12px]"
                style={{ fontWeight: isActive ? 700 : 500 }}
              >
                {tab.label}
              </span>
              {/* Active dot indicator below label */}
              {isActive && (
                <span
                  className="absolute rounded-full bg-[var(--accent)]"
                  style={{
                    width: "4px",
                    height: "4px",
                    bottom: "2px",
                    boxShadow: "0 0 6px var(--accent-glow)",
                  }}
                />
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
