"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TaskData } from "./task-card";
import { FilterIcon, CheckIcon, CloseIcon, ChevronDownIcon } from "./icons";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TaskFilters {
  project?: number;
  priorities: number[];
  statuses: string[];
  taskType?: string;
  dueDate?: "overdue" | "today" | "this_week" | "no_due";
  energy?: string;
  search: string;
}

export interface ProjectOption {
  id: number;
  name: string;
}

export const DEFAULT_FILTERS: TaskFilters = {
  priorities: [],
  statuses: [],
  search: "",
};

/* ------------------------------------------------------------------ */
/*  Filter logic                                                       */
/* ------------------------------------------------------------------ */

export function applyFilters(tasks: TaskData[], filters: TaskFilters): TaskData[] {
  return tasks.filter((t) => {
    // Search
    if (
      filters.search &&
      !t.title.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }

    // Project
    if (filters.project !== undefined && t.projectId !== filters.project) {
      return false;
    }

    // Priorities
    if (filters.priorities.length > 0 && !filters.priorities.includes(t.priority)) {
      return false;
    }

    // Statuses
    if (
      filters.statuses.length > 0 &&
      t.status &&
      !filters.statuses.includes(t.status)
    ) {
      return false;
    }

    // Task type
    if (filters.taskType && t.taskType !== filters.taskType) {
      return false;
    }

    // Due date
    if (filters.dueDate) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

      if (filters.dueDate === "no_due") {
        if (t.dueDateRaw) return false;
      } else if (filters.dueDate === "overdue") {
        if (!t.dueDateRaw) return false;
        if (new Date(t.dueDateRaw) >= today) return false;
      } else if (filters.dueDate === "today") {
        if (!t.dueDateRaw) return false;
        const d = new Date(t.dueDateRaw);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (d < today || d >= tomorrow) return false;
      } else if (filters.dueDate === "this_week") {
        if (!t.dueDateRaw) return false;
        const d = new Date(t.dueDateRaw);
        if (d < today || d > endOfWeek) return false;
      }
    }

    // Energy
    if (filters.energy && t.energy !== filters.energy) {
      return false;
    }

    return true;
  });
}

export function countActiveFilters(filters: TaskFilters): number {
  let count = 0;
  if (filters.project !== undefined) count++;
  if (filters.priorities.length > 0) count++;
  if (filters.statuses.length > 0) count++;
  if (filters.taskType) count++;
  if (filters.dueDate) count++;
  if (filters.energy) count++;
  return count;
}

/* ------------------------------------------------------------------ */
/*  Dropdown (select-one)                                              */
/* ------------------------------------------------------------------ */

