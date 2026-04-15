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

// ProjectFilter mirrors the client filter for cache-local lookups.
type ProjectFilter struct {
	Status string
	Area   string
	Limit  int
	Offset int
}

// PutProjects upserts a batch of projects. See PutTasks for semantics.
func (c *Cache) PutProjects(projects []model.Project, freshFromServer bool) error {
	if len(projects) == 0 {
		return nil
	}
	tx, err := c.db.Begin()
	if err != nil {
		return fmt.Errorf("cache.PutProjects: begin: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	for _, p := range projects {
		blob, err := json.Marshal(p)
		if err != nil {
			return fmt.Errorf("cache: marshal project %d: %w", p.ID, err)
		}
		updatedAt := p.UpdatedAt.UTC().Format(time.RFC3339)
		dirty := 0
		if !freshFromServer {
			dirty = 1
		}
		if _, err := tx.Exec(
			`INSERT INTO projects(id, data, updated_at, dirty) VALUES(?, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, dirty = excluded.dirty`,
			p.ID, string(blob), updatedAt, dirty,
		); err != nil {
			return fmt.Errorf("cache: upsert project %d: %w", p.ID, err)
		}
	}
	return tx.Commit()
}

// ListProjects reads projects from the cache with in-memory filtering.
func (c *Cache) ListProjects(f ProjectFilter) ([]model.Project, error) {
	rows, err := c.db.Query(`SELECT data FROM projects ORDER BY id DESC`)
	if err != nil {
		return nil, fmt.Errorf("cache.ListProjects: %w", err)
	}
	defer rows.Close()
	var out []model.Project
	for rows.Next() {
		var blob string
		if err := rows.Scan(&blob); err != nil {
			return nil, err
		}
		var p model.Project
		if err := json.Unmarshal([]byte(blob), &p); err != nil {
			continue
		}
		if f.Status != "" && !strings.EqualFold(p.Status, f.Status) {
			continue
		}
		if f.Area != "" && !strings.EqualFold(p.Area, f.Area) {
			continue
		}
		out = append(out, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if f.Offset > 0 {
		if f.Offset >= len(out) {
			return []model.Project{}, nil
		}
		out = out[f.Offset:]
	}
	if f.Limit > 0 && len(out) > f.Limit {
		out = out[:f.Limit]
	}
	return out, nil
}

// GetProject returns one project by id.
func (c *Cache) GetProject(id int64) (model.Project, error) {
	var blob string
	err := c.db.QueryRow(`SELECT data FROM projects WHERE id = ?`, id).Scan(&blob)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return model.Project{}, err
		}
		return model.Project{}, fmt.Errorf("cache.GetProject: %w", err)
	}
	var p model.Project
	if err := json.Unmarshal([]byte(blob), &p); err != nil {
		return model.Project{}, err
	}
	return p, nil
}

// DeleteProject removes a project row.
func (c *Cache) DeleteProject(id int64) error {
	_, err := c.db.Exec(`DELETE FROM projects WHERE id = ?`, id)
	return err
}
