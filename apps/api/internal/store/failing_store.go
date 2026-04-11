package store

import (
	"context"
	"errors"
	"time"

	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/model"
)

var errInternal = errors.New("internal store error")

// FailingTaskStore always returns errors, for testing error branches in handlers.
type FailingTaskStore struct{}

func (f FailingTaskStore) List(ctx context.Context, filter model.TaskFilter) (ListResult[model.Task], error) {
	return ListResult[model.Task]{}, errInternal
}
func (f FailingTaskStore) GetByID(ctx context.Context, id int64) (model.Task, error) {
	return model.Task{}, errInternal
}
func (f FailingTaskStore) Create(ctx context.Context, input model.CreateTaskInput) (model.Task, error) {
	return model.Task{}, errInternal
}
func (f FailingTaskStore) Update(ctx context.Context, id int64, input model.UpdateTaskInput) (model.Task, error) {
	return model.Task{}, errInternal
}
func (f FailingTaskStore) Delete(ctx context.Context, id int64) error {
	return errInternal
}
func (f FailingTaskStore) CreateEvent(ctx context.Context, taskID int64, input model.CreateTaskEventInput) (model.TaskEvent, error) {
	return model.TaskEvent{}, errInternal
}
func (f FailingTaskStore) ListEvents(ctx context.Context, taskID int64) ([]model.TaskEvent, error) {
	return nil, errInternal
}

// FailingProjectStore always returns errors.
type FailingProjectStore struct{}

func (f FailingProjectStore) List(ctx context.Context, limit, offset int) (ListResult[model.Project], error) {
	return ListResult[model.Project]{}, errInternal
}
func (f FailingProjectStore) GetByID(ctx context.Context, id int64) (model.Project, error) {
	return model.Project{}, errInternal
}
func (f FailingProjectStore) Create(ctx context.Context, input model.CreateProjectInput) (model.Project, error) {
	return model.Project{}, errInternal
}
func (f FailingProjectStore) Update(ctx context.Context, id int64, input model.UpdateProjectInput) (model.Project, error) {
	return model.Project{}, errInternal
}
func (f FailingProjectStore) Delete(ctx context.Context, id int64) error {
	return errInternal
}

// FailingTimeEntryStore always returns errors.
type FailingTimeEntryStore struct{}

func (f FailingTimeEntryStore) List(ctx context.Context, taskID *int64, limit, offset int) (ListResult[model.TimeEntry], error) {
	return ListResult[model.TimeEntry]{}, errInternal
}
func (f FailingTimeEntryStore) GetByID(ctx context.Context, id int64) (model.TimeEntry, error) {
	return model.TimeEntry{}, errInternal
}
func (f FailingTimeEntryStore) Create(ctx context.Context, input model.CreateTimeEntryInput) (model.TimeEntry, error) {
	return model.TimeEntry{}, errInternal
}
func (f FailingTimeEntryStore) Update(ctx context.Context, id int64, input model.UpdateTimeEntryInput) (model.TimeEntry, error) {
	return model.TimeEntry{}, errInternal
}
func (f FailingTimeEntryStore) Delete(ctx context.Context, id int64) error {
	return errInternal
}
func (f FailingTimeEntryStore) StartTimer(ctx context.Context, taskID int64) (model.TimeEntry, error) {
	return model.TimeEntry{}, errInternal
}
func (f FailingTimeEntryStore) StopTimer(ctx context.Context, taskID int64) (model.TimeEntry, error) {
	return model.TimeEntry{}, errInternal
}

// FailingHabitStore always returns errors.
type FailingHabitStore struct{}

func (f FailingHabitStore) List(ctx context.Context, limit, offset int) (ListResult[model.Habit], error) {
	return ListResult[model.Habit]{}, errInternal
}
func (f FailingHabitStore) GetByID(ctx context.Context, id int64) (model.Habit, error) {
	return model.Habit{}, errInternal
}
func (f FailingHabitStore) Create(ctx context.Context, input model.CreateHabitInput) (model.Habit, error) {
	return model.Habit{}, errInternal
}
func (f FailingHabitStore) Update(ctx context.Context, id int64, input model.UpdateHabitInput) (model.Habit, error) {
	return model.Habit{}, errInternal
}
func (f FailingHabitStore) Delete(ctx context.Context, id int64) error {
	return errInternal
}
func (f FailingHabitStore) Complete(ctx context.Context, habitID int64, input model.CreateHabitCompletionInput) (model.HabitCompletion, error) {
	return model.HabitCompletion{}, errInternal
}
func (f FailingHabitStore) ListCompletions(ctx context.Context, habitID int64, limit, offset int) ([]model.HabitCompletion, error) {
	return nil, errInternal
}
func (f FailingHabitStore) ListCompletionsByDate(ctx context.Context, date time.Time) ([]model.HabitCompletion, error) {
	return nil, errInternal
}
