"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import {
  RepeatIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  HabitForm,
  ConfirmDialog,
  useIsDesktop,
  useMounted,
  type HabitFormValues,
} from "@atlas/ui";
import {
  listHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  completeHabit,
  type ApiHabit,
} from "@/lib/api/habits";

export default function HabitsPage() {
  const mounted = useMounted();
  const isDesktop = useIsDesktop();
  const effectiveDesktop = mounted && isDesktop;
  const [habits, setHabits] = useState<ApiHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingHabit, setEditingHabit] = useState<ApiHabit | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingHabit, setDeletingHabit] = useState<ApiHabit | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listHabits();
      setHabits(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load habits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (values: HabitFormValues) => {
    setCreating(true);
    try {
      const res = await createHabit(values);
      setHabits((prev) => [...prev, res.data]);
      setShowCreate(false);
    } catch (err) {
      console.error("Failed to create habit:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (values: HabitFormValues) => {
    if (!editingHabit) return;
    setSaving(true);
    try {
      const res = await updateHabit(editingHabit.id, values);
      setHabits((prev) =>
        prev.map((h) => (h.id === editingHabit.id ? res.data : h)),
      );
      setEditingHabit(null);
    } catch (err) {
      console.error("Failed to update habit:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingHabit) return;
    setDeleting(true);
    try {
      await deleteHabit(deletingHabit.id);
      setHabits((prev) => prev.filter((h) => h.id !== deletingHabit.id));
      setDeletingHabit(null);
    } catch (err) {
      console.error("Failed to delete habit:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await completeHabit(id);
    } catch (err) {
      console.error("Failed to complete habit:", err);
    }
  };

  const containerStyle: React.CSSProperties = effectiveDesktop
    ? {}
    : { padding: "24px 20px 120px 20px", maxWidth: "512px", margin: "0 auto" };

  if (loading) {
    return (
      <div style={containerStyle}>
        <header style={{ paddingBottom: "24px" }}>
          <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Habits</h1>
          <p style={{ marginTop: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>
            Loading...
          </p>
        </header>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: "72px", animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <header style={{ paddingBottom: "24px" }}>
          <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Habits</h1>
        </header>
        <div className="glass-elevated" style={{ padding: "32px 16px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>
            Something went wrong loading your habits.
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
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={containerStyle}>
      <header className="animate-fade-in-up" style={{ paddingBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Habits</h1>
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>
              {habits.length} habit{habits.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "11px 16px",
              minHeight: "44px",
              fontSize: "13px",
              fontWeight: 500,
              color: "white",
              background: "var(--accent)",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            <PlusIcon size={16} />
            New Habit
          </button>
        </div>
      </header>

      {habits.length === 0 ? (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", textAlign: "center" }}>
          <div style={{
            width: "56px",
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9999px",
            background: "var(--bg-elevated)",
            marginBottom: "16px",
          }}>
            <RepeatIcon size={24} style={{ color: "var(--text-secondary)" }} />
          </div>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>
            No habits yet
          </p>
          <p style={{ marginTop: "6px", maxWidth: "240px", fontSize: "12px", color: "var(--text-tertiary)" }}>
            Create your first habit to track it here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {habits.map((habit, i) => (
            <div
              key={habit.id}
              className="glass-elevated animate-fade-in-up"
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 16px",
                borderRadius: "10px",
                gap: "12px",
                animationDelay: `${50 + i * 40}ms`,
              }}
            >
              {/* Complete button */}
              <button
                onClick={() => handleComplete(habit.id)}
                aria-label={`Mark ${habit.name} complete`}
                style={{
                  width: "44px",
                  height: "44px",
                  minWidth: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "9999px",
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.24)",
                  color: "var(--habit-purple, #8b5cf6)",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <RepeatIcon size={18} />
              </button>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {habit.name}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {habit.frequency}
                  {habit.target_count > 1 ? ` - ${habit.target_count}x` : ""}
                  {habit.habit_group ? ` - ${habit.habit_group}` : ""}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                <button
                  onClick={() => setEditingHabit(habit)}
                  aria-label={`Edit ${habit.name}`}
                  style={{
                    width: "44px",
                    height: "44px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    borderRadius: "8px",
                  }}
                >
                  <EditIcon size={16} />
                </button>
                <button
                  onClick={() => setDeletingHabit(habit)}
                  aria-label={`Delete ${habit.name}`}
                  style={{
                    width: "44px",
                    height: "44px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    border: "none",
                    color: "var(--destructive)",
                    cursor: "pointer",
                    borderRadius: "8px",
                  }}
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      <HabitForm
        open={showCreate}
        mode="create"
        submitting={creating}
        onCancel={() => setShowCreate(false)}
        onSubmit={handleCreate}
      />

      {/* Edit form */}
      <HabitForm
        open={editingHabit !== null}
        mode="edit"
        initial={
          editingHabit
            ? {
                name: editingHabit.name,
                description: editingHabit.description,
                frequency: editingHabit.frequency,
                target_count: editingHabit.target_count,
                habit_group: editingHabit.habit_group,
              }
            : undefined
        }
        submitting={saving}
        onCancel={() => setEditingHabit(null)}
        onSubmit={handleEdit}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deletingHabit !== null}
        title="Delete habit?"
        message={
          deletingHabit
            ? `Delete "${deletingHabit.name}"? Past completions will be kept but the habit itself will be removed.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingHabit(null)}
      />
    </div>
  );
}
