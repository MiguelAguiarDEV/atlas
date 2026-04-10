package store

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/model"
)

// PgHabitStore is the PostgreSQL implementation of HabitStore.
type PgHabitStore struct {
	pool *pgxpool.Pool
}

// NewPgHabitStore creates a new PgHabitStore.
func NewPgHabitStore(pool *pgxpool.Pool) *PgHabitStore {
	return &PgHabitStore{pool: pool}
}

func (s *PgHabitStore) List(ctx context.Context, limit, offset int) (ListResult[model.Habit], error) {
	var result ListResult[model.Habit]

	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	err := s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM habits").Scan(&result.Total)
	if err != nil {
		return result, fmt.Errorf("count habits: %w", err)
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, name, description, frequency, target_count, habit_group, sort_order, active, created_at
		FROM habits ORDER BY sort_order, name
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return result, fmt.Errorf("list habits: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var h model.Habit
		if err := rows.Scan(&h.ID, &h.Name, &h.Description, &h.Frequency,
			&h.TargetCount, &h.HabitGroup, &h.SortOrder, &h.Active, &h.CreatedAt); err != nil {
			return result, fmt.Errorf("scan habit: %w", err)
		}
		result.Items = append(result.Items, h)
	}
	if result.Items == nil {
		result.Items = []model.Habit{}
	}
	return result, rows.Err()
}

func (s *PgHabitStore) GetByID(ctx context.Context, id int64) (model.Habit, error) {
	var h model.Habit
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, description, frequency, target_count, habit_group, sort_order, active, created_at
		FROM habits WHERE id = $1`, id).Scan(
		&h.ID, &h.Name, &h.Description, &h.Frequency,
		&h.TargetCount, &h.HabitGroup, &h.SortOrder, &h.Active, &h.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return h, ErrNotFound
	}
	return h, err
}

func (s *PgHabitStore) Create(ctx context.Context, input model.CreateHabitInput) (model.Habit, error) {
	if input.Name == "" {
		return model.Habit{}, ErrInvalidInput
	}

	frequency := "daily"
	if input.Frequency != nil {
		frequency = *input.Frequency
	}
	targetCount := 1
	if input.TargetCount != nil {
		targetCount = *input.TargetCount
	}
	sortOrder := 0
	if input.SortOrder != nil {
		sortOrder = *input.SortOrder
	}

	var h model.Habit
	err := s.pool.QueryRow(ctx, `
		INSERT INTO habits (name, description, frequency, target_count, habit_group, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, description, frequency, target_count, habit_group, sort_order, active, created_at`,
		input.Name, input.Description, frequency, targetCount, input.HabitGroup, sortOrder,
	).Scan(&h.ID, &h.Name, &h.Description, &h.Frequency,
		&h.TargetCount, &h.HabitGroup, &h.SortOrder, &h.Active, &h.CreatedAt)
	return h, err
}

func (s *PgHabitStore) Update(ctx context.Context, id int64, input model.UpdateHabitInput) (model.Habit, error) {
	_, err := s.GetByID(ctx, id)
	if err != nil {
		return model.Habit{}, err
	}

	sets := []string{}
	args := []interface{}{}
	argIdx := 1

	if input.Name != nil {
		if *input.Name == "" {
			return model.Habit{}, ErrInvalidInput
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
	if input.Frequency != nil {
		sets = append(sets, fmt.Sprintf("frequency = $%d", argIdx))
		args = append(args, *input.Frequency)
		argIdx++
	}
	if input.TargetCount != nil {
		sets = append(sets, fmt.Sprintf("target_count = $%d", argIdx))
		args = append(args, *input.TargetCount)
		argIdx++
	}
	if input.HabitGroup != nil {
		sets = append(sets, fmt.Sprintf("habit_group = $%d", argIdx))
		args = append(args, *input.HabitGroup)
		argIdx++
	}
	if input.SortOrder != nil {
		sets = append(sets, fmt.Sprintf("sort_order = $%d", argIdx))
		args = append(args, *input.SortOrder)
		argIdx++
	}
	if input.Active != nil {
		sets = append(sets, fmt.Sprintf("active = $%d", argIdx))
		args = append(args, *input.Active)
		argIdx++
	}

	if len(sets) == 0 {
		return s.GetByID(ctx, id)
	}

	args = append(args, id)
	query := fmt.Sprintf(`
		UPDATE habits SET %s WHERE id = $%d
		RETURNING id, name, description, frequency, target_count, habit_group, sort_order, active, created_at`,
		strings.Join(sets, ", "), argIdx)

	var h model.Habit
	err = s.pool.QueryRow(ctx, query, args...).Scan(
		&h.ID, &h.Name, &h.Description, &h.Frequency,
		&h.TargetCount, &h.HabitGroup, &h.SortOrder, &h.Active, &h.CreatedAt,
	)
	return h, err
}

func (s *PgHabitStore) Delete(ctx context.Context, id int64) error {
	tag, err := s.pool.Exec(ctx, "DELETE FROM habits WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("delete habit: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PgHabitStore) Complete(ctx context.Context, habitID int64, input model.CreateHabitCompletionInput) (model.HabitCompletion, error) {
	// Verify habit exists
	_, err := s.GetByID(ctx, habitID)
	if err != nil {
		return model.HabitCompletion{}, err
	}

	value := 1
	if input.Value != nil {
		value = *input.Value
	}

	var hc model.HabitCompletion
	err = s.pool.QueryRow(ctx, `
		INSERT INTO habit_completions (habit_id, value, notes)
		VALUES ($1, $2, $3)
		RETURNING id, habit_id, completed_at, value, notes`,
		habitID, value, input.Notes,
	).Scan(&hc.ID, &hc.HabitID, &hc.CompletedAt, &hc.Value, &hc.Notes)
	return hc, err
}

func (s *PgHabitStore) ListCompletions(ctx context.Context, habitID int64, limit, offset int) ([]model.HabitCompletion, error) {
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, habit_id, completed_at, value, notes
		FROM habit_completions WHERE habit_id = $1
		ORDER BY completed_at DESC
		LIMIT $2 OFFSET $3`, habitID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list completions: %w", err)
	}
	defer rows.Close()

	var completions []model.HabitCompletion
	for rows.Next() {
		var hc model.HabitCompletion
		if err := rows.Scan(&hc.ID, &hc.HabitID, &hc.CompletedAt, &hc.Value, &hc.Notes); err != nil {
			return nil, fmt.Errorf("scan completion: %w", err)
		}
		completions = append(completions, hc)
	}
	if completions == nil {
		completions = []model.HabitCompletion{}
	}
	return completions, rows.Err()
}
