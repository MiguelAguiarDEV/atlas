package store

import (
	"context"
	"testing"

	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/model"
)

func TestMockTimeEntryStore_Create(t *testing.T) {
	tests := []struct {
		name    string
		input   model.CreateTimeEntryInput
		wantErr error
	}{
		{
			name:    "valid entry",
			input:   model.CreateTimeEntryInput{StartedAt: "2026-01-01T09:00:00Z"},
			wantErr: nil,
		},
		{
			name:    "empty started_at",
			input:   model.CreateTimeEntryInput{StartedAt: ""},
			wantErr: ErrInvalidInput,
		},
		{
			name:    "invalid started_at",
			input:   model.CreateTimeEntryInput{StartedAt: "bad-date"},
			wantErr: ErrInvalidInput,
		},
		{
			name: "with all fields",
			input: model.CreateTimeEntryInput{
				TaskID:       int64Ptr(1),
				StartedAt:    "2026-01-01T09:00:00Z",
				EndedAt:      strPtr("2026-01-01T10:00:00Z"),
				DurationSecs: intPtr(3600),
				EntryType:    strPtr("pomodoro"),
				Source:       strPtr("cli"),
				Notes:        strPtr("Focused work"),
			},
			wantErr: nil,
		},
		{
			name: "invalid ended_at",
			input: model.CreateTimeEntryInput{
				StartedAt: "2026-01-01T09:00:00Z",
				EndedAt:   strPtr("not-a-date"),
			},
			wantErr: ErrInvalidInput,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := NewMockTimeEntryStore()
			ctx := context.Background()

			te, err := s.Create(ctx, tt.input)
			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected error %v, got nil", tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if te.ID == 0 {
				t.Error("expected non-zero ID")
			}
		})
	}
}

