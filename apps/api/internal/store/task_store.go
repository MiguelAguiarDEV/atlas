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

// PgTaskStore is the PostgreSQL implementation of TaskStore.
type PgTaskStore struct {
	pool *pgxpool.Pool
}

// NewPgTaskStore creates a new PgTaskStore.
func NewPgTaskStore(pool *pgxpool.Pool) *PgTaskStore {
	return &PgTaskStore{pool: pool}
}

func (s *PgTaskStore) List(ctx context.Context, filter model.TaskFilter) (ListResult[model.Task], error) {
	var result ListResult[model.Task]

	where := []string{"1=1"}
	args := []interface{}{}
	argIdx := 1

	if filter.Status != nil {
		where = append(where, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, *filter.Status)
		argIdx++
	}
	if filter.ProjectID != nil {
		where = append(where, fmt.Sprintf("project_id = $%d", argIdx))
		args = append(args, *filter.ProjectID)
		argIdx++
	}
	if filter.Priority != nil {
		where = append(where, fmt.Sprintf("priority = $%d", argIdx))
		args = append(args, *filter.Priority)
		argIdx++
	}
	if filter.Search != nil && *filter.Search != "" {
		where = append(where, fmt.Sprintf("tsv @@ plainto_tsquery('english', $%d)", argIdx))
		args = append(args, *filter.Search)
		argIdx++
	}
	if filter.DueFrom != nil {
		where = append(where, fmt.Sprintf("due_at >= $%d", argIdx))
		args = append(args, *filter.DueFrom)
		argIdx++
	}
	if filter.DueTo != nil {
		where = append(where, fmt.Sprintf("due_at <= $%d", argIdx))
		args = append(args, *filter.DueTo)
		argIdx++
	}

	whereClause := strings.Join(where, " AND ")

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM tasks WHERE %s", whereClause)
	err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&result.Total)
	if err != nil {
		return result, fmt.Errorf("count tasks: %w", err)
	}

	// Default pagination
	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	query := fmt.Sprintf(`
		SELECT id, project_id, parent_id, title, description, status, priority,
		       energy, estimated_mins, task_type, context_tags, deep_work, quick_win,
		       recurrence, sort_order, due_at, started_at, completed_at, created_at, updated_at
		FROM tasks WHERE %s
		ORDER BY sort_order, created_at DESC
		LIMIT $%d OFFSET $%d`,
		whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return result, fmt.Errorf("list tasks: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var t model.Task
		err := rows.Scan(
			&t.ID, &t.ProjectID, &t.ParentID, &t.Title, &t.Description,
			&t.Status, &t.Priority, &t.Energy, &t.EstimatedMins, &t.TaskType,
			&t.ContextTags, &t.DeepWork, &t.QuickWin, &t.Recurrence,
			&t.SortOrder, &t.DueAt, &t.StartedAt, &t.CompletedAt,
			&t.CreatedAt, &t.UpdatedAt,
		)
		if err != nil {
			return result, fmt.Errorf("scan task: %w", err)
		}
		if t.ContextTags == nil {
			t.ContextTags = []string{}
		}
		result.Items = append(result.Items, t)
	}
	if result.Items == nil {
		result.Items = []model.Task{}
	}
	return result, rows.Err()
}

func (s *PgTaskStore) GetByID(ctx context.Context, id int64) (model.Task, error) {
	var t model.Task
	err := s.pool.QueryRow(ctx, `
		SELECT id, project_id, parent_id, title, description, status, priority,
		       energy, estimated_mins, task_type, context_tags, deep_work, quick_win,
		       recurrence, sort_order, due_at, started_at, completed_at, created_at, updated_at
		FROM tasks WHERE id = $1`, id).Scan(
		&t.ID, &t.ProjectID, &t.ParentID, &t.Title, &t.Description,
		&t.Status, &t.Priority, &t.Energy, &t.EstimatedMins, &t.TaskType,
		&t.ContextTags, &t.DeepWork, &t.QuickWin, &t.Recurrence,
		&t.SortOrder, &t.DueAt, &t.StartedAt, &t.CompletedAt,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return t, ErrNotFound
	}
	if t.ContextTags == nil {
		t.ContextTags = []string{}
	}
	return t, err
}

