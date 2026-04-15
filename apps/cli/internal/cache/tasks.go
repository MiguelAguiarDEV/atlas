package cache

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

// TaskFilter mirrors the subset of client.TaskFilter that can be honored
// entirely from the local cache.
type TaskFilter struct {
	Status    string
	Priority  string
	ProjectID *int64
	Search    string
	Limit     int
	Offset    int
}

// PutTasks upserts many tasks at once in a single transaction. When
// freshFromServer is true the dirty flag is cleared (the server has the truth).
// When false, the caller is responsible for setting dirty (see enqueue paths).
func (c *Cache) PutTasks(tasks []model.Task, freshFromServer bool) error {
	if len(tasks) == 0 {
		return nil
	}
	tx, err := c.db.Begin()
	if err != nil {
		return fmt.Errorf("cache.PutTasks: begin: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	for _, t := range tasks {
		if err := upsertTaskTx(tx, t, freshFromServer); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// upsertTaskTx writes one task inside an open transaction.
func upsertTaskTx(tx *sql.Tx, t model.Task, fresh bool) error {
	blob, err := json.Marshal(t)
	if err != nil {
		return fmt.Errorf("cache: marshal task %d: %w", t.ID, err)
	}
	updatedAt := t.UpdatedAt.UTC().Format(time.RFC3339)

	if fresh {
		_, err = tx.Exec(
			`INSERT INTO tasks(id, data, updated_at, dirty) VALUES(?, ?, ?, 0)
			 ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, dirty = 0`,
			t.ID, string(blob), updatedAt,
		)
	} else {
		_, err = tx.Exec(
			`INSERT INTO tasks(id, data, updated_at, dirty) VALUES(?, ?, ?, 1)
			 ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, dirty = 1`,
			t.ID, string(blob), updatedAt,
		)
	}
	if err != nil {
		return fmt.Errorf("cache: upsert task %d: %w", t.ID, err)
	}
	return nil
}

// ListTasks reads tasks from the local cache, applying best-effort in-memory
// filtering for the fields in TaskFilter. This never contacts the server.
func (c *Cache) ListTasks(f TaskFilter) ([]model.Task, error) {
	rows, err := c.db.Query(`SELECT data FROM tasks ORDER BY id DESC`)
	if err != nil {
		return nil, fmt.Errorf("cache.ListTasks: query: %w", err)
	}
	defer rows.Close()

	var out []model.Task
	for rows.Next() {
		var blob string
		if err := rows.Scan(&blob); err != nil {
			return nil, fmt.Errorf("cache.ListTasks: scan: %w", err)
		}
		var t model.Task
		if err := json.Unmarshal([]byte(blob), &t); err != nil {
			// Skip corrupted rows rather than failing the whole list.
			continue
		}
		if !taskMatches(t, f) {
			continue
		}
		out = append(out, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("cache.ListTasks: rows: %w", err)
	}

	// Pagination after filtering.
	if f.Offset > 0 {
		if f.Offset >= len(out) {
			return []model.Task{}, nil
		}
		out = out[f.Offset:]
	}
	if f.Limit > 0 && len(out) > f.Limit {
		out = out[:f.Limit]
	}
	return out, nil
}

func taskMatches(t model.Task, f TaskFilter) bool {
	if f.Status != "" && !strings.EqualFold(t.Status, f.Status) {
		return false
	}
	if f.Priority != "" && !strings.EqualFold(t.Priority, f.Priority) {
		return false
	}
	if f.ProjectID != nil {
		if t.ProjectID == nil || *t.ProjectID != *f.ProjectID {
			return false
		}
	}
	if f.Search != "" {
		needle := strings.ToLower(f.Search)
		if !strings.Contains(strings.ToLower(t.Title), needle) {
			if t.Description == nil || !strings.Contains(strings.ToLower(*t.Description), needle) {
				return false
			}
		}
	}
	return true
}

// GetTask returns one task by id from the cache.
// Returns sql.ErrNoRows when not found.
func (c *Cache) GetTask(id int64) (model.Task, error) {
	var blob string
	err := c.db.QueryRow(`SELECT data FROM tasks WHERE id = ?`, id).Scan(&blob)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return model.Task{}, err
		}
		return model.Task{}, fmt.Errorf("cache.GetTask: %w", err)
	}
	var t model.Task
	if err := json.Unmarshal([]byte(blob), &t); err != nil {
		return model.Task{}, fmt.Errorf("cache.GetTask: unmarshal: %w", err)
	}
	return t, nil
}

// DeleteTask removes a task row from the cache (used after a delete sync).
func (c *Cache) DeleteTask(id int64) error {
	_, err := c.db.Exec(`DELETE FROM tasks WHERE id = ?`, id)
	return err
}
