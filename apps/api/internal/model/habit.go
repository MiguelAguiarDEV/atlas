package model

import "time"

// Habit represents a tracked habit.
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

// CreateHabitInput is the input for creating a habit.
type CreateHabitInput struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Frequency   *string `json:"frequency"`
	TargetCount *int    `json:"target_count"`
	HabitGroup  *string `json:"habit_group"`
	SortOrder   *int    `json:"sort_order"`
}

// UpdateHabitInput is the input for updating a habit.
type UpdateHabitInput struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Frequency   *string `json:"frequency"`
	TargetCount *int    `json:"target_count"`
	HabitGroup  *string `json:"habit_group"`
	SortOrder   *int    `json:"sort_order"`
	Active      *bool   `json:"active"`
}

// HabitCompletion represents a single completion of a habit.
type HabitCompletion struct {
	ID          int64     `json:"id"`
	HabitID     int64     `json:"habit_id"`
	CompletedAt time.Time `json:"completed_at"`
	Value       int       `json:"value"`
	Notes       *string   `json:"notes"`
}

// CreateHabitCompletionInput is the input for recording a habit completion.
type CreateHabitCompletionInput struct {
	Value *int    `json:"value"`
	Notes *string `json:"notes"`
}
