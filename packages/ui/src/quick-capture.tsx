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
    <div
      className={`fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-4 pb-2 ${className}`}
    >
      <div
        className="mx-auto flex max-w-lg items-center gap-2 rounded-[var(--radius)] px-4"
        style={{
          background: "#111113",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
          height: "56px",
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
          className="flex-1 min-h-[44px] bg-transparent text-[14px] text-[var(--foreground)] outline-none placeholder:text-[rgba(255,255,255,0.35)]"
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px" }}
          className="flex items-center justify-center rounded-[var(--radius-xs)] bg-[var(--accent)] text-white transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.90] disabled:opacity-30 shadow-[0_0_12px_var(--accent-glow)]"
          aria-label="Add task"
        >
          <PlusIcon size={16} />
        </button>
      </div>
    </div>
  );
}
