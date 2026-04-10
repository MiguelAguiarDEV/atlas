package store

import (
	"context"
	"testing"

	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/model"
)

func TestMockHabitStore_Create(t *testing.T) {
	tests := []struct {
		name    string
		input   model.CreateHabitInput
		wantErr error
	}{
		{
			name:    "valid habit",
			input:   model.CreateHabitInput{Name: "Exercise"},
			wantErr: nil,
		},
		{
			name:    "empty name",
			input:   model.CreateHabitInput{Name: ""},
			wantErr: ErrInvalidInput,
		},
		{
			name: "with all fields",
			input: model.CreateHabitInput{
				Name:        "Meditate",
				Description: strPtr("10 min meditation"),
				Frequency:   strPtr("daily"),
				TargetCount: intPtr(2),
				HabitGroup:  strPtr("morning"),
				SortOrder:   intPtr(1),
			},
			wantErr: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := NewMockHabitStore()
			ctx := context.Background()

			h, err := s.Create(ctx, tt.input)
			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected error %v, got nil", tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if h.Name != tt.input.Name {
				t.Errorf("name = %q, want %q", h.Name, tt.input.Name)
			}
			if h.ID == 0 {
				t.Error("expected non-zero ID")
			}
		})
	}
}

func TestMockHabitStore_CreateDefaults(t *testing.T) {
	s := NewMockHabitStore()
	ctx := context.Background()

	h, err := s.Create(ctx, model.CreateHabitInput{Name: "Defaults"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if h.Frequency != "daily" {
		t.Errorf("frequency = %q, want daily", h.Frequency)
	}
	if h.TargetCount != 1 {
		t.Errorf("target_count = %d, want 1", h.TargetCount)
	}
	if !h.Active {
		t.Error("expected active to be true")
	}
	if h.SortOrder != 0 {
		t.Errorf("sort_order = %d, want 0", h.SortOrder)
	}
}

func TestMockHabitStore_GetByID(t *testing.T) {
	s := NewMockHabitStore()
	ctx := context.Background()

	// Not found
	_, err := s.GetByID(ctx, 999)
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	// Create and get
	created, _ := s.Create(ctx, model.CreateHabitInput{Name: "Test"})
	got, err := s.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != created.ID {
		t.Errorf("ID = %d, want %d", got.ID, created.ID)
	}
}

func TestMockHabitStore_List(t *testing.T) {
	s := NewMockHabitStore()
	ctx := context.Background()

	// Empty
	result, err := s.List(ctx, 50, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 0 {
		t.Errorf("expected empty list")
	}

	// Add habits
	s.Create(ctx, model.CreateHabitInput{Name: "H1"})
	s.Create(ctx, model.CreateHabitInput{Name: "H2"})

	result, err = s.List(ctx, 50, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Total != 2 {
		t.Errorf("total = %d, want 2", result.Total)
	}

	// Pagination
	result, err = s.List(ctx, 1, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 1 {
		t.Errorf("items = %d, want 1", len(result.Items))
	}

	// Offset beyond
	result, err = s.List(ctx, 10, 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 0 {
		t.Errorf("items = %d, want 0", len(result.Items))
	}

	// Default limit
	result, err = s.List(ctx, 0, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 2 {
		t.Errorf("items = %d, want 2", len(result.Items))
	}

	// Negative offset
	result, err = s.List(ctx, 50, -1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 2 {
		t.Errorf("items = %d, want 2", len(result.Items))
	}
}

func TestMockHabitStore_Update(t *testing.T) {
	s := NewMockHabitStore()
	ctx := context.Background()

	// Update non-existent
	_, err := s.Update(ctx, 999, model.UpdateHabitInput{Name: strPtr("New")})
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	created, _ := s.Create(ctx, model.CreateHabitInput{Name: "Original"})

	tests := []struct {
		name    string
		input   model.UpdateHabitInput
		check   func(t *testing.T, h model.Habit)
		wantErr error
	}{
		{
			name:  "update name",
			input: model.UpdateHabitInput{Name: strPtr("Renamed")},
			check: func(t *testing.T, h model.Habit) {
				if h.Name != "Renamed" {
					t.Errorf("name = %q, want Renamed", h.Name)
				}
			},
		},
		{
			name:    "empty name rejected",
			input:   model.UpdateHabitInput{Name: strPtr("")},
			wantErr: ErrInvalidInput,
		},
		{
			name:  "update description",
			input: model.UpdateHabitInput{Description: strPtr("New desc")},
			check: func(t *testing.T, h model.Habit) {
				if h.Description == nil || *h.Description != "New desc" {
					t.Errorf("description = %v, want New desc", h.Description)
				}
			},
		},
		{
			name:  "update frequency",
			input: model.UpdateHabitInput{Frequency: strPtr("weekly")},
			check: func(t *testing.T, h model.Habit) {
				if h.Frequency != "weekly" {
					t.Errorf("frequency = %q, want weekly", h.Frequency)
				}
			},
		},
		{
			name:  "update target_count",
			input: model.UpdateHabitInput{TargetCount: intPtr(5)},
			check: func(t *testing.T, h model.Habit) {
				if h.TargetCount != 5 {
					t.Errorf("target_count = %d, want 5", h.TargetCount)
				}
			},
		},
		{
			name:  "update habit_group",
			input: model.UpdateHabitInput{HabitGroup: strPtr("evening")},
			check: func(t *testing.T, h model.Habit) {
				if h.HabitGroup == nil || *h.HabitGroup != "evening" {
					t.Errorf("habit_group = %v, want evening", h.HabitGroup)
				}
			},
		},
		{
			name:  "update sort_order",
			input: model.UpdateHabitInput{SortOrder: intPtr(3)},
			check: func(t *testing.T, h model.Habit) {
				if h.SortOrder != 3 {
					t.Errorf("sort_order = %d, want 3", h.SortOrder)
				}
			},
		},
		{
			name:  "deactivate",
			input: model.UpdateHabitInput{Active: boolPtr(false)},
			check: func(t *testing.T, h model.Habit) {
				if h.Active {
					t.Error("expected active to be false")
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

func TestMockHabitStore_Delete(t *testing.T) {
	s := NewMockHabitStore()
	ctx := context.Background()

	// Delete non-existent
	err := s.Delete(ctx, 999)
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	// Create and delete
	created, _ := s.Create(ctx, model.CreateHabitInput{Name: "To Delete"})
	err = s.Delete(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, err = s.GetByID(ctx, created.ID)
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound after delete, got %v", err)
	}
}

func TestMockHabitStore_DeleteRemovesCompletions(t *testing.T) {
	s := NewMockHabitStore()
	ctx := context.Background()

	h, _ := s.Create(ctx, model.CreateHabitInput{Name: "WithComps"})
	s.Complete(ctx, h.ID, model.CreateHabitCompletionInput{})
	s.Complete(ctx, h.ID, model.CreateHabitCompletionInput{})

	err := s.Delete(ctx, h.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	completions, _ := s.ListCompletions(ctx, h.ID, 50, 0)
	if len(completions) != 0 {
		t.Errorf("completions should be empty after delete, got %d", len(completions))
	}
}

func TestMockHabitStore_Complete(t *testing.T) {
	s := NewMockHabitStore()
	ctx := context.Background()

	// Complete non-existent habit
	_, err := s.Complete(ctx, 999, model.CreateHabitCompletionInput{})
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	h, _ := s.Create(ctx, model.CreateHabitInput{Name: "Test"})

	// Default completion (value=1)
	comp, err := s.Complete(ctx, h.ID, model.CreateHabitCompletionInput{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if comp.Value != 1 {
		t.Errorf("value = %d, want 1", comp.Value)
	}
	if comp.HabitID != h.ID {
		t.Errorf("habit_id = %d, want %d", comp.HabitID, h.ID)
	}

	// Custom value and notes
	notes := "Drank 3 glasses"
	comp2, err := s.Complete(ctx, h.ID, model.CreateHabitCompletionInput{
		Value: intPtr(3),
		Notes: &notes,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if comp2.Value != 3 {
		t.Errorf("value = %d, want 3", comp2.Value)
	}
	if comp2.Notes == nil || *comp2.Notes != notes {
		t.Errorf("notes = %v, want %q", comp2.Notes, notes)
	}
}

func TestMockHabitStore_ListCompletions(t *testing.T) {
	s := NewMockHabitStore()
	ctx := context.Background()

	// Empty list for non-existent
	completions, err := s.ListCompletions(ctx, 999, 50, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(completions) != 0 {
		t.Errorf("expected empty completions")
	}

	h, _ := s.Create(ctx, model.CreateHabitInput{Name: "Completable"})
	s.Complete(ctx, h.ID, model.CreateHabitCompletionInput{})
	s.Complete(ctx, h.ID, model.CreateHabitCompletionInput{Value: intPtr(2)})

	completions, err = s.ListCompletions(ctx, h.ID, 50, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(completions) != 2 {
		t.Errorf("completions = %d, want 2", len(completions))
	}
}
