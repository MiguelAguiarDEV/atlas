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
      className={className}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "var(--bg-elevated)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "flex",
          maxWidth: "512px",
          margin: "0 auto",
          alignItems: "center",
          justifyContent: "space-evenly",
          height: "64px",
          padding: "0 8px",
        }}
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
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                minWidth: "56px",
                minHeight: "48px",
                padding: "6px 12px",
                borderRadius: "10px",
                textDecoration: "none",
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
              }}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "22px",
                  height: "22px",
                }}
              >
                {tab.icon}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {tab.label}
              </span>
              {/* Active dot indicator below label */}
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    width: "4px",
                    height: "4px",
                    bottom: "2px",
                    borderRadius: "9999px",
                    background: "var(--accent)",
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
