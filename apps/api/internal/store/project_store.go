package store

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/model"
)

// PgProjectStore is the PostgreSQL implementation of ProjectStore.
type PgProjectStore struct {
	pool *pgxpool.Pool
}

// NewPgProjectStore creates a new PgProjectStore.
func NewPgProjectStore(pool *pgxpool.Pool) *PgProjectStore {
	return &PgProjectStore{pool: pool}
}

func (s *PgProjectStore) List(ctx context.Context, limit, offset int) (ListResult[model.Project], error) {
	var result ListResult[model.Project]

	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	err := s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM projects").Scan(&result.Total)
	if err != nil {
		return result, fmt.Errorf("count projects: %w", err)
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, name, description, color, icon, area, status, sort_order, created_at, updated_at
		FROM projects ORDER BY sort_order, name
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return result, fmt.Errorf("list projects: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var p model.Project
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Color, &p.Icon,
			&p.Area, &p.Status, &p.SortOrder, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return result, fmt.Errorf("scan project: %w", err)
		}
		result.Items = append(result.Items, p)
	}
	if result.Items == nil {
		result.Items = []model.Project{}
	}
	return result, rows.Err()
}

func (s *PgProjectStore) GetByID(ctx context.Context, id int64) (model.Project, error) {
	var p model.Project
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, description, color, icon, area, status, sort_order, created_at, updated_at
		FROM projects WHERE id = $1`, id).Scan(
		&p.ID, &p.Name, &p.Description, &p.Color, &p.Icon,
		&p.Area, &p.Status, &p.SortOrder, &p.CreatedAt, &p.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return p, ErrNotFound
	}
	return p, err
}

func (s *PgProjectStore) Create(ctx context.Context, input model.CreateProjectInput) (model.Project, error) {
	if input.Name == "" {
		return model.Project{}, ErrInvalidInput
	}

	color := "#3b82f6"
	if input.Color != nil {
		color = *input.Color
	}
	area := "projects"
	if input.Area != nil {
		area = *input.Area
	}
	status := "active"
	if input.Status != nil {
		status = *input.Status
	}
	sortOrder := 0
	if input.SortOrder != nil {
		sortOrder = *input.SortOrder
	}

	var p model.Project
	err := s.pool.QueryRow(ctx, `
		INSERT INTO projects (name, description, color, icon, area, status, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, name, description, color, icon, area, status, sort_order, created_at, updated_at`,
		input.Name, input.Description, color, input.Icon, area, status, sortOrder,
	).Scan(&p.ID, &p.Name, &p.Description, &p.Color, &p.Icon,
		&p.Area, &p.Status, &p.SortOrder, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

func (s *PgProjectStore) Update(ctx context.Context, id int64, input model.UpdateProjectInput) (model.Project, error) {
	_, err := s.GetByID(ctx, id)
	if err != nil {
		return model.Project{}, err
	}

	sets := []string{}
	args := []interface{}{}
	argIdx := 1

	if input.Name != nil {
		if *input.Name == "" {
			return model.Project{}, ErrInvalidInput
		}
		sets = append(sets, fmt.Sprintf("name = $%d", argIdx))
		args = append(args, *input.Name)
		argIdx++
	}
	if input.Description != nil {
		sets = append(sets, fmt.Sprintf("description = $%d", argIdx))
		args = append(args, *input.Description)
		argIdx++
	}
	if input.Color != nil {
		sets = append(sets, fmt.Sprintf("color = $%d", argIdx))
		args = append(args, *input.Color)
		argIdx++
	}
	if input.Icon != nil {
		sets = append(sets, fmt.Sprintf("icon = $%d", argIdx))
		args = append(args, *input.Icon)
		argIdx++
	}
	if input.Area != nil {
		sets = append(sets, fmt.Sprintf("area = $%d", argIdx))
		args = append(args, *input.Area)
		argIdx++
	}
	if input.Status != nil {
		sets = append(sets, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, *input.Status)
		argIdx++
	}
	if input.SortOrder != nil {
		sets = append(sets, fmt.Sprintf("sort_order = $%d", argIdx))
		args = append(args, *input.SortOrder)
		argIdx++
	}

	if len(sets) == 0 {
		return s.GetByID(ctx, id)
	}

	sets = append(sets, fmt.Sprintf("updated_at = $%d", argIdx))
	args = append(args, time.Now())
	argIdx++

	args = append(args, id)
	query := fmt.Sprintf(`
		UPDATE projects SET %s WHERE id = $%d
		RETURNING id, name, description, color, icon, area, status, sort_order, created_at, updated_at`,
		strings.Join(sets, ", "), argIdx)

	var p model.Project
	err = s.pool.QueryRow(ctx, query, args...).Scan(
		&p.ID, &p.Name, &p.Description, &p.Color, &p.Icon,
		&p.Area, &p.Status, &p.SortOrder, &p.CreatedAt, &p.UpdatedAt,
	)
	return p, err
}

func (s *PgProjectStore) Delete(ctx context.Context, id int64) error {
	tag, err := s.pool.Exec(ctx, "DELETE FROM projects WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("delete project: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
