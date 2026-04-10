"use client";

import { useState, useEffect, useCallback } from "react";
import {
  EnergySelector,
  TaskCard,
  HabitCheck,
  QuickCapture,
  SunIcon,
  MoonIcon,
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

export default function TodayPage() {
  const { text: greeting, icon: GreetingIcon } = getGreeting();
  const dateStr = formatDate();
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
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <header className="pb-6 pt-8">
          <h1 className="text-h1 text-[var(--foreground)]">{greeting}</h1>
          <p className="mt-1 text-[13px] text-[var(--foreground-muted)]">
            {dateStr}
          </p>
        </header>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[60px] skeleton"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <header className="pb-6 pt-8">
          <h1 className="text-h1 text-[var(--foreground)]">{greeting}</h1>
          <p className="mt-1 text-[13px] text-[var(--foreground-muted)]">
            {dateStr}
          </p>
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
      {/* Header with greeting + date */}
      <header className="pb-6 pt-8 animate-fade-in-up">
        <h1 className="text-h1 text-[var(--foreground)]">{greeting}</h1>
        <p className="mt-1 text-[13px] text-[var(--foreground-muted)]">
          {dateStr}
        </p>
      </header>

      {/* Energy Selector — segmented control */}
      <section className="pb-8 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <EnergySelector />
      </section>

      {/* Tasks Section */}
      <section className="pb-8 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h3 text-[var(--foreground)]">
            Tasks
            <span className="ml-2 text-[13px] font-normal text-[var(--foreground-muted)]">
              {activeTasks.length}
            </span>
          </h2>
          {totalEstimate > 0 && (
            <span className="text-[11px] text-[var(--foreground-muted)]">
              ~{totalEstimate >= 60 ? `${Math.round(totalEstimate / 60)}h` : `${totalEstimate}m`}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {tasks.length === 0 ? (
            <div className="glass-elevated px-4 py-10 text-center">
              <p className="text-[13px] text-[var(--foreground-muted)]">
                No tasks yet. Use quick capture below to add one.
              </p>
            </div>
          ) : (
            tasks.map((task, i) => (
              <div
                key={task.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${150 + i * 50}ms` }}
              >
                <TaskCard task={task} onToggle={handleToggle} showProject />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Habits Section */}
      <section className="pb-36 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <h2 className="mb-3 text-h3 text-[var(--foreground)]">
          Habits
          <span className="ml-2 text-[13px] font-normal text-[var(--foreground-muted)]">
            {habits.length}
          </span>
        </h2>
        {habits.length === 0 ? (
          <div className="glass-elevated px-4 py-8 text-center">
            <p className="text-[13px] text-[var(--foreground-muted)]">
              No habits configured yet.
            </p>
          </div>
        ) : habits.length <= 4 ? (
          /* Horizontal layout for 4 or fewer habits */
          <div className="grid grid-cols-2 gap-3">
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
        ) : (
          <div className="flex flex-col gap-3">
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

      {/* Quick Capture */}
      <QuickCapture onCapture={handleCapture} />
    </div>
  );
}
