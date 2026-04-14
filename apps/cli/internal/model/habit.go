package model

import "time"

// Habit mirrors apps/api/internal/model.Habit.
type Habit struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	Frequency   string    `json:"frequency"`
	TargetCount int       `json:"target_count"`
	HabitGroup  *string   `json:"habit_group"`
	SortOrder   int       `json:"sort_order"`
	Active      bool      `json:"active"`
	CreatedAt   time.Time `json:"created_at"`
}

// CreateHabitInput is the body for POST /habits.
type CreateHabitInput struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	Frequency   *string `json:"frequency,omitempty"`
	TargetCount *int    `json:"target_count,omitempty"`
	HabitGroup  *string `json:"habit_group,omitempty"`
	SortOrder   *int    `json:"sort_order,omitempty"`
}

// UpdateHabitInput is the body for PUT /habits/{id}.
type UpdateHabitInput struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Frequency   *string `json:"frequency,omitempty"`
	TargetCount *int    `json:"target_count,omitempty"`
	HabitGroup  *string `json:"habit_group,omitempty"`
	SortOrder   *int    `json:"sort_order,omitempty"`
	Active      *bool   `json:"active,omitempty"`
}

// HabitCompletion mirrors apps/api/internal/model.HabitCompletion.
type HabitCompletion struct {
	ID          int64     `json:"id"`
	HabitID     int64     `json:"habit_id"`
	CompletedAt time.Time `json:"completed_at"`
	Value       int       `json:"value"`
	Notes       *string   `json:"notes"`
}

// CreateHabitCompletionInput is the body for POST /habits/{id}/complete.
type CreateHabitCompletionInput struct {
	Value *int    `json:"value,omitempty"`
	Notes *string `json:"notes,omitempty"`
}
