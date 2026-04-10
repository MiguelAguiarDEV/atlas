package store

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/model"
)

func TestMockTaskStore_Create(t *testing.T) {
	tests := []struct {
		name    string
		input   model.CreateTaskInput
		wantErr error
	}{
		{
			name:    "valid task",
			input:   model.CreateTaskInput{Title: "Test Task"},
			wantErr: nil,
		},
		{
			name:    "empty title",
			input:   model.CreateTaskInput{Title: ""},
			wantErr: ErrInvalidInput,
		},
		{
			name: "with all optional fields",
			input: model.CreateTaskInput{
				Title:       "Full Task",
				Description: strPtr("A description"),
				Status:      strPtr("ready"),
				Priority:    strPtr("p0"),
				Energy:      strPtr("high"),
				TaskType:    strPtr("bug"),
				ContextTags: []string{"@home"},
				DeepWork:    boolPtr(true),
				QuickWin:    boolPtr(true),
				Recurrence:  strPtr("0 9 * * 1"),
				DueAt:       strPtr("2026-12-31T00:00:00Z"),
			},
			wantErr: nil,
		},
		{
			name: "invalid due_at format",
			input: model.CreateTaskInput{
				Title: "Bad Date",
				DueAt: strPtr("not-a-date"),
			},
			wantErr: ErrInvalidInput,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := NewMockTaskStore()
			ctx := context.Background()

			task, err := s.Create(ctx, tt.input)
			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected error %v, got nil", tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if task.Title != tt.input.Title {
				t.Errorf("title = %q, want %q", task.Title, tt.input.Title)
			}
			if task.ID == 0 {
				t.Error("expected non-zero ID")
			}
			if task.ContextTags == nil {
				t.Error("expected non-nil context_tags")
			}
		})
	}
}

func TestMockTaskStore_GetByID(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	// Not found
	_, err := s.GetByID(ctx, 999)
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	// Create and get
	created, _ := s.Create(ctx, model.CreateTaskInput{Title: "Test"})
	got, err := s.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != created.ID {
		t.Errorf("ID = %d, want %d", got.ID, created.ID)
	}
}

