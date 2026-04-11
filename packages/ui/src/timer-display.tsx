"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PlayIcon, StopIcon } from "./icons";

interface TimerDisplayProps {
  taskName?: string;
  className?: string;
  isRunning?: boolean;
  initialSeconds?: number;
  onStart?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  disabled?: boolean;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TimerDisplay({ taskName, className = "", isRunning: externalRunning, initialSeconds, onStart, onStop, onReset, disabled }: TimerDisplayProps) {
  const [seconds, setSeconds] = useState(initialSeconds ?? 0);
  const [internalRunning, setInternalRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Use external running state if provided, otherwise internal
  const running = externalRunning !== undefined ? externalRunning : internalRunning;

  // Sync initialSeconds when it changes externally
  useEffect(() => {
    if (initialSeconds !== undefined) {
      setSeconds(initialSeconds);
    }
  }, [initialSeconds]);

  const start = useCallback(() => {
    if (onStart) {
      onStart();
    } else {
      setInternalRunning(true);
    }
  }, [onStart]);

  const stop = useCallback(() => {
    if (onStop) {
      onStop();
    } else {
      setInternalRunning(false);
    }
  }, [onStop]);

  const reset = useCallback(() => {
    if (onReset) {
      onReset();
    } else {
      setInternalRunning(false);
      setSeconds(0);
    }
  }, [onReset]);

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
  const svgSize = 240;
  const radius = 104;
  const center = svgSize / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div className={`${className}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", maxWidth: "100%", overflow: "hidden" }}>
      {/* Task name */}
      {taskName && (
        <p style={{
          maxWidth: "280px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "14px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          letterSpacing: "0.01em",
        }}>
          {taskName}
        </p>
      )}

      {/* Timer ring */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "240px", height: "240px" }}>
        <svg
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          style={{ width: `${svgSize}px`, height: `${svgSize}px`, display: "block", transform: "rotate(-90deg)" }}
          className={running ? "ring-glow-active" : ""}
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
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="6"
          />
          {/* Progress arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#timer-gradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1000ms linear" }}
          />
        </svg>

        {/* Time display */}
        <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <span
            style={{
              fontSize: "44px",
              fontWeight: 300,
              letterSpacing: "0.02em",
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        {/* P0-02: Large prominent play/stop button with inline styles */}
        <button
          onClick={running ? stop : start}
          disabled={disabled}
          style={{
            width: "72px",
            height: "72px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9999px",
            border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
            opacity: disabled ? 0.5 : 1,
            background: running
              ? "rgba(229,72,77,0.15)"
              : "var(--accent)",
            color: running
              ? "var(--destructive)"
              : "white",
            boxShadow: running
              ? "0 0 40px rgba(229,72,77,0.35), inset 0 0 0 1px rgba(229,72,77,0.4)"
              : "0 0 48px rgba(94,106,210,0.45), inset 0 0 0 1px rgba(94,106,210,0.5)",
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
