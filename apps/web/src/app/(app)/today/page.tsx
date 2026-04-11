"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import {
  EnergySelector,
  TaskCard,
  HabitCheck,
  QuickCapture,
  SunIcon,
  MoonIcon,
  useIsDesktop,
  type TaskData,
} from "@atlas/ui";
import { listTasks, createTask, updateTask } from "@/lib/api/tasks";
import { listProjects, type ApiProject } from "@/lib/api/projects";
import { listHabits, completeHabit, type ApiHabit } from "@/lib/api/habits";
import { toTaskData } from "@/lib/mappers";

function getGreeting(): { text: string; icon: typeof SunIcon } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", icon: SunIcon };
  if (hour < 17) return { text: "Good afternoon", icon: SunIcon };
  return { text: "Good evening", icon: MoonIcon };
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

type EnergyLevel = "high" | "medium" | "low";

const ENERGY_STORAGE_KEY = "atlas-energy-level";

function loadEnergy(): EnergyLevel | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const stored = localStorage.getItem(ENERGY_STORAGE_KEY);
    if (stored === "high" || stored === "medium" || stored === "low") return stored;
  } catch { /* ignore */ }
  return undefined;
}

function saveEnergy(level: EnergyLevel) {
  try {
    localStorage.setItem(ENERGY_STORAGE_KEY, level);
  } catch { /* ignore */ }
}

