package model

import "time"

// TimeEntry represents a time tracking entry.
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

// CreateTimeEntryInput is the input for creating a time entry.
type CreateTimeEntryInput struct {
	TaskID       *int64  `json:"task_id"`
	StartedAt    string  `json:"started_at"`
	EndedAt      *string `json:"ended_at"`
	DurationSecs *int    `json:"duration_secs"`
	EntryType    *string `json:"entry_type"`
	Source       *string `json:"source"`
	Notes        *string `json:"notes"`
}

// UpdateTimeEntryInput is the input for updating a time entry.
type UpdateTimeEntryInput struct {
	TaskID       *int64  `json:"task_id"`
	StartedAt    *string `json:"started_at"`
	EndedAt      *string `json:"ended_at"`
	DurationSecs *int    `json:"duration_secs"`
	EntryType    *string `json:"entry_type"`
	Source       *string `json:"source"`
	Notes        *string `json:"notes"`
}
