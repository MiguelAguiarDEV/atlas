package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// InitSchema is the embedded SQL schema for Atlas.
// In production this would use embed.FS; here we inline the essential DDL.
const InitSchema = `
CREATE TABLE IF NOT EXISTS projects (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    color       TEXT DEFAULT '#3b82f6',
    icon        TEXT,
    area        TEXT NOT NULL DEFAULT 'projects',
    status      TEXT NOT NULL DEFAULT 'active',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
    id              BIGSERIAL PRIMARY KEY,
    project_id      BIGINT REFERENCES projects(id) ON DELETE SET NULL,
    parent_id       BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'inbox',
    priority        TEXT NOT NULL DEFAULT 'p2',
    energy          TEXT,
    estimated_mins  INTEGER,
    task_type       TEXT NOT NULL DEFAULT 'task',
    context_tags    TEXT[],
    deep_work       BOOLEAN NOT NULL DEFAULT false,
    quick_win       BOOLEAN NOT NULL DEFAULT false,
    recurrence      TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    due_at          TIMESTAMPTZ,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    tsv             TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_tsv ON tasks USING gin(tsv);

CREATE TABLE IF NOT EXISTS task_events (
    id          BIGSERIAL PRIMARY KEY,
    task_id     BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,
    payload     JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_events_task ON task_events(task_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS task_dependencies (
    blocker_id  BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    blocked_id  BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

CREATE TABLE IF NOT EXISTS time_entries (
    id              BIGSERIAL PRIMARY KEY,
    task_id         BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
    started_at      TIMESTAMPTZ NOT NULL,
    ended_at        TIMESTAMPTZ,
    duration_secs   INTEGER,
    entry_type      TEXT NOT NULL DEFAULT 'timer',
    source          TEXT NOT NULL DEFAULT 'web',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_started ON time_entries(started_at DESC);

CREATE TABLE IF NOT EXISTS habits (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    frequency       TEXT NOT NULL DEFAULT 'daily',
    target_count    INTEGER NOT NULL DEFAULT 1,
    habit_group     TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_completions (
    id          BIGSERIAL PRIMARY KEY,
    habit_id    BIGINT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    value       INTEGER NOT NULL DEFAULT 1,
    notes       TEXT
);

CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS links (
    id          BIGSERIAL PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_id   BIGINT NOT NULL,
    target_type TEXT NOT NULL,
    target_id   TEXT NOT NULL,
    link_type   TEXT NOT NULL DEFAULT 'references',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_type, target_id);

CREATE TABLE IF NOT EXISTS saved_views (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    view_type   TEXT NOT NULL DEFAULT 'list',
    filters     JSONB NOT NULL DEFAULT '{}',
    grouping    JSONB,
    sorting     JSONB,
    is_default  BOOLEAN NOT NULL DEFAULT false,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Normalize legacy status vocabulary. The canonical status set is:
--   inbox, ready, in_progress, in_review, done, cancelled
-- Older rows may still use 'todo' — remap them to 'inbox' so board columns
-- and list filter pills stay in sync.
UPDATE tasks SET status = 'inbox' WHERE status = 'todo';
`

// RunMigrations executes the schema DDL against the pool.
func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, InitSchema)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}
	return nil
}
