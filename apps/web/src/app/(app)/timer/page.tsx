"use client";

import { useState, useEffect, useCallback } from "react";
import { TimerDisplay, ClockIcon } from "@atlas/ui";
import { listTasks, type ApiTask } from "@/lib/api/tasks";
import {
  listTimeEntries,
  type ApiTimeEntry,
} from "@/lib/api/time-entries";
import { formatDuration } from "@/lib/mappers";

export default function TimerPage() {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [recentEntries, setRecentEntries] = useState<ApiTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksRes, entriesRes] = await Promise.all([
        listTasks({ limit: 50 }),
        listTimeEntries({ limit: 20 }),
      ]);

      setTasks(tasksRes.data ?? []);
      setRecentEntries(
        (entriesRes.data ?? []).filter((e) => e.ended_at).slice(0, 5),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load timer data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentTask = tasks.find((t) => t.status === "in_progress");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEntries = recentEntries.filter(
    (e) => new Date(e.started_at) >= todayStart,
  );
  const todayTotalSecs = todayEntries.reduce(
    (acc, e) => acc + (e.duration_secs ?? 0),
    0,
  );

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <header className="pb-6 pt-8">
          <h1 className="text-h1 text-[var(--foreground)]">Timer</h1>
          <p className="mt-1 text-[13px] text-[var(--foreground-muted)]">
            Loading...
          </p>
        </header>
        <div className="flex flex-col items-center gap-6">
          <div className="h-[264px] w-[264px] rounded-full skeleton" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <header className="pb-6 pt-8">
          <h1 className="text-h1 text-[var(--foreground)]">Timer</h1>
        </header>
        <div className="glass-elevated px-4 py-8 text-center">
          <p className="text-[13px] text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 inline-flex items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_0_20px_var(--accent-glow)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-safe">
      {/* Header */}
      <header className="pb-6 pt-8 animate-fade-in-up">
        <h1 className="text-h1 text-[var(--foreground)]">Timer</h1>
        <p className="mt-1 text-[13px] text-[var(--foreground-muted)]">
          Track your focus time
        </p>
      </header>

      {/* Timer Display */}
      <section className="pb-8 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <TimerDisplay
          taskName={currentTask?.title ?? "No task in progress"}
        />
      </section>

      {/* Today's Stats — glass cards */}
      <section className="pb-8 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <div className="grid grid-cols-2 gap-3">
          {/* Focus time card */}
          <div
            className="glass-elevated flex flex-col items-center gap-2 px-4 py-5"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "var(--accent-subtle)" }}
            >
              <ClockIcon size={18} className="text-[var(--accent)]" />
            </div>
            <span className="text-[12px] text-[var(--foreground-muted)]">
              Focus time
            </span>
            <span
              className="text-[20px] font-semibold tabular-nums text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {todayTotalSecs > 0 ? formatDuration(todayTotalSecs) : "0m"}
            </span>
          </div>

          {/* Sessions card */}
          <div
            className="glass-elevated flex flex-col items-center gap-2 px-4 py-5"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "rgba(34,197,94,0.12)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--success)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20V10M18 20V4M6 20v-4" />
              </svg>
            </div>
            <span className="text-[12px] text-[var(--foreground-muted)]">
              Sessions
            </span>
            <span
              className="text-[20px] font-semibold tabular-nums text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {todayEntries.length}
            </span>
          </div>
        </div>
      </section>

      {/* Recent Sessions */}
      <section className="pb-24 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        <h2 className="mb-3 text-h3 text-[var(--foreground)]">
          Recent Sessions
        </h2>
        <div className="flex flex-col gap-1">
          {recentEntries.length === 0 ? (
            <div className="glass-elevated px-4 py-8 text-center">
              <p className="text-[13px] text-[var(--foreground-muted)]">
                No sessions yet. Start a timer above!
              </p>
            </div>
          ) : (
            recentEntries.map((entry, i) => {
              const task = tasks.find((t) => t.id === entry.task_id);
              const time = new Date(entry.started_at).toLocaleTimeString(
                "en-US",
                { hour: "numeric", minute: "2-digit" },
              );
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-[var(--radius-sm)] px-4 py-3 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--surface)] animate-fade-in-up"
                  style={{ animationDelay: `${200 + i * 50}ms` }}
                >
                  <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] text-[var(--foreground)]">
                      {task?.title ?? "Unknown task"}
                    </span>
                    <span className="text-[12px] text-[var(--foreground-muted)]">
                      {time}
                    </span>
                  </div>
                  <span
                    className="shrink-0 text-[13px] font-medium text-[var(--foreground-muted)] tabular-nums"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {entry.duration_secs
                      ? formatDuration(entry.duration_secs)
                      : "--"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