func TestMockTaskStore_List(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	// Empty list
	result, err := s.List(ctx, model.TaskFilter{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 0 {
		t.Errorf("expected empty list, got %d items", len(result.Items))
	}

	// Add tasks
	s.Create(ctx, model.CreateTaskInput{Title: "Task 1", Status: strPtr("inbox")})
	s.Create(ctx, model.CreateTaskInput{Title: "Task 2", Status: strPtr("done")})
	s.Create(ctx, model.CreateTaskInput{Title: "Task 3", Status: strPtr("inbox"), Priority: strPtr("p0")})

	// List all
	result, err = s.List(ctx, model.TaskFilter{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Total != 3 {
		t.Errorf("total = %d, want 3", result.Total)
	}

	// Filter by status
	inbox := "inbox"
	result, err = s.List(ctx, model.TaskFilter{Status: &inbox})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Total != 2 {
		t.Errorf("total = %d, want 2", result.Total)
	}

	// Filter by priority
	p0 := "p0"
	result, err = s.List(ctx, model.TaskFilter{Priority: &p0})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Total != 1 {
		t.Errorf("total = %d, want 1", result.Total)
	}

	// Pagination
	result, err = s.List(ctx, model.TaskFilter{Limit: 1, Offset: 0})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 1 {
		t.Errorf("items = %d, want 1", len(result.Items))
	}
	if result.Total != 3 {
		t.Errorf("total = %d, want 3", result.Total)
	}

	// Offset beyond items
	result, err = s.List(ctx, model.TaskFilter{Limit: 10, Offset: 100})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 0 {
		t.Errorf("items = %d, want 0", len(result.Items))
	}
}

func TestMockTaskStore_ListByProjectID(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	pid := int64(42)
	s.Create(ctx, model.CreateTaskInput{Title: "With Project", ProjectID: &pid})
	s.Create(ctx, model.CreateTaskInput{Title: "No Project"})

	result, err := s.List(ctx, model.TaskFilter{ProjectID: &pid})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Total != 1 {
		t.Errorf("total = %d, want 1", result.Total)
	}
}

func TestMockTaskStore_Update(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	// Update non-existent
	_, err := s.Update(ctx, 999, model.UpdateTaskInput{Title: strPtr("New")})
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	created, _ := s.Create(ctx, model.CreateTaskInput{Title: "Original"})

	tests := []struct {
		name    string
		input   model.UpdateTaskInput
		check   func(t *testing.T, task model.Task)
		wantErr error
	}{
		{
			name:  "update title",
			input: model.UpdateTaskInput{Title: strPtr("Updated")},
			check: func(t *testing.T, task model.Task) {
				if task.Title != "Updated" {
					t.Errorf("title = %q, want %q", task.Title, "Updated")
				}
			},
		},
		{
			name:    "empty title rejected",
			input:   model.UpdateTaskInput{Title: strPtr("")},
			wantErr: ErrInvalidInput,
		},
		{
			name:  "update status to done sets completed_at",
			input: model.UpdateTaskInput{Status: strPtr("done")},
			check: func(t *testing.T, task model.Task) {
				if task.Status != "done" {
					t.Errorf("status = %q, want %q", task.Status, "done")
				}
				if task.CompletedAt == nil {
					t.Error("expected completed_at to be set")
				}
			},
		},
		{
			name:  "update status to in_progress sets started_at",
			input: model.UpdateTaskInput{Status: strPtr("in_progress")},
			check: func(t *testing.T, task model.Task) {
				if task.StartedAt == nil {
					t.Error("expected started_at to be set")
				}
			},
		},
		{
			name:  "update priority",
			input: model.UpdateTaskInput{Priority: strPtr("p1")},
			check: func(t *testing.T, task model.Task) {
				if task.Priority != "p1" {
					t.Errorf("priority = %q, want %q", task.Priority, "p1")
				}
			},
		},
		{
			name:  "update deep_work",
			input: model.UpdateTaskInput{DeepWork: boolPtr(true)},
			check: func(t *testing.T, task model.Task) {
				if !task.DeepWork {
					t.Error("expected deep_work to be true")
				}
			},
		},
		{
			name:  "update quick_win",
			input: model.UpdateTaskInput{QuickWin: boolPtr(true)},
			check: func(t *testing.T, task model.Task) {
				if !task.QuickWin {
					t.Error("expected quick_win to be true")
				}
			},
		},
		{
			name:  "update context_tags",
			input: model.UpdateTaskInput{ContextTags: []string{"@office", "@computer"}},
			check: func(t *testing.T, task model.Task) {
				if len(task.ContextTags) != 2 {
					t.Errorf("context_tags len = %d, want 2", len(task.ContextTags))
				}
			},
		},
		{
			name:  "update sort_order",
			input: model.UpdateTaskInput{SortOrder: intPtr(5)},
			check: func(t *testing.T, task model.Task) {
				if task.SortOrder != 5 {
					t.Errorf("sort_order = %d, want 5", task.SortOrder)
				}
			},
		},
		{
			name:  "update due_at",
			input: model.UpdateTaskInput{DueAt: strPtr("2026-06-15T12:00:00Z")},
			check: func(t *testing.T, task model.Task) {
				if task.DueAt == nil {
					t.Error("expected due_at to be set")
				}
			},
		},
		{
			name:    "invalid due_at format",
			input:   model.UpdateTaskInput{DueAt: strPtr("bad-date")},
			wantErr: ErrInvalidInput,
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

func TestMockTaskStore_Delete(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	// Delete non-existent
	err := s.Delete(ctx, 999)
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	// Create and delete
	created, _ := s.Create(ctx, model.CreateTaskInput{Title: "To Delete"})
	err = s.Delete(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify deleted
	_, err = s.GetByID(ctx, created.ID)
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound after delete, got %v", err)
	}
}

func TestMockTaskStore_Events(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	// Create event on non-existent task
	_, err := s.CreateEvent(ctx, 999, model.CreateTaskEventInput{EventType: "created"})
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	// Create task
	task, _ := s.Create(ctx, model.CreateTaskInput{Title: "Evented"})

	// Empty event type
	_, err = s.CreateEvent(ctx, task.ID, model.CreateTaskEventInput{EventType: ""})
	if err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}

	// Create valid events
	payload := json.RawMessage(`{"from":"inbox","to":"done"}`)
	evt, err := s.CreateEvent(ctx, task.ID, model.CreateTaskEventInput{
		EventType: "status_changed",
		Payload:   &payload,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if evt.EventType != "status_changed" {
		t.Errorf("event_type = %q, want %q", evt.EventType, "status_changed")
	}
	if evt.TaskID != task.ID {
		t.Errorf("task_id = %d, want %d", evt.TaskID, task.ID)
	}

	// List events
	events, err := s.ListEvents(ctx, task.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(events) != 1 {
		t.Errorf("events count = %d, want 1", len(events))
	}

	// List events for task without events
	events, err = s.ListEvents(ctx, 999)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(events) != 0 {
		t.Errorf("events count = %d, want 0", len(events))
	}
}

func TestMockTaskStore_Lifecycle(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	// Create task
	task, err := s.Create(ctx, model.CreateTaskInput{Title: "Lifecycle Task"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if task.Status != "inbox" {
		t.Errorf("initial status = %q, want inbox", task.Status)
	}

	// Triage
	task, err = s.Update(ctx, task.ID, model.UpdateTaskInput{Status: strPtr("ready")})
	if err != nil {
		t.Fatalf("update to ready: %v", err)
	}

	// Start
	task, err = s.Update(ctx, task.ID, model.UpdateTaskInput{Status: strPtr("in_progress")})
	if err != nil {
		t.Fatalf("update to in_progress: %v", err)
	}
	if task.StartedAt == nil {
		t.Error("expected started_at after in_progress")
	}

	// Add event
	_, err = s.CreateEvent(ctx, task.ID, model.CreateTaskEventInput{EventType: "status_changed"})
	if err != nil {
		t.Fatalf("create event: %v", err)
	}

	// Complete
	task, err = s.Update(ctx, task.ID, model.UpdateTaskInput{Status: strPtr("done")})
	if err != nil {
		t.Fatalf("update to done: %v", err)
	}
	if task.CompletedAt == nil {
		t.Error("expected completed_at after done")
	}
}

func TestMockTaskStore_UpdateCancelledSetsCompletedAt(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	task, _ := s.Create(ctx, model.CreateTaskInput{Title: "Cancel Me"})
	updated, err := s.Update(ctx, task.ID, model.UpdateTaskInput{Status: strPtr("cancelled")})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.CompletedAt == nil {
		t.Error("expected completed_at to be set for cancelled status")
	}
}

func TestMockTaskStore_UpdateDescription(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	task, _ := s.Create(ctx, model.CreateTaskInput{Title: "Desc Test"})
	desc := "Updated description"
	updated, err := s.Update(ctx, task.ID, model.UpdateTaskInput{Description: &desc})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.Description == nil || *updated.Description != desc {
		t.Errorf("description = %v, want %q", updated.Description, desc)
	}
}

func TestMockTaskStore_UpdateEnergy(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	task, _ := s.Create(ctx, model.CreateTaskInput{Title: "Energy"})
	energy := "high"
	updated, err := s.Update(ctx, task.ID, model.UpdateTaskInput{Energy: &energy})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.Energy == nil || *updated.Energy != "high" {
		t.Errorf("energy = %v, want high", updated.Energy)
	}
}

func TestMockTaskStore_UpdateEstimatedMins(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	task, _ := s.Create(ctx, model.CreateTaskInput{Title: "Est"})
	mins := 30
	updated, err := s.Update(ctx, task.ID, model.UpdateTaskInput{EstimatedMins: &mins})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.EstimatedMins == nil || *updated.EstimatedMins != 30 {
		t.Errorf("estimated_mins = %v, want 30", updated.EstimatedMins)
	}
}

func TestMockTaskStore_UpdateTaskType(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	task, _ := s.Create(ctx, model.CreateTaskInput{Title: "Type"})
	tt := "bug"
	updated, err := s.Update(ctx, task.ID, model.UpdateTaskInput{TaskType: &tt})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.TaskType != "bug" {
		t.Errorf("task_type = %q, want bug", updated.TaskType)
	}
}

func TestMockTaskStore_UpdateRecurrence(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	task, _ := s.Create(ctx, model.CreateTaskInput{Title: "Recur"})
	rec := "0 9 * * 1"
	updated, err := s.Update(ctx, task.ID, model.UpdateTaskInput{Recurrence: &rec})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.Recurrence == nil || *updated.Recurrence != rec {
		t.Errorf("recurrence = %v, want %q", updated.Recurrence, rec)
	}
}

func TestMockTaskStore_UpdateProjectID(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	task, _ := s.Create(ctx, model.CreateTaskInput{Title: "ProjTask"})
	pid := int64(10)
	updated, err := s.Update(ctx, task.ID, model.UpdateTaskInput{ProjectID: &pid})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.ProjectID == nil || *updated.ProjectID != 10 {
		t.Errorf("project_id = %v, want 10", updated.ProjectID)
	}
}

func TestMockTaskStore_UpdateParentID(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	parent, _ := s.Create(ctx, model.CreateTaskInput{Title: "Parent"})
	child, _ := s.Create(ctx, model.CreateTaskInput{Title: "Child"})
	updated, err := s.Update(ctx, child.ID, model.UpdateTaskInput{ParentID: &parent.ID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.ParentID == nil || *updated.ParentID != parent.ID {
		t.Errorf("parent_id = %v, want %d", updated.ParentID, parent.ID)
	}
}

func TestMockTaskStore_InProgressNoOverwriteStartedAt(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	task, _ := s.Create(ctx, model.CreateTaskInput{Title: "Started"})
	task, _ = s.Update(ctx, task.ID, model.UpdateTaskInput{Status: strPtr("in_progress")})
	firstStarted := task.StartedAt

	// Sleeping is not great but we need a time difference
	time.Sleep(1 * time.Millisecond)

	task, _ = s.Update(ctx, task.ID, model.UpdateTaskInput{Status: strPtr("in_progress")})
	if task.StartedAt != firstStarted {
		t.Error("started_at should not change on second in_progress update")
	}
}

func TestMockTaskStore_DeleteAlsoRemovesEvents(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	task, _ := s.Create(ctx, model.CreateTaskInput{Title: "WithEvents"})
	s.CreateEvent(ctx, task.ID, model.CreateTaskEventInput{EventType: "created"})

	err := s.Delete(ctx, task.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	events, _ := s.ListEvents(ctx, task.ID)
	if len(events) != 0 {
		t.Errorf("events should be empty after delete, got %d", len(events))
	}
}

func TestMockTaskStore_CreateWithAllDefaults(t *testing.T) {
	s := NewMockTaskStore()
	ctx := context.Background()

	task, err := s.Create(ctx, model.CreateTaskInput{Title: "Defaults"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if task.Status != "inbox" {
		t.Errorf("status = %q, want inbox", task.Status)
	}
	if task.Priority != "p2" {
		t.Errorf("priority = %q, want p2", task.Priority)
	}
	if task.TaskType != "task" {
		t.Errorf("task_type = %q, want task", task.TaskType)
	}
	if task.DeepWork {
		t.Error("deep_work should default to false")
	}
	if task.QuickWin {
		t.Error("quick_win should default to false")
	}
}

// Helper functions
func strPtr(s string) *string  { return &s }
func boolPtr(b bool) *bool     { return &b }
func intPtr(i int) *int        { return &i }
