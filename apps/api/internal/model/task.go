package model

import (
	"encoding/json"
	"time"
)

// Task represents a task entity.
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

// CreateTaskInput is the input for creating a task.
type CreateTaskInput struct {
	ProjectID     *int64   `json:"project_id"`
	ParentID      *int64   `json:"parent_id"`
	Title         string   `json:"title"`
	Description   *string  `json:"description"`
	Status        *string  `json:"status"`
	Priority      *string  `json:"priority"`
	Energy        *string  `json:"energy"`
	EstimatedMins *int     `json:"estimated_mins"`
	TaskType      *string  `json:"task_type"`
	ContextTags   []string `json:"context_tags"`
	DeepWork      *bool    `json:"deep_work"`
	QuickWin      *bool    `json:"quick_win"`
	Recurrence    *string  `json:"recurrence"`
	DueAt         *string  `json:"due_at"`
}

// UpdateTaskInput is the input for updating a task.
type UpdateTaskInput struct {
	ProjectID     *int64   `json:"project_id"`
	ParentID      *int64   `json:"parent_id"`
	Title         *string  `json:"title"`
	Description   *string  `json:"description"`
	Status        *string  `json:"status"`
	Priority      *string  `json:"priority"`
	Energy        *string  `json:"energy"`
	EstimatedMins *int     `json:"estimated_mins"`
	TaskType      *string  `json:"task_type"`
	ContextTags   []string `json:"context_tags"`
	DeepWork      *bool    `json:"deep_work"`
	QuickWin      *bool    `json:"quick_win"`
	Recurrence    *string  `json:"recurrence"`
	DueAt         *string  `json:"due_at"`
	SortOrder     *int     `json:"sort_order"`
}

// TaskEvent represents an audit trail event for a task.
type TaskEvent struct {
	ID         int64            `json:"id"`
	TaskID     int64            `json:"task_id"`
	EventType  string           `json:"event_type"`
	Payload    *json.RawMessage `json:"payload"`
	OccurredAt time.Time        `json:"occurred_at"`
}

// CreateTaskEventInput is the input for creating a task event.
type CreateTaskEventInput struct {
	EventType string           `json:"event_type"`
	Payload   *json.RawMessage `json:"payload"`
}

// TaskDependency represents a dependency between tasks.
type TaskDependency struct {
	BlockerID int64 `json:"blocker_id"`
	BlockedID int64 `json:"blocked_id"`
}

// TaskFilter holds filter parameters for listing tasks.
type TaskFilter struct {
	Status    *string
	ProjectID *int64
	Priority  *string
	Search    *string
	DueFrom   *time.Time
	DueTo     *time.Time
	Limit     int
	Offset    int
}
