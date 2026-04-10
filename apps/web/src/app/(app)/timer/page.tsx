"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TimerDisplay, ClockIcon } from "@atlas/ui";
import { listTasks, updateTask, type ApiTask } from "@/lib/api/tasks";
import {
  listTimeEntries,
  startTimer,
  stopTimer,
  type ApiTimeEntry,
} from "@/lib/api/time-entries";
import { formatDuration } from "@/lib/mappers";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

export default function TimerPage() {
  const isDesktop = useIsDesktop();
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [recentEntries, setRecentEntries] = useState<ApiTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [activeEntry, setActiveEntry] = useState<ApiTimeEntry | null>(null);
  const [timerLoading, setTimerLoading] = useState(false);
  const [timerError, setTimerError] = useState<string | null>(null);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksRes, entriesRes] = await Promise.all([
        listTasks({ limit: 50 }),
        listTimeEntries({ limit: 20 }),
      ]);

      const tasksList = tasksRes.data ?? [];
      const entriesList = entriesRes.data ?? [];
      setTasks(tasksList);
      setRecentEntries(entriesList.filter((e) => e.ended_at).slice(0, 5));

      // Check for an active (running) time entry
      const runningEntry = entriesList.find((e) => !e.ended_at);
      if (runningEntry) {
        setActiveEntry(runningEntry);
        setActiveTaskId(runningEntry.task_id);
        setTimerRunning(true);
        // Calculate elapsed seconds from started_at
        const startedAt = new Date(runningEntry.started_at).getTime();
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        setTimerSeconds(Math.max(0, elapsed));
      }

      // Find in_progress task as default
      const inProgressTask = tasksList.find((t) => t.status === "in_progress");
      if (!runningEntry && inProgressTask) {
        setActiveTaskId(inProgressTask.id);
      }
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

  // Timer tick
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds((s) => s + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning]);

  const handleStart = async () => {
    // If no task selected, show selector
    if (!activeTaskId) {
      setShowTaskSelector(true);
      return;
    }

    setTimerLoading(true);
    setTimerError(null);
    try {
      const res = await startTimer(activeTaskId);
      setActiveEntry(res.data);
      setTimerRunning(true);
      setTimerSeconds(0);
      setShowTaskSelector(false);
    } catch (err) {
      console.error("Failed to start timer:", err);
      setTimerError(err instanceof Error ? err.message : "Failed to start timer");
    } finally {
      setTimerLoading(false);
    }
  };

  const handleStop = async () => {
    if (!activeTaskId || !activeEntry) return;

    setTimerLoading(true);
    setTimerError(null);
    try {
      await stopTimer(activeTaskId);
      setTimerRunning(false);
      setActiveEntry(null);
      // Refresh entries to show the completed session
      const entriesRes = await listTimeEntries({ limit: 20 });
      setRecentEntries(
        (entriesRes.data ?? []).filter((e) => e.ended_at).slice(0, 5),
      );
    } catch (err) {
      console.error("Failed to stop timer:", err);
      setTimerError(err instanceof Error ? err.message : "Failed to stop timer");
    } finally {
      setTimerLoading(false);
    }
  };

  const handleReset = () => {
    setTimerSeconds(0);
    setTimerRunning(false);
    setActiveEntry(null);
  };

  const handleSelectTask = async (taskId: number) => {
    setActiveTaskId(taskId);
    setShowTaskSelector(false);
    // Auto-start after selecting
    setTimerLoading(true);
    setTimerError(null);
    try {
      // If the task is not in_progress, update it
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== "in_progress") {
        await updateTask(taskId, { status: "in_progress" });
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: "in_progress" } : t)),
        );
      }
      const res = await startTimer(taskId);
      setActiveEntry(res.data);
      setTimerRunning(true);
      setTimerSeconds(0);
    } catch (err) {
      console.error("Failed to start timer:", err);
      setTimerError(err instanceof Error ? err.message : "Failed to start timer");
    } finally {
      setTimerLoading(false);
    }
  };

  const currentTask = activeTaskId
    ? tasks.find((t) => t.id === activeTaskId)
    : tasks.find((t) => t.status === "in_progress");

  const availableTasks = tasks.filter(
    (t) => t.status !== "done" && t.status !== "in_review",
  );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEntries = recentEntries.filter(
    (e) => new Date(e.started_at) >= todayStart,
  );
  const todayTotalSecs = todayEntries.reduce(
    (acc, e) => acc + (e.duration_secs ?? 0),
    0,
  );

  const containerStyle: React.CSSProperties = isDesktop
    ? {}
    : { padding: "32px 20px 120px 20px", maxWidth: "512px", margin: "0 auto", overflow: "hidden" };

  // Loading state
  if (loading) {
    return (
      <div style={containerStyle}>
        <header style={{ paddingBottom: "24px" }}>
          <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Timer</h1>
          <p style={{ marginTop: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>
            Loading...
          </p>
        </header>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
          <div className="skeleton" style={{ width: "264px", height: "264px", borderRadius: "9999px" }} />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={containerStyle}>
        <header style={{ paddingBottom: "24px" }}>
          <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Timer</h1>
        </header>
        <div className="glass-elevated" style={{ padding: "32px 16px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>
            Something went wrong loading timer data.
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "16px" }}>
            {error}
          </p>
          <button
            onClick={fetchData}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: 500,
              color: "white",
              background: "var(--accent)",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              boxShadow: "0 0 20px var(--accent-glow)",
              transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* Task selector dropdown */
  const taskSelector = showTaskSelector ? (
    <div
      className="animate-fade-in glass-elevated"
      style={{
        padding: "16px",
        marginBottom: "24px",
        maxHeight: "280px",
        overflowY: "auto",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "12px" }}>
        Select a task to start timing
      </div>
      {availableTasks.length === 0 ? (
        <p style={{ fontSize: "13px", color: "var(--text-tertiary)", textAlign: "center", padding: "16px 0" }}>
          No available tasks. Create one first.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {availableTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => handleSelectTask(task.id)}
              disabled={timerLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                cursor: timerLoading ? "not-allowed" : "pointer",
                textAlign: "left",
                color: "var(--text-primary)",
                fontSize: "14px",
                fontWeight: 500,
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <span style={{
                width: "6px",
                height: "6px",
                borderRadius: "9999px",
                background: task.status === "in_progress" ? "var(--accent)" : "var(--text-tertiary)",
                flexShrink: 0,
              }} />
              <span style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {task.title}
              </span>
              <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-tertiary)", flexShrink: 0 }}>
                {task.status}
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setShowTaskSelector(false)}
        style={{
          marginTop: "12px",
          width: "100%",
          padding: "8px",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Cancel
      </button>
    </div>
  ) : null;

  /* Shared sections */
  const statsCards = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
      {/* Focus time card */}
      <div className="glass-elevated" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "20px 16px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9999px",
            background: "var(--accent-subtle)",
          }}
        >
          <ClockIcon size={18} style={{ color: "var(--accent)" }} />
        </div>
        <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>
          Focus time
        </span>
        <span
          style={{
            fontSize: "20px",
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {todayTotalSecs > 0 ? formatDuration(todayTotalSecs) : "0m"}
        </span>
      </div>

      {/* Sessions card */}
      <div className="glass-elevated" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "20px 16px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9999px",
            background: "rgba(42,245,152,0.12)",
          }}
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
        <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>
          Sessions
        </span>
        <span
          style={{
            fontSize: "20px",
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {todayEntries.length}
        </span>
      </div>
    </div>
  );

  const recentSessionsContent = recentEntries.length === 0 ? (
    <div className="glass-elevated" style={{ padding: "32px 16px", textAlign: "center" }}>
      <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
        No sessions yet. Start a timer above!
      </p>
    </div>
  ) : isDesktop ? (
    /* Desktop: table layout */
    <div className="glass-elevated" style={{ overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 120px 100px",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          gap: "12px",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>Task</span>
        <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>Time</span>
        <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", textAlign: "right" }}>Duration</span>
      </div>
      {recentEntries.map((entry, i) => {
        const task = tasks.find((t) => t.id === entry.task_id);
        const time = new Date(entry.started_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        return (
          <div
            key={entry.id}
            className="animate-fade-in-up"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px 100px",
              padding: "12px 16px",
              gap: "12px",
              borderBottom: i < recentEntries.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              animationDelay: `${200 + i * 50}ms`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "9999px", background: "var(--accent)", flexShrink: 0 }} />
              <span style={{ fontSize: "14px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {task?.title ?? "Unknown task"}
              </span>
            </div>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
              {time}
            </span>
            <span style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--text-secondary)",
              fontVariantNumeric: "tabular-nums",
              textAlign: "right",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              fontFamily: "var(--font-mono)",
            }}>
              {entry.duration_secs ? formatDuration(entry.duration_secs) : "--"}
            </span>
          </div>
        );
      })}
    </div>
  ) : (
    /* Mobile: simple list */
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {recentEntries.map((entry, i) => {
        const task = tasks.find((t) => t.id === entry.task_id);
        const time = new Date(entry.started_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        return (
          <div
            key={entry.id}
            className="animate-fade-in-up"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "10px",
              transition: "background 200ms cubic-bezier(0.16,1,0.3,1)",
              animationDelay: `${200 + i * 50}ms`,
            }}
          >
            <div style={{ width: "8px", height: "8px", borderRadius: "9999px", background: "var(--accent)", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "14px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {task?.title ?? "Unknown task"}
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                {time}
              </span>
            </div>
            <span style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--text-secondary)",
              fontVariantNumeric: "tabular-nums",
              fontFamily: "var(--font-mono)",
              flexShrink: 0,
            }}>
              {entry.duration_secs ? formatDuration(entry.duration_secs) : "--"}
            </span>
          </div>
        );
      })}
    </div>
  );

  /* P1-06: Single component tree */
  return (
    <div className="animate-fade-in" style={containerStyle}>
      <header className="animate-fade-in-up" style={{ paddingBottom: "24px" }}>
        <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Timer</h1>
        <p style={{ marginTop: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>
          Track your focus time
        </p>
      </header>

      {/* Timer error */}
      {timerError && (
        <div
          className="animate-fade-in"
          style={{
            padding: "10px 16px",
            marginBottom: "16px",
            borderRadius: "10px",
            background: "rgba(229,72,77,0.1)",
            border: "1px solid rgba(229,72,77,0.2)",
            fontSize: "13px",
            color: "var(--destructive)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{timerError}</span>
          <button
            onClick={() => setTimerError(null)}
            style={{
              background: "none",
              border: "none",
              color: "var(--destructive)",
              cursor: "pointer",
              fontSize: "16px",
              padding: "0 4px",
            }}
          >
            x
          </button>
        </div>
      )}

      {/* Task selector */}
      {taskSelector}

      {/* Timer - centered, optionally wider on desktop */}
      <section
        className="animate-fade-in-up"
        style={{
          display: "flex",
          justifyContent: "center",
          paddingBottom: "40px",
        }}
      >
        <div style={{ width: isDesktop ? "300px" : undefined }}>
          <TimerDisplay
            taskName={currentTask?.title ?? (timerRunning ? "Timer running" : "No task selected")}
            isRunning={timerRunning}
            initialSeconds={timerSeconds}
            onStart={handleStart}
            onStop={handleStop}
            onReset={handleReset}
            disabled={timerLoading}
          />
        </div>
      </section>

      {/* Current task indicator */}
      {!timerRunning && !showTaskSelector && (
        <div
          className="animate-fade-in"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: "24px",
          }}
        >
          <button
            onClick={() => setShowTaskSelector(true)}
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text-secondary)",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {currentTask ? `Switch task (${currentTask.title.slice(0, 30)}${currentTask.title.length > 30 ? "..." : ""})` : "Select a task"}
          </button>
        </div>
      )}

      {/* Stats */}
      <section className="animate-fade-in-up" style={{ paddingBottom: "32px" }}>
        {statsCards}
      </section>

      {/* Recent sessions */}
      <section className="animate-fade-in-up">
        <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
          Recent Sessions
        </h2>
        {recentSessionsContent}
      </section>
    </div>
  );
}
