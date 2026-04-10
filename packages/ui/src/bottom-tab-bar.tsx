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
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--atlas-border)] bg-[var(--atlas-bg)]/95 backdrop-blur-md ${className}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
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
              className={`flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors duration-200 ${
                isActive
                  ? "text-[var(--atlas-accent)]"
                  : "text-[var(--atlas-muted)] active:text-[var(--atlas-fg)]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="flex h-6 w-6 items-center justify-center">
                {tab.icon}
              </span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
