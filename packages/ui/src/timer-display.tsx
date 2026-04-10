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
    <div className={`flex flex-col items-center ${className}`} style={{ gap: "32px" }}>
      {/* Task name */}
      {taskName && (
        <p style={{
          maxWidth: "280px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "12px",
          fontWeight: 500,
          color: "var(--text-secondary)",
        }}>
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
            style={{
              fontSize: "48px",
              fontWeight: 300,
              letterSpacing: "0.04em",
              fontVariantNumeric: "tabular-nums",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {formatTime(seconds)}
          </span>
          {running && (
            <span style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--accent)",
            }}>
              <span className="pulsing-dot" style={{
                width: "6px",
                height: "6px",
                borderRadius: "9999px",
                background: "var(--accent)",
              }} />
              Focusing
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center" style={{ gap: "16px" }}>
        {/* P0-02: Large prominent play/stop button with inline styles */}
        <button
          onClick={running ? stop : start}
          style={{
            width: "72px",
            height: "72px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9999px",
            border: "none",
            cursor: "pointer",
            transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
            background: running
              ? "rgba(229,72,77,0.15)"
              : "var(--accent)",
            color: running
              ? "var(--destructive)"
              : "white",
            boxShadow: running
              ? "0 0 20px var(--destructive-glow)"
              : "0 0 24px var(--accent-glow)",
          }}
          aria-label={running ? "Stop timer" : "Start timer"}
        >
          {running ? <StopIcon size={28} /> : <PlayIcon size={28} />}
        </button>

        {seconds > 0 && !running && (
          <button
            onClick={reset}
            style={{
              padding: "10px 16px",
              minHeight: "44px",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text-secondary)",
              background: "transparent",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
