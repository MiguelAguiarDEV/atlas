"use client";

import { TimerDisplay, ClockIcon } from "@atlas/ui";

const RECENT_SESSIONS = [
  { task: "Fix auth middleware", duration: "1h 23m", time: "2:30 PM" },
  { task: "Design wireframes", duration: "45m", time: "11:00 AM" },
  { task: "Code review PR #42", duration: "22m", time: "9:15 AM" },
];

export default function TimerPage() {
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
        <TimerDisplay taskName="Fix authentication middleware bug" />
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
            <p className="text-xl font-semibold">2h 30m</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[var(--atlas-muted)]">Sessions</p>
            <p className="text-xl font-semibold">3</p>
          </div>
        </div>
      </section>

      {/* Recent Sessions */}
      <section className="pb-24">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--atlas-muted)]">
          Recent Sessions
        </h2>
        <div className="flex flex-col gap-1">
          {RECENT_SESSIONS.map((session, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[var(--atlas-surface)]"
            >
              <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--atlas-accent)]" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm">{session.task}</span>
                <span className="text-xs text-[var(--atlas-muted)]">
                  {session.time}
                </span>
              </div>
              <span className="shrink-0 text-sm font-medium text-[var(--atlas-muted)]">
                {session.duration}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