func TestMockTimeEntryStore_CreateDefaults(t *testing.T) {
	s := NewMockTimeEntryStore()
	ctx := context.Background()

	te, err := s.Create(ctx, model.CreateTimeEntryInput{StartedAt: "2026-01-01T09:00:00Z"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if te.EntryType != "timer" {
		t.Errorf("entry_type = %q, want timer", te.EntryType)
	}
	if te.Source != "web" {
		t.Errorf("source = %q, want web", te.Source)
	}
}

func TestMockTimeEntryStore_GetByID(t *testing.T) {
	s := NewMockTimeEntryStore()
	ctx := context.Background()

	// Not found
	_, err := s.GetByID(ctx, 999)
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	// Create and get
	created, _ := s.Create(ctx, model.CreateTimeEntryInput{StartedAt: "2026-01-01T09:00:00Z"})
	got, err := s.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != created.ID {
		t.Errorf("ID = %d, want %d", got.ID, created.ID)
	}
}

func TestMockTimeEntryStore_List(t *testing.T) {
	s := NewMockTimeEntryStore()
	ctx := context.Background()

	// Empty
	result, err := s.List(ctx, nil, 50, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 0 {
		t.Errorf("expected empty list")
	}

	// Add entries
	tid := int64(1)
	s.Create(ctx, model.CreateTimeEntryInput{TaskID: &tid, StartedAt: "2026-01-01T09:00:00Z"})
	s.Create(ctx, model.CreateTimeEntryInput{StartedAt: "2026-01-01T10:00:00Z"})
	s.Create(ctx, model.CreateTimeEntryInput{TaskID: &tid, StartedAt: "2026-01-01T11:00:00Z"})

	// List all
	result, err = s.List(ctx, nil, 50, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Total != 3 {
		t.Errorf("total = %d, want 3", result.Total)
	}

	// Filter by task_id
	result, err = s.List(ctx, &tid, 50, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Total != 2 {
		t.Errorf("total = %d, want 2", result.Total)
	}

	// Pagination
	result, err = s.List(ctx, nil, 1, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 1 {
		t.Errorf("items = %d, want 1", len(result.Items))
	}

	// Offset beyond
	result, err = s.List(ctx, nil, 10, 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 0 {
		t.Errorf("items = %d, want 0", len(result.Items))
	}

	// Default limit
	result, err = s.List(ctx, nil, 0, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 3 {
		t.Errorf("items = %d, want 3", len(result.Items))
	}

	// Negative offset
	result, err = s.List(ctx, nil, 50, -1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 3 {
		t.Errorf("items = %d, want 3", len(result.Items))
	}
}

func TestMockTimeEntryStore_Update(t *testing.T) {
	s := NewMockTimeEntryStore()
	ctx := context.Background()

	// Update non-existent
	_, err := s.Update(ctx, 999, model.UpdateTimeEntryInput{})
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	created, _ := s.Create(ctx, model.CreateTimeEntryInput{StartedAt: "2026-01-01T09:00:00Z"})

	tests := []struct {
		name    string
		input   model.UpdateTimeEntryInput
		check   func(t *testing.T, te model.TimeEntry)
		wantErr error
	}{
		{
			name:  "update notes",
			input: model.UpdateTimeEntryInput{Notes: strPtr("Updated")},
			check: func(t *testing.T, te model.TimeEntry) {
				if te.Notes == nil || *te.Notes != "Updated" {
					t.Errorf("notes = %v, want Updated", te.Notes)
				}
			},
		},
		{
			name:  "update entry_type",
			input: model.UpdateTimeEntryInput{EntryType: strPtr("manual")},
			check: func(t *testing.T, te model.TimeEntry) {
				if te.EntryType != "manual" {
					t.Errorf("entry_type = %q, want manual", te.EntryType)
				}
			},
		},
		{
			name:  "update source",
			input: model.UpdateTimeEntryInput{Source: strPtr("mobile")},
			check: func(t *testing.T, te model.TimeEntry) {
				if te.Source != "mobile" {
					t.Errorf("source = %q, want mobile", te.Source)
				}
			},
		},
		{
			name:  "update duration_secs",
			input: model.UpdateTimeEntryInput{DurationSecs: intPtr(1800)},
			check: func(t *testing.T, te model.TimeEntry) {
				if te.DurationSecs == nil || *te.DurationSecs != 1800 {
					t.Errorf("duration_secs = %v, want 1800", te.DurationSecs)
				}
			},
		},
		{
			name:  "update started_at",
			input: model.UpdateTimeEntryInput{StartedAt: strPtr("2026-02-01T08:00:00Z")},
			check: func(t *testing.T, te model.TimeEntry) {
				if te.StartedAt.Month() != 2 {
					t.Errorf("started_at month = %d, want 2", te.StartedAt.Month())
				}
			},
		},
		{
			name:    "invalid started_at",
			input:   model.UpdateTimeEntryInput{StartedAt: strPtr("bad")},
			wantErr: ErrInvalidInput,
		},
		{
			name:  "update ended_at",
			input: model.UpdateTimeEntryInput{EndedAt: strPtr("2026-01-01T17:00:00Z")},
			check: func(t *testing.T, te model.TimeEntry) {
				if te.EndedAt == nil {
					t.Error("expected ended_at to be set")
				}
			},
		},
		{
			name:    "invalid ended_at",
			input:   model.UpdateTimeEntryInput{EndedAt: strPtr("bad")},
			wantErr: ErrInvalidInput,
		},
		{
			name:  "update task_id",
			input: model.UpdateTimeEntryInput{TaskID: int64Ptr(42)},
			check: func(t *testing.T, te model.TimeEntry) {
				if te.TaskID == nil || *te.TaskID != 42 {
					t.Errorf("task_id = %v, want 42", te.TaskID)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			updated, err := s.Update(ctx, created.ID, tt.input)
			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected error %v, got nil", tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tt.check != nil {
				tt.check(t, updated)
			}
		})
	}
}

func TestMockTimeEntryStore_Delete(t *testing.T) {
	s := NewMockTimeEntryStore()
	ctx := context.Background()

	// Delete non-existent
	err := s.Delete(ctx, 999)
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	// Create and delete
	created, _ := s.Create(ctx, model.CreateTimeEntryInput{StartedAt: "2026-01-01T09:00:00Z"})
	err = s.Delete(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, err = s.GetByID(ctx, created.ID)
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound after delete, got %v", err)
	}
}

func TestMockTimeEntryStore_StartStopTimer(t *testing.T) {
	s := NewMockTimeEntryStore()
	ctx := context.Background()
	taskID := int64(1)

	// Start timer
	te, err := s.StartTimer(ctx, taskID)
	if err != nil {
		t.Fatalf("start timer: %v", err)
	}
	if te.TaskID == nil || *te.TaskID != taskID {
		t.Errorf("task_id = %v, want %d", te.TaskID, taskID)
	}
	if te.EndedAt != nil {
		t.Error("expected ended_at to be nil for running timer")
	}
	if te.EntryType != "timer" {
		t.Errorf("entry_type = %q, want timer", te.EntryType)
	}

	// Start again should fail (running timer exists)
	_, err = s.StartTimer(ctx, taskID)
	if err != ErrRunningTimer {
		t.Fatalf("expected ErrRunningTimer, got %v", err)
	}

	// Stop timer
	stopped, err := s.StopTimer(ctx, taskID)
	if err != nil {
		t.Fatalf("stop timer: %v", err)
	}
	if stopped.EndedAt == nil {
		t.Error("expected ended_at to be set after stop")
	}
	if stopped.DurationSecs == nil {
		t.Error("expected duration_secs to be set after stop")
	}

	// Stop again should fail (no running timer)
	_, err = s.StopTimer(ctx, taskID)
	if err != ErrNoRunningTimer {
		t.Fatalf("expected ErrNoRunningTimer, got %v", err)
	}
}

func TestMockTimeEntryStore_StartTimerDifferentTasks(t *testing.T) {
	s := NewMockTimeEntryStore()
	ctx := context.Background()

	// Can start timers on different tasks
	_, err := s.StartTimer(ctx, 1)
	if err != nil {
		t.Fatalf("start timer task 1: %v", err)
	}
	_, err = s.StartTimer(ctx, 2)
	if err != nil {
		t.Fatalf("start timer task 2: %v", err)
	}

	// Stop task 1
	_, err = s.StopTimer(ctx, 1)
	if err != nil {
		t.Fatalf("stop timer task 1: %v", err)
	}

	// Task 2 still running - can't start new one
	_, err = s.StartTimer(ctx, 2)
	if err != ErrRunningTimer {
		t.Fatalf("expected ErrRunningTimer for task 2, got %v", err)
	}
}

func int64Ptr(i int64) *int64 { return &i }