func (s *PgTaskStore) Create(ctx context.Context, input model.CreateTaskInput) (model.Task, error) {
	if input.Title == "" {
		return model.Task{}, ErrInvalidInput
	}

	status := "inbox"
	if input.Status != nil {
		status = *input.Status
	}
	priority := "p2"
	if input.Priority != nil {
		priority = *input.Priority
	}
	taskType := "task"
	if input.TaskType != nil {
		taskType = *input.TaskType
	}
	deepWork := false
	if input.DeepWork != nil {
		deepWork = *input.DeepWork
	}
	quickWin := false
	if input.QuickWin != nil {
		quickWin = *input.QuickWin
	}

	var dueAt *time.Time
	if input.DueAt != nil {
		t, err := time.Parse(time.RFC3339, *input.DueAt)
		if err != nil {
			return model.Task{}, fmt.Errorf("%w: invalid due_at format", ErrInvalidInput)
		}
		dueAt = &t
	}

	tags := input.ContextTags
	if tags == nil {
		tags = []string{}
	}

	var task model.Task
	err := s.pool.QueryRow(ctx, `
		INSERT INTO tasks (project_id, parent_id, title, description, status, priority,
		                   energy, estimated_mins, task_type, context_tags, deep_work,
		                   quick_win, recurrence, due_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, project_id, parent_id, title, description, status, priority,
		          energy, estimated_mins, task_type, context_tags, deep_work, quick_win,
		          recurrence, sort_order, due_at, started_at, completed_at, created_at, updated_at`,
		input.ProjectID, input.ParentID, input.Title, input.Description,
		status, priority, input.Energy, input.EstimatedMins, taskType,
		tags, deepWork, quickWin, input.Recurrence, dueAt,
	).Scan(
		&task.ID, &task.ProjectID, &task.ParentID, &task.Title, &task.Description,
		&task.Status, &task.Priority, &task.Energy, &task.EstimatedMins, &task.TaskType,
		&task.ContextTags, &task.DeepWork, &task.QuickWin, &task.Recurrence,
		&task.SortOrder, &task.DueAt, &task.StartedAt, &task.CompletedAt,
		&task.CreatedAt, &task.UpdatedAt,
	)
	if task.ContextTags == nil {
		task.ContextTags = []string{}
	}
	return task, err
}

