// Package model contains types mirroring the atlas API payloads.
// v1 duplicates these structs from apps/api/internal/model; extraction to
// a shared module is deferred to v0.2 (see SDD design decision #3).
package model

import (
	"encoding/json"
	"time"
)

// Task mirrors apps/api/internal/model.Task.
type Task struct {
	ID            int64      `json:"id"`
	ProjectID     *int64     `json:"project_id"`
	ParentID      *int64     `json:"parent_id"`
	Title         string     `json:"title"`
	Description   *string    `json:"description"`
	Status        string     `json:"status"`
	Priority      string     `json:"priority"`
	Energy        *string    `json:"energy"`
	EstimatedMins *int       `json:"estimated_mins"`
	TaskType      string     `json:"task_type"`
	ContextTags   []string   `json:"context_tags"`
	DeepWork      bool       `json:"deep_work"`
	QuickWin      bool       `json:"quick_win"`
	Recurrence    *string    `json:"recurrence"`
	SortOrder     int        `json:"sort_order"`
	DueAt         *time.Time `json:"due_at"`
	StartedAt     *time.Time `json:"started_at"`
	CompletedAt   *time.Time `json:"completed_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// CreateTaskInput is the body for POST /tasks.
type CreateTaskInput struct {
	ProjectID     *int64   `json:"project_id,omitempty"`
	ParentID      *int64   `json:"parent_id,omitempty"`
	Title         string   `json:"title"`
	Description   *string  `json:"description,omitempty"`
	Status        *string  `json:"status,omitempty"`
	Priority      *string  `json:"priority,omitempty"`
	Energy        *string  `json:"energy,omitempty"`
	EstimatedMins *int     `json:"estimated_mins,omitempty"`
	TaskType      *string  `json:"task_type,omitempty"`
	ContextTags   []string `json:"context_tags,omitempty"`
	DeepWork      *bool    `json:"deep_work,omitempty"`
	QuickWin      *bool    `json:"quick_win,omitempty"`
	Recurrence    *string  `json:"recurrence,omitempty"`
	DueAt         *string  `json:"due_at,omitempty"`
}

// UpdateTaskInput is the body for PUT /tasks/{id}.
type UpdateTaskInput struct {
	ProjectID     *int64   `json:"project_id,omitempty"`
	ParentID      *int64   `json:"parent_id,omitempty"`
	Title         *string  `json:"title,omitempty"`
	Description   *string  `json:"description,omitempty"`
	Status        *string  `json:"status,omitempty"`
	Priority      *string  `json:"priority,omitempty"`
	Energy        *string  `json:"energy,omitempty"`
	EstimatedMins *int     `json:"estimated_mins,omitempty"`
	TaskType      *string  `json:"task_type,omitempty"`
	ContextTags   []string `json:"context_tags,omitempty"`
	DeepWork      *bool    `json:"deep_work,omitempty"`
	QuickWin      *bool    `json:"quick_win,omitempty"`
	Recurrence    *string  `json:"recurrence,omitempty"`
	DueAt         *string  `json:"due_at,omitempty"`
	SortOrder     *int     `json:"sort_order,omitempty"`
	CompletedAt   *string  `json:"completed_at,omitempty"`
}

// TaskEvent mirrors the API audit trail entry.
type TaskEvent struct {
	ID         int64            `json:"id"`
	TaskID     int64            `json:"task_id"`
	EventType  string           `json:"event_type"`
	Payload    *json.RawMessage `json:"payload"`
	OccurredAt time.Time        `json:"occurred_at"`
}

// CreateTaskEventInput is the body for POST /tasks/{id}/events.
type CreateTaskEventInput struct {
	EventType string           `json:"event_type"`
	Payload   *json.RawMessage `json:"payload,omitempty"`
}
