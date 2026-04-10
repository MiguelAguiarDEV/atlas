package store

import (
	"context"
	"errors"

	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/model"
)

// Common errors.
var (
	ErrNotFound      = errors.New("not found")
	ErrInvalidInput  = errors.New("invalid input")
	ErrConflict      = errors.New("conflict")
	ErrRunningTimer  = errors.New("task already has a running timer")
	ErrNoRunningTimer = errors.New("no running timer for this task")
)

// ListResult wraps a list of items with total count for pagination.
type ListResult[T any] struct {
	Items []T `json:"items"`
	Total int `json:"total"`
}

// TaskStore defines the interface for task operations.
type TaskStore interface {
	List(ctx context.Context, filter model.TaskFilter) (ListResult[model.Task], error)
	GetByID(ctx context.Context, id int64) (model.Task, error)
	Create(ctx context.Context, input model.CreateTaskInput) (model.Task, error)
	Update(ctx context.Context, id int64, input model.UpdateTaskInput) (model.Task, error)
	Delete(ctx context.Context, id int64) error
	CreateEvent(ctx context.Context, taskID int64, input model.CreateTaskEventInput) (model.TaskEvent, error)
	ListEvents(ctx context.Context, taskID int64) ([]model.TaskEvent, error)
}

// ProjectStore defines the interface for project operations.
type ProjectStore interface {
	List(ctx context.Context, limit, offset int) (ListResult[model.Project], error)
	GetByID(ctx context.Context, id int64) (model.Project, error)
	Create(ctx context.Context, input model.CreateProjectInput) (model.Project, error)
	Update(ctx context.Context, id int64, input model.UpdateProjectInput) (model.Project, error)
	Delete(ctx context.Context, id int64) error
}

// TimeEntryStore defines the interface for time entry operations.
type TimeEntryStore interface {
	List(ctx context.Context, taskID *int64, limit, offset int) (ListResult[model.TimeEntry], error)
	GetByID(ctx context.Context, id int64) (model.TimeEntry, error)
	Create(ctx context.Context, input model.CreateTimeEntryInput) (model.TimeEntry, error)
	Update(ctx context.Context, id int64, input model.UpdateTimeEntryInput) (model.TimeEntry, error)
	Delete(ctx context.Context, id int64) error
	StartTimer(ctx context.Context, taskID int64) (model.TimeEntry, error)
	StopTimer(ctx context.Context, taskID int64) (model.TimeEntry, error)
}

// HabitStore defines the interface for habit operations.
type HabitStore interface {
	List(ctx context.Context, limit, offset int) (ListResult[model.Habit], error)
	GetByID(ctx context.Context, id int64) (model.Habit, error)
	Create(ctx context.Context, input model.CreateHabitInput) (model.Habit, error)
	Update(ctx context.Context, id int64, input model.UpdateHabitInput) (model.Habit, error)
	Delete(ctx context.Context, id int64) error
	Complete(ctx context.Context, habitID int64, input model.CreateHabitCompletionInput) (model.HabitCompletion, error)
	ListCompletions(ctx context.Context, habitID int64, limit, offset int) ([]model.HabitCompletion, error)
}
