package model

import "time"

// TimeEntry mirrors apps/api/internal/model.TimeEntry.
type TimeEntry struct {
	ID           int64      `json:"id"`
	TaskID       *int64     `json:"task_id"`
	StartedAt    time.Time  `json:"started_at"`
	EndedAt      *time.Time `json:"ended_at"`
	DurationSecs *int       `json:"duration_secs"`
	EntryType    string     `json:"entry_type"`
	Source       string     `json:"source"`
	Notes        *string    `json:"notes"`
	CreatedAt    time.Time  `json:"created_at"`
}

// CreateTimeEntryInput is the body for POST /time-entries.
type CreateTimeEntryInput struct {
	TaskID       *int64  `json:"task_id,omitempty"`
	StartedAt    string  `json:"started_at"`
	EndedAt      *string `json:"ended_at,omitempty"`
	DurationSecs *int    `json:"duration_secs,omitempty"`
	EntryType    *string `json:"entry_type,omitempty"`
	Source       *string `json:"source,omitempty"`
	Notes        *string `json:"notes,omitempty"`
}

// UpdateTimeEntryInput is the body for PUT /time-entries/{id}.
type UpdateTimeEntryInput struct {
	TaskID       *int64  `json:"task_id,omitempty"`
	StartedAt    *string `json:"started_at,omitempty"`
	EndedAt      *string `json:"ended_at,omitempty"`
	DurationSecs *int    `json:"duration_secs,omitempty"`
	EntryType    *string `json:"entry_type,omitempty"`
	Source       *string `json:"source,omitempty"`
	Notes        *string `json:"notes,omitempty"`
}
