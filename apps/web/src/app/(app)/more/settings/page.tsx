"use client";

import Link from "next/link";
import { SettingsIcon } from "@atlas/ui";

export default function SettingsPage() {
  return (
    <div style={{ padding: "32px 16px 120px 16px", maxWidth: "512px", margin: "0 auto" }}>
      <header className="animate-fade-in-up" style={{ paddingBottom: "24px" }}>
        <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Settings</h1>
      </header>

      <div className="glass-elevated animate-fade-in-up" style={{ padding: "40px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <div style={{
          width: "56px",
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "9999px",
          background: "rgba(255,255,255,0.04)",
        }}>
          <SettingsIcon size={24} style={{ color: "var(--text-secondary)" }} />
        </div>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
          Coming soon
        </p>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", maxWidth: "240px" }}>
          Settings and preferences will be available in a future update.
        </p>
        <Link
          href="/more"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 20px",
            fontSize: "13px",
            fontWeight: 500,
            color: "white",
            background: "var(--accent)",
            borderRadius: "10px",
            textDecoration: "none",
            boxShadow: "0 0 20px var(--accent-glow)",
            transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          Back to More
        </Link>
      </div>
    </div>
  );
}