interface DropdownOption {
  value: string;
  label: string;
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const isActive = value !== "" && value !== options[0]?.value;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 12px",
          minHeight: "44px",
          fontSize: "13px",
          fontWeight: 500,
          borderRadius: "10px",
          border: isActive ? "1px solid var(--accent)" : "1px solid var(--border)",
          background: isActive ? "var(--accent-glow)" : "transparent",
          color: isActive ? "var(--accent)" : "var(--text-secondary)",
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "all 150ms ease",
        }}
      >
        {label}: {selected?.label ?? "All"}
        <ChevronDownIcon
          size={14}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
          }}
        />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 100,
            minWidth: "180px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            padding: "4px",
            maxHeight: "280px",
            overflowY: "auto",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                minHeight: "44px",
                padding: "10px 12px",
                fontSize: "13px",
                fontWeight: value === opt.value ? 600 : 400,
                color: value === opt.value ? "var(--accent)" : "var(--text-primary)",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 100ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <span>{opt.label}</span>
              {value === opt.value && <CheckIcon size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle pill group (multi-select)                                   */
/* ------------------------------------------------------------------ */

function PillGroup({
  label,
  options,
  selected,
  onChange,
  colorMap,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  colorMap?: Record<string, string>;
}) {
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <span
        style={{
          fontSize: "12px",
          fontWeight: 500,
          color: "var(--text-tertiary)",
          marginRight: "2px",
          whiteSpace: "nowrap",
        }}
      >
        {label}:
      </span>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        const accentColor = colorMap?.[opt.value] ?? "var(--accent)";
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            style={{
              padding: "8px 14px",
              minHeight: "44px",
              fontSize: "12px",
              fontWeight: 500,
              borderRadius: "9999px",
              border: active
                ? `1px solid ${accentColor}`
                : "1px solid var(--border)",
              background: active
                ? `color-mix(in srgb, ${accentColor} 12%, transparent)`
                : "transparent",
              color: active ? accentColor : "var(--text-secondary)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 150ms ease",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile filter panel                                                */
/* ------------------------------------------------------------------ */

function MobileFilterPanel({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: "relative",
          background: "var(--bg-elevated)",
          borderRadius: "16px 16px 0 0",
          padding: "20px",
          maxHeight: "80vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Filters
          </span>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            minHeight: "44px",
            fontSize: "14px",
            fontWeight: 600,
            color: "white",
            background: "var(--accent)",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FilterBar (main export)                                            */
/* ------------------------------------------------------------------ */

interface FilterBarProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  projects: ProjectOption[];
  totalCount: number;
  filteredCount: number;
  /** Lock project filter to a specific project (e.g., on project detail pages) */
  lockedProjectId?: number;
}

const PRIORITY_OPTIONS = [
  { value: "0", label: "P0" },
  { value: "1", label: "P1" },
  { value: "2", label: "P2" },
  { value: "3", label: "P3" },
];

const PRIORITY_COLORS: Record<string, string> = {
  "0": "var(--destructive)",
  "1": "var(--warning)",
  "2": "var(--accent)",
  "3": "var(--text-tertiary)",
};

const STATUS_OPTIONS = [
  { value: "inbox", label: "Inbox" },
  { value: "ready", label: "Ready" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
];

const TYPE_OPTIONS: DropdownOption[] = [
  { value: "", label: "All" },
  { value: "task", label: "Task" },
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "research", label: "Research" },
  { value: "review", label: "Review" },
];

const DUE_DATE_OPTIONS: DropdownOption[] = [
  { value: "", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "no_due", label: "No Due Date" },
];

const ENERGY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export function FilterBar({
  filters,
  onFiltersChange,
  projects,
  totalCount,
  filteredCount,
  lockedProjectId,
}: FilterBarProps) {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount = countActiveFilters(filters);
  const hasFilters = activeCount > 0;

  const update = useCallback(
    (patch: Partial<TaskFilters>) => {
      onFiltersChange({ ...filters, ...patch });
    },
    [filters, onFiltersChange],
  );

  const clearAll = () => {
    onFiltersChange({
      ...DEFAULT_FILTERS,
      search: filters.search,
      project: lockedProjectId,
    });
  };

  // Project dropdown options
  const projectOptions: DropdownOption[] = [
    { value: "", label: "All Projects" },
    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
  ];

  // Filter content (shared between desktop and mobile)
  const filterContent = (
    <>
      {/* Project dropdown (hidden if locked) */}
      {lockedProjectId === undefined && (
        <Dropdown
          label="Project"
          value={filters.project !== undefined ? String(filters.project) : ""}
          options={projectOptions}
          onChange={(v) =>
            update({ project: v ? Number(v) : undefined })
          }
        />
      )}

      {/* Priority pills */}
      <PillGroup
        label="Priority"
        options={PRIORITY_OPTIONS}
        selected={filters.priorities.map(String)}
        onChange={(vals) => update({ priorities: vals.map(Number) })}
        colorMap={PRIORITY_COLORS}
      />

      {/* Status pills */}
      <PillGroup
        label="Status"
        options={STATUS_OPTIONS}
        selected={filters.statuses}
        onChange={(vals) => update({ statuses: vals })}
      />

      {/* Type dropdown */}
      <Dropdown
        label="Type"
        value={filters.taskType ?? ""}
        options={TYPE_OPTIONS}
        onChange={(v) => update({ taskType: v || undefined })}
      />

      {/* Due date dropdown */}
      <Dropdown
        label="Due"
        value={filters.dueDate ?? ""}
        options={DUE_DATE_OPTIONS}
        onChange={(v) =>
          update({
            dueDate: (v as TaskFilters["dueDate"]) || undefined,
          })
        }
      />

      {/* Energy pills */}
      <PillGroup
        label="Energy"
        options={ENERGY_OPTIONS}
        selected={filters.energy ? [filters.energy] : []}
        onChange={(vals) => update({ energy: vals[vals.length - 1] || undefined })}
      />
    </>
  );

  /* Mobile: collapsed into a button */
  if (isMobile) {
    return (
      <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              minHeight: "44px",
              fontSize: "13px",
              fontWeight: 500,
              borderRadius: "10px",
              border: hasFilters
                ? "1px solid var(--accent)"
                : "1px solid var(--border)",
              background: hasFilters
                ? "var(--accent-glow)"
                : "var(--bg-elevated)",
              color: hasFilters ? "var(--accent)" : "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            <FilterIcon size={14} />
            Filters
            {activeCount > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "18px",
                  height: "18px",
                  fontSize: "11px",
                  fontWeight: 700,
                  borderRadius: "9999px",
                  background: "var(--accent)",
                  color: "white",
                }}
              >
                {activeCount}
              </span>
            )}
          </button>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--text-tertiary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {filteredCount} of {totalCount}
          </span>
        </div>
        <MobileFilterPanel
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {filterContent}
            {hasFilters && (
              <button
                onClick={clearAll}
                style={{
                  alignSelf: "flex-start",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  background: "none",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Clear all
              </button>
            )}
          </div>
        </MobileFilterPanel>
      </>
    );
  }

  /* Desktop: horizontal bar */
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "10px",
        background: "var(--bg-elevated)",
        borderRadius: "10px",
        padding: "10px 16px",
        border: "1px solid var(--border)",
      }}
    >
      {filterContent}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Counter + clear */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--text-tertiary)",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          Showing {filteredCount} of {totalCount} tasks
        </span>
        {hasFilters && (
          <button
            onClick={clearAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "8px 12px",
              minHeight: "40px",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--text-secondary)",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 150ms ease",
            }}
          >
            <CloseIcon size={12} />
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