export default function TodayPage() {
  const { text: greeting } = getGreeting();
  const dateStr = formatDate();
  const isDesktop = useIsDesktop();
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [habits, setHabits] = useState<ApiHabit[]>([]);
  const [completedHabits, setCompletedHabits] = useState<Set<number>>(
    new Set(),
  );
  const [projectMap, setProjectMap] = useState<Map<number, ApiProject>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | undefined>(undefined);

  // Load energy from localStorage on mount
  useEffect(() => {
    setEnergyLevel(loadEnergy());
  }, []);

  const handleEnergyChange = (level: EnergyLevel) => {
    setEnergyLevel(level);
    saveEnergy(level);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksRes, projectsRes, habitsRes] = await Promise.all([
        listTasks({ limit: 20 }),
        listProjects(),
        listHabits(),
      ]);

      const pMap = new Map<number, ApiProject>();
      for (const p of projectsRes.data ?? []) {
        pMap.set(p.id, p);
      }
      setProjectMap(pMap);
      setTasks(
        (tasksRes.data ?? [])
          .filter((t) => t.status !== "done")
          .map((t) => toTaskData(t, pMap)),
      );
      setHabits(habitsRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCapture = async (title: string) => {
    try {
      const res = await createTask({ title, priority: "p3", status: "inbox" });
      const newTask = toTaskData(res.data, projectMap);
      setTasks((prev) => [...prev, newTask]);
    } catch {
      const tempTask: TaskData = {
        id: `temp-${Date.now()}`,
        title,
        priority: 3,
        status: "inbox",
      };
      setTasks((prev) => [...prev, tempTask]);
    }
  };

  const handleToggle = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus = task.status === "done" ? "ready" : "done";
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
    );

    try {
      await updateTask(Number(id), { status: newStatus });
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: task.status } : t)),
      );
    }
  };

  const handleHabitToggle = async (idStr: string) => {
    const id = Number(idStr);
    if (completedHabits.has(id)) return;
    try {
      await completeHabit(id);
      setCompletedHabits((prev) => new Set(prev).add(id));
    } catch {
      // silently fail
    }
  };

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const totalEstimate = activeTasks.reduce(
    (acc, t) => acc + (t.estimatedMinutes || 0),
    0,
  );

  // Loading state
  if (loading) {
    return (
      <div style={{ padding: isDesktop ? "0" : "24px 20px 120px 20px", maxWidth: isDesktop ? "none" : "512px", margin: "0 auto" }}>
        <header style={{ paddingBottom: "24px" }}>
          <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>{greeting}</h1>
          <p style={{ marginTop: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>
            {dateStr}
          </p>
        </header>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: "74px", animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state (P1-09)
  if (error) {
    return (
      <div style={{ padding: isDesktop ? "0" : "24px 20px 120px 20px", maxWidth: isDesktop ? "none" : "512px", margin: "0 auto" }}>
        <header style={{ paddingBottom: "24px" }}>
          <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>{greeting}</h1>
          <p style={{ marginTop: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>
            {dateStr}
          </p>
        </header>
        <div className="glass-elevated" style={{ padding: "14px 16px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>
            Something went wrong loading your data.
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
              outline: "1px solid var(--accent)",
              outlineOffset: "2px",
              transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* --- Section header helper (extended with trailing slot) --- */
  const SectionHead = ({ title, count, trailing }: { title: string; count?: number; trailing?: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
      <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
        {title}
        {count !== undefined && (
          <span style={{
            marginLeft: "8px",
            fontSize: "12px",
            fontWeight: 600,
            background: "var(--accent-glow)",
            color: "var(--text-primary)",
            padding: "2px 8px",
            borderRadius: "9999px",
          }}>
            {count}
          </span>
        )}
      </h2>
      {trailing}
    </div>
  );

  const tasksSection = (
    <section className="animate-fade-in" style={{ paddingBottom: "32px" }}>
      <SectionHead
        title="Tasks"
        count={activeTasks.length}
        trailing={totalEstimate > 0 ? (
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", letterSpacing: "0.01em", fontVariantNumeric: "tabular-nums" }}>
            ~{totalEstimate >= 60 ? `${Math.round(totalEstimate / 60)}h` : `${totalEstimate}m`}
          </span>
        ) : null}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {tasks.length === 0 ? (
          <div className="glass-elevated" style={{ padding: "14px 16px", textAlign: "center" }}>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              No tasks yet. Use quick capture to add one.
            </p>
          </div>
        ) : (
          tasks.map((task, i) => (
            <div
              key={task.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${80 + i * 30}ms` }}
            >
              <TaskCard task={task} onToggle={handleToggle} showProject />
            </div>
          ))
        )}
      </div>
    </section>
  );

  const energySection = (
    <section className="animate-fade-in" style={{ paddingBottom: "32px" }}>
      <EnergySelector value={energyLevel} onChange={handleEnergyChange} />
    </section>
  );

  const habitsSection = (
    <section className="animate-fade-in" style={{ paddingBottom: "32px" }}>
      <SectionHead title="Habits" count={habits.length} />
      {habits.length === 0 ? (
        <div className="glass-elevated" style={{ padding: "14px 16px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            No habits configured yet.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {habits.map((habit) => (
            <HabitCheck
              key={habit.id}
              id={String(habit.id)}
              label={habit.name}
              defaultChecked={completedHabits.has(habit.id)}
              onToggle={handleHabitToggle}
            />
          ))}
        </div>
      )}
    </section>
  );

  const statsSection = (
    <section className="animate-fade-in">
      <SectionHead title="Overview" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div className="glass-elevated" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "14px 16px" }}>
          <span style={{ fontSize: "24px", fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{activeTasks.length}</span>
          <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>Active tasks</span>
        </div>
        <div className="glass-elevated" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "14px 16px" }}>
          <span style={{ fontSize: "24px", fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
            {totalEstimate >= 60 ? `${Math.round(totalEstimate / 60)}h` : `${totalEstimate}m`}
          </span>
          <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>Estimated</span>
        </div>
      </div>
    </section>
  );

  /* P1-06: Single component tree adapts via isDesktop */
  if (isDesktop) {
    return (
      <div className="animate-fade-in">
        <header className="animate-fade-in-up" style={{ paddingBottom: "24px" }}>
          <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>{greeting}</h1>
          <p style={{ marginTop: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>
            {dateStr}
          </p>
        </header>

        {/* Quick capture inline at top */}
        <div style={{ paddingBottom: "32px" }}>
          <QuickCapture onCapture={handleCapture} />
        </div>

        {/* Two column layout */}
        <div style={{ display: "flex", gap: "32px" }}>
          <div style={{ flex: "0 0 60%", minWidth: 0 }}>
            {tasksSection}
          </div>
          <div style={{ flex: "0 0 calc(40% - 32px)", minWidth: 0 }}>
            {energySection}
            {habitsSection}
            {statsSection}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: "24px 20px 120px 20px", maxWidth: "512px", margin: "0 auto" }}>
      <header className="animate-fade-in-up" style={{ paddingBottom: "24px" }}>
        <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>{greeting}</h1>
        <p style={{ marginTop: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>
          {dateStr}
        </p>
      </header>

      {/* Quick capture sticky at top of content (P0-03) */}
      <div style={{ paddingBottom: "24px" }}>
        <QuickCapture onCapture={handleCapture} />
      </div>

      {energySection}
      {tasksSection}
      {habitsSection}
    </div>
  );
}
