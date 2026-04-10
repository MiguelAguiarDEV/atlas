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
      // Show completed entries, most recent first
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

  // Pick the first in-progress task for the timer label
  const currentTask = tasks.find((t) => t.status === "in_progress");

  // Calculate today's totals from recent entries
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEntries = recentEntries.filter(
    (e) => new Date(e.started_at) >= todayStart,
  );
  const todayTotalSecs = todayEntries.reduce(
    (acc, e) => acc + (e.duration_secs ?? 0),
    0,
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <header className="pb-6 pt-8">
          <h1 className="text-2xl font-bold tracking-tight">Timer</h1>
          <p className="mt-1 text-sm text-[var(--atlas-muted)]">Loading...</p>
        </header>
        <div className="flex flex-col items-center gap-6">
          <div className="h-[264px] w-[264px] animate-pulse rounded-full bg-[var(--atlas-surface)]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <header className="pb-6 pt-8">
          <h1 className="text-2xl font-bold tracking-tight">Timer</h1>
        </header>
        <div className="rounded-xl bg-red-500/10 px-4 py-6 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 rounded-lg bg-[var(--atlas-accent)] px-4 py-2 text-sm text-white"
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
      <header className="pb-6 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Timer</h1>
        <p className="mt-1 text-sm text-[var(--atlas-muted)]">
          Track your focus time
        </p>
      </header>

      {/* Timer */}
      <section className="pb-8">
        <TimerDisplay
          taskName={currentTask?.title ?? "No task in progress"}
        />
      </section>

      {/* Today's Summary */}
      <section className="pb-6">
        <div className="flex items-center gap-4 rounded-xl bg-[var(--atlas-surface)] px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--atlas-accent)]/15">
            <ClockIcon size={20} className="text-[var(--atlas-accent)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[var(--atlas-muted)]">
              Today&apos;s focus time
            </p>
            <p className="text-xl font-semibold">
              {todayTotalSecs > 0 ? formatDuration(todayTotalSecs) : "0m"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[var(--atlas-muted)]">Sessions</p>
            <p className="text-xl font-semibold">{todayEntries.length}</p>
          </div>
        </div>
      </section>

      {/* Recent Sessions */}
      <section className="pb-24">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--atlas-muted)]">
          Recent Sessions
        </h2>
        <div className="flex flex-col gap-1">
          {recentEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--atlas-muted)]">
              No sessions yet. Start a timer above!
            </p>
          ) : (
            recentEntries.map((entry) => {
              const task = tasks.find((t) => t.id === entry.task_id);
              const time = new Date(entry.started_at).toLocaleTimeString(
                "en-US",
                { hour: "numeric", minute: "2-digit" },
              );
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[var(--atlas-surface)]"
                >
                  <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--atlas-accent)]" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">
                      {task?.title ?? "Unknown task"}
                    </span>
                    <span className="text-xs text-[var(--atlas-muted)]">
                      {time}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-[var(--atlas-muted)]">
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
