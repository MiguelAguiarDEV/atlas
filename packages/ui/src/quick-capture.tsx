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
      <div className="mx-auto flex max-w-lg items-center gap-2 rounded-2xl border border-[var(--atlas-border)] bg-[var(--atlas-surface)] px-4 py-2 shadow-lg shadow-black/20">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="Quick capture..."
          className="flex-1 bg-transparent text-sm text-[var(--atlas-fg)] outline-none placeholder:text-[var(--atlas-muted)]"
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--atlas-accent)] text-white transition-all duration-200 active:scale-[0.95] disabled:opacity-30"
          aria-label="Add task"
        >
          <PlusIcon size={18} />
        </button>
      </div>
    </div>
  );
}
