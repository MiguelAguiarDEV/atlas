"use client";

import { useState } from "react";
import {
  EnergySelector,
  TaskCard,
  HabitCheck,
  QuickCapture,
  SunIcon,
  MoonIcon,
  type TaskData,
} from "@atlas/ui";

function getGreeting(): { text: string; icon: typeof SunIcon } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", icon: SunIcon };
  if (hour < 17) return { text: "Good afternoon", icon: SunIcon };
  return { text: "Good evening", icon: MoonIcon };
}

const MOCK_TASKS: TaskData[] = [
  {
    id: "1",
    title: "Fix authentication middleware bug",
    priority: 0,
    estimatedMinutes: 60,
    project: "Atlas",
    status: "in_progress",
  },
  {
    id: "2",
    title: "Design onboarding flow wireframes",
    priority: 1,
    estimatedMinutes: 120,
    project: "Atlas",
    status: "ready",
  },
  {
    id: "3",
    title: "Write API documentation for /tasks endpoint",
    priority: 1,
    estimatedMinutes: 45,
    project: "Atlas",
    status: "ready",
  },
  {
    id: "4",
    title: "Review pull request #42",
    priority: 2,
    estimatedMinutes: 30,
    project: "Atlas",
    status: "ready",
  },
  {
    id: "5",
    title: "Update dependencies to latest versions",
    priority: 3,
    estimatedMinutes: 15,
    project: "Atlas",
    status: "ready",
  },
];

const MOCK_HABITS = [
  { id: "h1", label: "Morning exercise", streak: 12 },
  { id: "h2", label: "Read 30 minutes", streak: 5 },
  { id: "h3", label: "Review inbox zero", streak: 3 },
];

export default function TodayPage() {
  const { text: greeting, icon: GreetingIcon } = getGreeting();
  const [tasks, setTasks] = useState<TaskData[]>(MOCK_TASKS);

  const handleCapture = (title: string) => {
    const newTask: TaskData = {
      id: `new-${Date.now()}`,
      title,
      priority: 3,
      status: "inbox",
    };
    setTasks((prev) => [...prev, newTask]);
  };

  const completedCount = tasks.filter((t) => t.status === "done").length;
  const totalEstimate = tasks.reduce(
    (acc, t) => acc + (t.estimatedMinutes || 0),
    0
  );

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
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={(id) => {
                setTasks((prev) =>
                  prev.map((t) =>
                    t.id === id
                      ? { ...t, status: t.status === "done" ? "ready" : "done" }
                      : t
                  )
                );
              }}
            />
          ))}
        </div>
      </section>

      {/* Habits */}
      <section className="pb-32">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--atlas-muted)]">
          Habits
        </h2>
        <div className="flex flex-col gap-2">
          {MOCK_HABITS.map((habit) => (
            <HabitCheck
              key={habit.id}
              id={habit.id}
              label={habit.label}
              streak={habit.streak}
            />
          ))}
        </div>
      </section>

      {/* Quick Capture */}
      <QuickCapture onCapture={handleCapture} />
    </div>
  );
}
