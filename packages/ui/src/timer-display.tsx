"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PlayIcon, StopIcon } from "./icons";

interface TimerDisplayProps {
  taskName?: string;
  className?: string;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TimerDisplay({ taskName, className = "" }: TimerDisplayProps) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setSeconds(0);
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const progress = Math.min((seconds % 3600) / 3600, 1);
  const circumference = 2 * Math.PI * 120;
  const offset = circumference * (1 - progress);

  return (
    <div className={`flex flex-col items-center gap-6 ${className}`}>
      {taskName && (
        <p className="text-sm text-[var(--atlas-muted)]">{taskName}</p>
      )}

      <div className="relative flex items-center justify-center">
        <svg width="264" height="264" className="-rotate-90">
          <circle
            cx="132"
            cy="132"
            r="120"
            fill="none"
            stroke="var(--atlas-border)"
            strokeWidth="4"
          />
          <circle
            cx="132"
            cy="132"
            r="120"
            fill="none"
            stroke="var(--atlas-accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <span className="absolute font-mono text-5xl font-light tracking-wider">
          {formatTime(seconds)}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={running ? stop : start}
          className={`flex h-16 w-16 items-center justify-center rounded-full transition-all duration-200 active:scale-[0.95] ${
            running
              ? "bg-red-500/20 text-red-400"
              : "bg-[var(--atlas-accent)]/20 text-[var(--atlas-accent)]"
          }`}
          aria-label={running ? "Stop timer" : "Start timer"}
        >
          {running ? <StopIcon size={28} /> : <PlayIcon size={28} />}
        </button>

        {seconds > 0 && !running && (
          <button
            onClick={reset}
            className="rounded-lg px-4 py-2 text-sm text-[var(--atlas-muted)] transition-colors hover:text-[var(--atlas-fg)]"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
