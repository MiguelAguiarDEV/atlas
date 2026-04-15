package cache

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

// HabitFilter mirrors client.HabitFilter.
type HabitFilter struct {
	Active *bool
	Group  string
	Limit  int
	Offset int
}

// PutHabits upserts a batch.
func (c *Cache) PutHabits(habits []model.Habit, freshFromServer bool) error {
	if len(habits) == 0 {
		return nil
	}
	tx, err := c.db.Begin()
	if err != nil {
		return fmt.Errorf("cache.PutHabits: begin: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	for _, h := range habits {
		blob, err := json.Marshal(h)
		if err != nil {
			return fmt.Errorf("cache: marshal habit %d: %w", h.ID, err)
		}
		updatedAt := h.CreatedAt.UTC().Format(time.RFC3339)
		dirty := 0
		if !freshFromServer {
			dirty = 1
		}
		if _, err := tx.Exec(
			`INSERT INTO habits(id, data, updated_at, dirty) VALUES(?, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, dirty = excluded.dirty`,
			h.ID, string(blob), updatedAt, dirty,
		); err != nil {
			return fmt.Errorf("cache: upsert habit %d: %w", h.ID, err)
		}
	}
	return tx.Commit()
}

// ListHabits reads habits from the cache.
func (c *Cache) ListHabits(f HabitFilter) ([]model.Habit, error) {
	rows, err := c.db.Query(`SELECT data FROM habits ORDER BY id DESC`)
	if err != nil {
		return nil, fmt.Errorf("cache.ListHabits: %w", err)
	}
	defer rows.Close()
	var out []model.Habit
	for rows.Next() {
		var blob string
		if err := rows.Scan(&blob); err != nil {
			return nil, err
		}
		var h model.Habit
		if err := json.Unmarshal([]byte(blob), &h); err != nil {
			continue
		}
		if f.Active != nil && h.Active != *f.Active {
			continue
		}
		if f.Group != "" {
			if h.HabitGroup == nil || *h.HabitGroup != f.Group {
				continue
			}
		}
		out = append(out, h)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if f.Offset > 0 {
		if f.Offset >= len(out) {
			return []model.Habit{}, nil
		}
		out = out[f.Offset:]
	}
	if f.Limit > 0 && len(out) > f.Limit {
		out = out[:f.Limit]
	}
	return out, nil
}

// GetHabit returns one habit by id.
func (c *Cache) GetHabit(id int64) (model.Habit, error) {
	var blob string
	err := c.db.QueryRow(`SELECT data FROM habits WHERE id = ?`, id).Scan(&blob)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return model.Habit{}, err
		}
		return model.Habit{}, err
	}
	var h model.Habit
	if err := json.Unmarshal([]byte(blob), &h); err != nil {
		return model.Habit{}, err
	}
	return h, nil
}

// DeleteHabit removes a row.
func (c *Cache) DeleteHabit(id int64) error {
	_, err := c.db.Exec(`DELETE FROM habits WHERE id = ?`, id)
	return err
}
