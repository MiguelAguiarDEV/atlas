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

// PgTimeEntryStore is the PostgreSQL implementation of TimeEntryStore.
type PgTimeEntryStore struct {
	pool *pgxpool.Pool
}

// NewPgTimeEntryStore creates a new PgTimeEntryStore.
func NewPgTimeEntryStore(pool *pgxpool.Pool) *PgTimeEntryStore {
	return &PgTimeEntryStore{pool: pool}
}

func (s *PgTimeEntryStore) List(ctx context.Context, taskID *int64, limit, offset int) (ListResult[model.TimeEntry], error) {
	var result ListResult[model.TimeEntry]

	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	where := "1=1"
	args := []interface{}{}
	argIdx := 1
	if taskID != nil {
		where = fmt.Sprintf("task_id = $%d", argIdx)
		args = append(args, *taskID)
		argIdx++
	}

	countQ := fmt.Sprintf("SELECT COUNT(*) FROM time_entries WHERE %s", where)
	err := s.pool.QueryRow(ctx, countQ, args...).Scan(&result.Total)
	if err != nil {
		return result, fmt.Errorf("count time entries: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT id, task_id, started_at, ended_at, duration_secs, entry_type, source, notes, created_at
		FROM time_entries WHERE %s
		ORDER BY started_at DESC
		LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return result, fmt.Errorf("list time entries: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var te model.TimeEntry
		if err := rows.Scan(&te.ID, &te.TaskID, &te.StartedAt, &te.EndedAt,
			&te.DurationSecs, &te.EntryType, &te.Source, &te.Notes, &te.CreatedAt); err != nil {
			return result, fmt.Errorf("scan time entry: %w", err)
		}
		result.Items = append(result.Items, te)
	}
	if result.Items == nil {
		result.Items = []model.TimeEntry{}
	}
	return result, rows.Err()
}

func (s *PgTimeEntryStore) GetByID(ctx context.Context, id int64) (model.TimeEntry, error) {
	var te model.TimeEntry
	err := s.pool.QueryRow(ctx, `
		SELECT id, task_id, started_at, ended_at, duration_secs, entry_type, source, notes, created_at
		FROM time_entries WHERE id = $1`, id).Scan(
		&te.ID, &te.TaskID, &te.StartedAt, &te.EndedAt,
		&te.DurationSecs, &te.EntryType, &te.Source, &te.Notes, &te.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return te, ErrNotFound
	}
	return te, err
}

func (s *PgTimeEntryStore) Create(ctx context.Context, input model.CreateTimeEntryInput) (model.TimeEntry, error) {
	if input.StartedAt == "" {
		return model.TimeEntry{}, ErrInvalidInput
	}
	startedAt, err := time.Parse(time.RFC3339, input.StartedAt)
	if err != nil {
		return model.TimeEntry{}, fmt.Errorf("%w: invalid started_at", ErrInvalidInput)
	}

	var endedAt *time.Time
	if input.EndedAt != nil {
		t, err := time.Parse(time.RFC3339, *input.EndedAt)
		if err != nil {
			return model.TimeEntry{}, fmt.Errorf("%w: invalid ended_at", ErrInvalidInput)
		}
		endedAt = &t
	}

	entryType := "timer"
	if input.EntryType != nil {
		entryType = *input.EntryType
	}
	source := "web"
	if input.Source != nil {
		source = *input.Source
	}

	var te model.TimeEntry
	err = s.pool.QueryRow(ctx, `
		INSERT INTO time_entries (task_id, started_at, ended_at, duration_secs, entry_type, source, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, task_id, started_at, ended_at, duration_secs, entry_type, source, notes, created_at`,
		input.TaskID, startedAt, endedAt, input.DurationSecs, entryType, source, input.Notes,
	).Scan(&te.ID, &te.TaskID, &te.StartedAt, &te.EndedAt,
		&te.DurationSecs, &te.EntryType, &te.Source, &te.Notes, &te.CreatedAt)
	return te, err
}

func (s *PgTimeEntryStore) Update(ctx context.Context, id int64, input model.UpdateTimeEntryInput) (model.TimeEntry, error) {
	_, err := s.GetByID(ctx, id)
	if err != nil {
		return model.TimeEntry{}, err
	}

	sets := []string{}
	args := []interface{}{}
	argIdx := 1

	if input.TaskID != nil {
		sets = append(sets, fmt.Sprintf("task_id = $%d", argIdx))
		args = append(args, *input.TaskID)
		argIdx++
	}
	if input.StartedAt != nil {
		t, err := time.Parse(time.RFC3339, *input.StartedAt)
		if err != nil {
			return model.TimeEntry{}, fmt.Errorf("%w: invalid started_at", ErrInvalidInput)
		}
		sets = append(sets, fmt.Sprintf("started_at = $%d", argIdx))
		args = append(args, t)
		argIdx++
	}
	if input.EndedAt != nil {
		t, err := time.Parse(time.RFC3339, *input.EndedAt)
		if err != nil {
			return model.TimeEntry{}, fmt.Errorf("%w: invalid ended_at", ErrInvalidInput)
		}
		sets = append(sets, fmt.Sprintf("ended_at = $%d", argIdx))
		args = append(args, t)
		argIdx++
	}
	if input.DurationSecs != nil {
		sets = append(sets, fmt.Sprintf("duration_secs = $%d", argIdx))
		args = append(args, *input.DurationSecs)
		argIdx++
	}
	if input.EntryType != nil {
		sets = append(sets, fmt.Sprintf("entry_type = $%d", argIdx))
		args = append(args, *input.EntryType)
		argIdx++
	}
	if input.Source != nil {
		sets = append(sets, fmt.Sprintf("source = $%d", argIdx))
		args = append(args, *input.Source)
		argIdx++
	}
	if input.Notes != nil {
		sets = append(sets, fmt.Sprintf("notes = $%d", argIdx))
		args = append(args, *input.Notes)
		argIdx++
	}

	if len(sets) == 0 {
		return s.GetByID(ctx, id)
	}

	args = append(args, id)
	query := fmt.Sprintf(`
		UPDATE time_entries SET %s WHERE id = $%d
		RETURNING id, task_id, started_at, ended_at, duration_secs, entry_type, source, notes, created_at`,
		strings.Join(sets, ", "), argIdx)

	var te model.TimeEntry
	err = s.pool.QueryRow(ctx, query, args...).Scan(
		&te.ID, &te.TaskID, &te.StartedAt, &te.EndedAt,
		&te.DurationSecs, &te.EntryType, &te.Source, &te.Notes, &te.CreatedAt,
	)
	return te, err
}

func (s *PgTimeEntryStore) Delete(ctx context.Context, id int64) error {
	tag, err := s.pool.Exec(ctx, "DELETE FROM time_entries WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("delete time entry: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PgTimeEntryStore) StartTimer(ctx context.Context, taskID int64) (model.TimeEntry, error) {
	// Check for existing running timer
	var count int
	err := s.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM time_entries WHERE task_id = $1 AND ended_at IS NULL",
		taskID).Scan(&count)
	if err != nil {
		return model.TimeEntry{}, fmt.Errorf("check running timer: %w", err)
	}
	if count > 0 {
		return model.TimeEntry{}, ErrRunningTimer
	}

	var te model.TimeEntry
	err = s.pool.QueryRow(ctx, `
		INSERT INTO time_entries (task_id, started_at, entry_type, source)
		VALUES ($1, $2, 'timer', 'web')
		RETURNING id, task_id, started_at, ended_at, duration_secs, entry_type, source, notes, created_at`,
		taskID, time.Now(),
	).Scan(&te.ID, &te.TaskID, &te.StartedAt, &te.EndedAt,
		&te.DurationSecs, &te.EntryType, &te.Source, &te.Notes, &te.CreatedAt)
	return te, err
}

func (s *PgTimeEntryStore) StopTimer(ctx context.Context, taskID int64) (model.TimeEntry, error) {
	now := time.Now()
	var te model.TimeEntry
	err := s.pool.QueryRow(ctx, `
		UPDATE time_entries
		SET ended_at = $1, duration_secs = EXTRACT(EPOCH FROM ($1::timestamptz - started_at))::integer
		WHERE task_id = $2 AND ended_at IS NULL
		RETURNING id, task_id, started_at, ended_at, duration_secs, entry_type, source, notes, created_at`,
		now, taskID,
	).Scan(&te.ID, &te.TaskID, &te.StartedAt, &te.EndedAt,
		&te.DurationSecs, &te.EntryType, &te.Source, &te.Notes, &te.CreatedAt)
	if err == pgx.ErrNoRows {
		return te, ErrNoRunningTimer
	}
	return te, err
}