func (s *PgTaskStore) Update(ctx context.Context, id int64, input model.UpdateTaskInput) (model.Task, error) {
	// First check existence
	_, err := s.GetByID(ctx, id)
	if err != nil {
		return model.Task{}, err
	}

	sets := []string{}
	args := []interface{}{}
	argIdx := 1

	if input.Title != nil {
		if *input.Title == "" {
			return model.Task{}, ErrInvalidInput
		}
		sets = append(sets, fmt.Sprintf("title = $%d", argIdx))
		args = append(args, *input.Title)
		argIdx++
	}
	if input.Description != nil {
		sets = append(sets, fmt.Sprintf("description = $%d", argIdx))
		args = append(args, *input.Description)
		argIdx++
	}
	if input.Status != nil {
		sets = append(sets, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, *input.Status)
		argIdx++
		// If completing, set completed_at
		if *input.Status == "done" || *input.Status == "cancelled" {
			sets = append(sets, fmt.Sprintf("completed_at = $%d", argIdx))
			args = append(args, time.Now())
			argIdx++
		}
		if *input.Status == "in_progress" {
			sets = append(sets, fmt.Sprintf("started_at = COALESCE(started_at, $%d)", argIdx))
			args = append(args, time.Now())
			argIdx++
		}
	}
	if input.Priority != nil {
		sets = append(sets, fmt.Sprintf("priority = $%d", argIdx))
		args = append(args, *input.Priority)
		argIdx++
	}
	if input.ProjectID != nil {
		sets = append(sets, fmt.Sprintf("project_id = $%d", argIdx))
		args = append(args, *input.ProjectID)
		argIdx++
	}
	if input.ParentID != nil {
		sets = append(sets, fmt.Sprintf("parent_id = $%d", argIdx))
		args = append(args, *input.ParentID)
		argIdx++
	}
	if input.Energy != nil {
		sets = append(sets, fmt.Sprintf("energy = $%d", argIdx))
		args = append(args, *input.Energy)
		argIdx++
	}
	if input.EstimatedMins != nil {
		sets = append(sets, fmt.Sprintf("estimated_mins = $%d", argIdx))
		args = append(args, *input.EstimatedMins)
		argIdx++
	}
	if input.TaskType != nil {
		sets = append(sets, fmt.Sprintf("task_type = $%d", argIdx))
		args = append(args, *input.TaskType)
		argIdx++
	}
	if input.ContextTags != nil {
		sets = append(sets, fmt.Sprintf("context_tags = $%d", argIdx))
		args = append(args, input.ContextTags)
		argIdx++
	}
	if input.DeepWork != nil {
		sets = append(sets, fmt.Sprintf("deep_work = $%d", argIdx))
		args = append(args, *input.DeepWork)
		argIdx++
	}
	if input.QuickWin != nil {
		sets = append(sets, fmt.Sprintf("quick_win = $%d", argIdx))
		args = append(args, *input.QuickWin)
		argIdx++
	}
	if input.Recurrence != nil {
		sets = append(sets, fmt.Sprintf("recurrence = $%d", argIdx))
		args = append(args, *input.Recurrence)
		argIdx++
	}
	if input.DueAt != nil {
		t, err := time.Parse(time.RFC3339, *input.DueAt)
		if err != nil {
			return model.Task{}, fmt.Errorf("%w: invalid due_at format", ErrInvalidInput)
		}
		sets = append(sets, fmt.Sprintf("due_at = $%d", argIdx))
		args = append(args, t)
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
		UPDATE tasks SET %s WHERE id = $%d
		RETURNING id, project_id, parent_id, title, description, status, priority,
		          energy, estimated_mins, task_type, context_tags, deep_work, quick_win,
		          recurrence, sort_order, due_at, started_at, completed_at, created_at, updated_at`,
		strings.Join(sets, ", "), argIdx)

	var task model.Task
	err = s.pool.QueryRow(ctx, query, args...).Scan(
		&task.ID, &task.ProjectID, &task.ParentID, &task.Title, &task.Description,
		&task.Status, &task.Priority, &task.Energy, &task.EstimatedMins, &task.TaskType,
		&task.ContextTags, &task.DeepWork, &task.QuickWin, &task.Recurrence,
		&task.SortOrder, &task.DueAt, &task.StartedAt, &task.CompletedAt,
		&task.CreatedAt, &task.UpdatedAt,
	)
	if task.ContextTags == nil {
		task.ContextTags = []string{}
	}
	return task, err
}

func (s *PgTaskStore) Delete(ctx context.Context, id int64) error {
	tag, err := s.pool.Exec(ctx, "DELETE FROM tasks WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("delete task: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PgTaskStore) CreateEvent(ctx context.Context, taskID int64, input model.CreateTaskEventInput) (model.TaskEvent, error) {
	// Verify task exists
	_, err := s.GetByID(ctx, taskID)
	if err != nil {
		return model.TaskEvent{}, err
	}

	if input.EventType == "" {
		return model.TaskEvent{}, ErrInvalidInput
	}

	var evt model.TaskEvent
	err = s.pool.QueryRow(ctx, `
		INSERT INTO task_events (task_id, event_type, payload)
		VALUES ($1, $2, $3)
		RETURNING id, task_id, event_type, payload, occurred_at`,
		taskID, input.EventType, input.Payload,
	).Scan(&evt.ID, &evt.TaskID, &evt.EventType, &evt.Payload, &evt.OccurredAt)
	return evt, err
}

func (s *PgTaskStore) ListEvents(ctx context.Context, taskID int64) ([]model.TaskEvent, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, task_id, event_type, payload, occurred_at
		FROM task_events WHERE task_id = $1
		ORDER BY occurred_at DESC`, taskID)
	if err != nil {
		return nil, fmt.Errorf("list events: %w", err)
	}
	defer rows.Close()

	var events []model.TaskEvent
	for rows.Next() {
		var e model.TaskEvent
		if err := rows.Scan(&e.ID, &e.TaskID, &e.EventType, &e.Payload, &e.OccurredAt); err != nil {
			return nil, fmt.Errorf("scan event: %w", err)
		}
		events = append(events, e)
	}
	if events == nil {
		events = []model.TaskEvent{}
	}
	return events, rows.Err()
}
