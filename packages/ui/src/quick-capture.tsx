"use client";

import { useState, useRef } from "react";
import { PlusIcon } from "./icons";

interface QuickCaptureProps {
  onCapture?: (title: string) => void;
  className?: string;
}

export function QuickCapture({ onCapture, className = "" }: QuickCaptureProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onCapture?.(trimmed);
    setValue("");
    inputRef.current?.blur();
  };

  return (
    <div className={className} style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "0 12px",
          height: "56px",
          transition: "border-color 200ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="Quick capture..."
          style={{
            flex: 1,
            minHeight: "44px",
            background: "transparent",
            fontSize: "14px",
            color: "var(--text-primary)",
            border: "none",
            outline: "none",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          style={{
            width: "44px",
            height: "44px",
            minWidth: "44px",
            minHeight: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
            background: "var(--accent)",
            color: "white",
            border: "none",
            cursor: "pointer",
            transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
            opacity: value.trim() ? 1 : 0.3,
            boxShadow: "0 0 12px var(--accent-glow)",
          }}
          aria-label="Add task"
        >
          <PlusIcon size={16} />
        </button>
      </div>
    </div>
  );
}
