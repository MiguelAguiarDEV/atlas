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

export default function TodayPage() {
  const { text: greeting, icon: GreetingIcon } = getGreeting();
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
      // Optimistic fallback: add a temporary task so the UI still feels responsive
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
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
    );

    try {
      await updateTask(Number(id), { status: newStatus });
    } catch {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: task.status } : t)),
      );
    }
  };

  const handleHabitToggle = async (idStr: string) => {
    const id = Number(idStr);
    if (completedHabits.has(id)) return; // Already completed today
    try {
      await completeHabit(id);
      setCompletedHabits((prev) => new Set(prev).add(id));
    } catch {
      // silently fail -- habit not marked
    }
  };

  const completedCount = tasks.filter((t) => t.status === "done").length;
  const totalEstimate = tasks.reduce(
    (acc, t) => acc + (t.estimatedMinutes || 0),
    0,
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <header className="pb-6 pt-8">
          <div className="flex items-center gap-2">
            <GreetingIcon size={20} className="text-[var(--atlas-warning)]" />
            <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--atlas-muted)]">Loading...</p>
        </header>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-[var(--atlas-surface)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <header className="pb-6 pt-8">
          <div className="flex items-center gap-2">
            <GreetingIcon size={20} className="text-[var(--atlas-warning)]" />
            <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
          </div>
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
        <div className="flex items-center gap-2">
          <GreetingIcon size={20} className="text-[var(--atlas-warning)]" />
          <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        </div>
        <p className="mt-1 text-sm text-[var(--atlas-muted)]">
          {completedCount}/{tasks.length} tasks &middot; ~
          {Math.round(totalEstimate / 60)}h estimated
        </p>
      </header>

      {/* Energy Selector */}
      <section className="pb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--atlas-muted)]">
          Energy Level
        </h2>
        <EnergySelector />
      </section>

      {/* Today's Tasks */}
      <section className="pb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--atlas-muted)]">
          Today&apos;s Tasks
        </h2>
        <div className="flex flex-col gap-2">
          {tasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--atlas-muted)]">
              No tasks yet. Use quick capture below to create one!
            </p>
          ) : (
            tasks.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={handleToggle} />
            ))
          )}
        </div>
      </section>

      {/* Habits */}
      <section className="pb-32">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--atlas-muted)]">
          Habits
        </h2>
        <div className="flex flex-col gap-2">
          {habits.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--atlas-muted)]">
              No habits yet. Create one from the API.
            </p>
          ) : (
            habits.map((habit) => (
              <HabitCheck
                key={habit.id}
                id={String(habit.id)}
                label={habit.name}
                defaultChecked={completedHabits.has(habit.id)}
                onToggle={handleHabitToggle}
              />
            ))
          )}
        </div>
      </section>

      {/* Quick Capture */}
      <QuickCapture onCapture={handleCapture} />
    </div>
  );
}
