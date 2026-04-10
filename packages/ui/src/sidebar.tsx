"use client";

import { type ReactNode } from "react";

export interface SidebarItem {
  key: string;
  label: string;
  icon: ReactNode;
  href: string;
}

interface SidebarProps {
  items: SidebarItem[];
  activeItem: string;
  onItemClick?: (key: string) => void;
}

export function Sidebar({ items, activeItem, onItemClick }: SidebarProps) {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: "240px",
        display: "flex",
        background: "var(--bg-deep)",
        borderRight: "1px solid var(--border)",
        flexDirection: "column",
        zIndex: 50,
        overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px 32px 20px",
        }}
      >
        <span
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--accent)",
            letterSpacing: "-0.02em",
          }}
        >
          Atlas
        </span>
      </div>

      {/* Navigation Links */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          padding: "0 12px",
          flex: 1,
        }}
      >
        {items.map((item) => {
          const isActive = activeItem === item.key;
          return (
            <a
              key={item.key}
              href={item.href}
              onClick={(e) => {
                if (onItemClick) {
                  e.preventDefault();
                  onItemClick(item.key);
                }
              }}
              className="sidebar-nav-item"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                height: "32px",
                padding: "0 12px",
                borderRadius: "8px",
                textDecoration: "none",
                transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
                background: isActive
                  ? "var(--bg-surface)"
                  : "transparent",
                borderLeft: isActive
                  ? "3px solid var(--accent)"
                  : "3px solid transparent",
                color: isActive
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
                cursor: "pointer",
              }}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "20px",
                  height: "20px",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {item.label}
              </span>
            </a>
          );
        })}
      </div>

      {/* Bottom section - Settings link */}
      <div
        style={{
          padding: "16px 12px 24px 12px",
          borderTop: "1px solid var(--border)",
          marginTop: "auto",
        }}
      >
        <a
          href="/more/settings"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "0 12px",
            height: "32px",
            borderRadius: "8px",
            color: "var(--text-secondary)",
            fontSize: "13px",
            textDecoration: "none",
            transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
          }}
          className="sidebar-nav-item"
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "9999px",
              background: "rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-primary)",
              flexShrink: 0,
            }}
          >
            U
          </div>
          <span>Settings</span>
        </a>
      </div>
    </nav>
  );
}
