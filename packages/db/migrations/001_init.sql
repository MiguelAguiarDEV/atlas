-- Atlas Task Manager: Initial Schema
-- Personal productivity system

BEGIN;

-- Projects
CREATE TABLE projects (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    color       TEXT DEFAULT '#3b82f6',
    icon        TEXT,
    area        TEXT NOT NULL DEFAULT 'projects', -- PARA: projects, areas, resources, archive
    status      TEXT NOT NULL DEFAULT 'active',   -- active, paused, completed, archived
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE tasks (
    id              BIGSERIAL PRIMARY KEY,
    project_id      BIGINT REFERENCES projects(id) ON DELETE SET NULL,
    parent_id       BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'inbox',  -- inbox, triaged, ready, in_progress, in_review, done, cancelled, archived
    priority        TEXT NOT NULL DEFAULT 'p2',     -- p0, p1, p2, p3
    energy          TEXT,                           -- high, medium, low
    estimated_mins  INTEGER,                        -- estimated duration in minutes
    task_type       TEXT NOT NULL DEFAULT 'task',   -- task, bug, idea, research, review, habit
    context_tags    TEXT[],                         -- @home, @office, @commute, @phone, @computer, @errands
    deep_work       BOOLEAN NOT NULL DEFAULT false,
    quick_win       BOOLEAN NOT NULL DEFAULT false, -- completable in < 5 min
    recurrence      TEXT,                           -- cron expression for recurring tasks
    sort_order      INTEGER NOT NULL DEFAULT 0,
    due_at          TIMESTAMPTZ,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Full-text search
    tsv             TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due ON tasks(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX idx_tasks_tsv ON tasks USING gin(tsv);

-- Task Events (audit trail)
CREATE TABLE task_events (
    id          BIGSERIAL PRIMARY KEY,
    task_id     BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,   -- created, status_changed, priority_changed, assigned, commented, time_logged
    payload     JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_events_task ON task_events(task_id, occurred_at DESC);

-- Task Dependencies
CREATE TABLE task_dependencies (
    blocker_id  BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    blocked_id  BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

-- Time Entries
CREATE TABLE time_entries (
    id              BIGSERIAL PRIMARY KEY,
    task_id         BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
    started_at      TIMESTAMPTZ NOT NULL,
    ended_at        TIMESTAMPTZ,
    duration_secs   INTEGER,    -- computed or manual
    entry_type      TEXT NOT NULL DEFAULT 'timer',  -- timer, pomodoro, manual, timebox
    source          TEXT NOT NULL DEFAULT 'web',     -- web, mobile, cli, claude, jarvis
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_entries_task ON time_entries(task_id);
CREATE INDEX idx_time_entries_started ON time_entries(started_at DESC);

-- Habits
CREATE TABLE habits (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    frequency       TEXT NOT NULL DEFAULT 'daily',  -- daily, weekly, custom
    target_count    INTEGER NOT NULL DEFAULT 1,
    habit_group     TEXT,                           -- morning, evening, health, learning
    sort_order      INTEGER NOT NULL DEFAULT 0,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habit Completions
CREATE TABLE habit_completions (
    id          BIGSERIAL PRIMARY KEY,
    habit_id    BIGINT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    value       INTEGER NOT NULL DEFAULT 1,     -- for counted habits (e.g., glasses of water)
    notes       TEXT
);

CREATE INDEX idx_habit_completions_habit ON habit_completions(habit_id, completed_at DESC);

-- Links (cross-entity references)
CREATE TABLE links (
    id          BIGSERIAL PRIMARY KEY,
    source_type TEXT NOT NULL,   -- task, project, observation
    source_id   BIGINT NOT NULL,
    target_type TEXT NOT NULL,   -- task, project, observation, url
    target_id   TEXT NOT NULL,   -- bigint as text or URL
    link_type   TEXT NOT NULL DEFAULT 'references',  -- references, blocks, produced_by, context_for
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_links_source ON links(source_type, source_id);
CREATE INDEX idx_links_target ON links(target_type, target_id);

-- Saved Views
CREATE TABLE saved_views (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    view_type   TEXT NOT NULL DEFAULT 'list',  -- list, kanban, calendar, timeline, matrix, table, gallery
    filters     JSONB NOT NULL DEFAULT '{}',
    grouping    JSONB,
    sorting     JSONB,
    is_default  BOOLEAN NOT NULL DEFAULT false,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
