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
  const radius = 110;
  const svgSize = 264;
  const center = svgSize / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div className={`flex flex-col items-center gap-8 ${className}`}>
      {/* Task name */}
      {taskName && (
        <p className="max-w-[280px] truncate text-[13px] text-[var(--foreground-muted)]">
          {taskName}
        </p>
      )}

      {/* Timer ring */}
      <div className="relative flex items-center justify-center">
        <svg
          width={svgSize}
          height={svgSize}
          className={`-rotate-90 ${running ? "ring-glow-active" : ""}`}
        >
          <defs>
            <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="1" />
            </linearGradient>
          </defs>
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="3"
          />
          {/* Progress arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#timer-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>

        {/* Time display */}
        <div className="absolute flex flex-col items-center gap-1">
          <span
            className="text-[48px] font-light tracking-[0.04em] tabular-nums text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {formatTime(seconds)}
          </span>
          {running && (
            <span className="flex items-center gap-1.5 text-[12px] text-[var(--accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] pulsing-dot" />
              Focusing
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={running ? stop : start}
          className={`flex h-16 w-16 items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.93] ${
            running
              ? "bg-[var(--danger)]/15 text-[var(--danger)] shadow-[0_0_20px_var(--danger-glow)]"
              : "bg-[var(--accent)]/15 text-[var(--accent)] shadow-[0_0_20px_var(--accent-glow)]"
          }`}
          aria-label={running ? "Stop timer" : "Start timer"}
        >
          {running ? <StopIcon size={26} /> : <PlayIcon size={26} />}
        </button>

        {seconds > 0 && !running && (
          <button
            onClick={reset}
            className="rounded-[var(--radius-sm)] px-4 py-2.5 text-[13px] font-medium text-[var(--foreground-muted)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.06)] active:scale-[0.97] min-h-[44px]"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
