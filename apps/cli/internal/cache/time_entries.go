package cache

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

// TimeEntryFilter mirrors client.TimeFilter.
type TimeEntryFilter struct {
	TaskID *int64
	Limit  int
	Offset int
}

// PutTimeEntries upserts a batch.
func (c *Cache) PutTimeEntries(entries []model.TimeEntry, freshFromServer bool) error {
	if len(entries) == 0 {
		return nil
	}
	tx, err := c.db.Begin()
	if err != nil {
		return fmt.Errorf("cache.PutTimeEntries: begin: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	for _, e := range entries {
		blob, err := json.Marshal(e)
		if err != nil {
			return fmt.Errorf("cache: marshal time entry %d: %w", e.ID, err)
		}
		// Use CreatedAt as updated_at proxy (TimeEntry has no UpdatedAt field).
		updatedAt := e.CreatedAt.UTC().Format(time.RFC3339)
		dirty := 0
		if !freshFromServer {
			dirty = 1
		}
		if _, err := tx.Exec(
			`INSERT INTO time_entries(id, data, updated_at, dirty) VALUES(?, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, dirty = excluded.dirty`,
			e.ID, string(blob), updatedAt, dirty,
		); err != nil {
			return fmt.Errorf("cache: upsert time entry %d: %w", e.ID, err)
		}
	}
	return tx.Commit()
}

// ListTimeEntries reads entries from the cache.
func (c *Cache) ListTimeEntries(f TimeEntryFilter) ([]model.TimeEntry, error) {
	rows, err := c.db.Query(`SELECT data FROM time_entries ORDER BY id DESC`)
	if err != nil {
		return nil, fmt.Errorf("cache.ListTimeEntries: %w", err)
	}
	defer rows.Close()
	var out []model.TimeEntry
	for rows.Next() {
		var blob string
		if err := rows.Scan(&blob); err != nil {
			return nil, err
		}
		var e model.TimeEntry
		if err := json.Unmarshal([]byte(blob), &e); err != nil {
			continue
		}
		if f.TaskID != nil {
			if e.TaskID == nil || *e.TaskID != *f.TaskID {
				continue
			}
		}
		out = append(out, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if f.Offset > 0 {
		if f.Offset >= len(out) {
			return []model.TimeEntry{}, nil
		}
		out = out[f.Offset:]
	}
	if f.Limit > 0 && len(out) > f.Limit {
		out = out[:f.Limit]
	}
	return out, nil
}

// GetTimeEntry returns one entry by id.
func (c *Cache) GetTimeEntry(id int64) (model.TimeEntry, error) {
	var blob string
	err := c.db.QueryRow(`SELECT data FROM time_entries WHERE id = ?`, id).Scan(&blob)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return model.TimeEntry{}, err
		}
		return model.TimeEntry{}, err
	}
	var e model.TimeEntry
	if err := json.Unmarshal([]byte(blob), &e); err != nil {
		return model.TimeEntry{}, err
	}
	return e, nil
}

// DeleteTimeEntry removes a row.
func (c *Cache) DeleteTimeEntry(id int64) error {
	_, err := c.db.Exec(`DELETE FROM time_entries WHERE id = ?`, id)
	return err
}
