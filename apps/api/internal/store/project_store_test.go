package store

import (
	"context"
	"testing"

	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/model"
)

func TestMockProjectStore_Create(t *testing.T) {
	tests := []struct {
		name    string
		input   model.CreateProjectInput
		wantErr error
	}{
		{
			name:    "valid project",
			input:   model.CreateProjectInput{Name: "Project A"},
			wantErr: nil,
		},
		{
			name:    "empty name",
			input:   model.CreateProjectInput{Name: ""},
			wantErr: ErrInvalidInput,
		},
		{
			name: "with all fields",
			input: model.CreateProjectInput{
				Name:        "Full Project",
				Description: strPtr("Some desc"),
				Color:       strPtr("#ff0000"),
				Icon:        strPtr("rocket"),
				Area:        strPtr("areas"),
				Status:      strPtr("paused"),
				SortOrder:   intPtr(3),
			},
			wantErr: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := NewMockProjectStore()
			ctx := context.Background()

			p, err := s.Create(ctx, tt.input)
			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected error %v, got nil", tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if p.Name != tt.input.Name {
				t.Errorf("name = %q, want %q", p.Name, tt.input.Name)
			}
			if p.ID == 0 {
				t.Error("expected non-zero ID")
			}
		})
	}
}

func TestMockProjectStore_CreateDefaults(t *testing.T) {
	s := NewMockProjectStore()
	ctx := context.Background()

	p, err := s.Create(ctx, model.CreateProjectInput{Name: "Defaults"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if p.Color != "#3b82f6" {
		t.Errorf("color = %q, want #3b82f6", p.Color)
	}
	if p.Area != "projects" {
		t.Errorf("area = %q, want projects", p.Area)
	}
	if p.Status != "active" {
		t.Errorf("status = %q, want active", p.Status)
	}
	if p.SortOrder != 0 {
		t.Errorf("sort_order = %d, want 0", p.SortOrder)
	}
}

func TestMockProjectStore_GetByID(t *testing.T) {
	s := NewMockProjectStore()
	ctx := context.Background()

	// Not found
	_, err := s.GetByID(ctx, 999)
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	// Create and get
	created, _ := s.Create(ctx, model.CreateProjectInput{Name: "Test"})
	got, err := s.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != created.ID {
		t.Errorf("ID = %d, want %d", got.ID, created.ID)
	}
	if got.Name != "Test" {
		t.Errorf("name = %q, want Test", got.Name)
	}
}

func TestMockProjectStore_List(t *testing.T) {
	s := NewMockProjectStore()
	ctx := context.Background()

	// Empty
	result, err := s.List(ctx, 50, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 0 {
		t.Errorf("expected empty list")
	}

	// Add projects
	s.Create(ctx, model.CreateProjectInput{Name: "P1"})
	s.Create(ctx, model.CreateProjectInput{Name: "P2"})
	s.Create(ctx, model.CreateProjectInput{Name: "P3"})

	result, err = s.List(ctx, 50, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Total != 3 {
		t.Errorf("total = %d, want 3", result.Total)
	}

	// Pagination
	result, err = s.List(ctx, 2, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 2 {
		t.Errorf("items = %d, want 2", len(result.Items))
	}
	if result.Total != 3 {
		t.Errorf("total = %d, want 3", result.Total)
	}

	// Offset beyond items
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
	if len(result.Items) != 3 {
		t.Errorf("items = %d, want 3", len(result.Items))
	}

	// Negative offset
	result, err = s.List(ctx, 50, -1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 3 {
		t.Errorf("items = %d, want 3", len(result.Items))
	}
}

func TestMockProjectStore_Update(t *testing.T) {
	s := NewMockProjectStore()
	ctx := context.Background()

	// Update non-existent
	_, err := s.Update(ctx, 999, model.UpdateProjectInput{Name: strPtr("New")})
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	created, _ := s.Create(ctx, model.CreateProjectInput{Name: "Original"})

	tests := []struct {
		name    string
		input   model.UpdateProjectInput
		check   func(t *testing.T, p model.Project)
		wantErr error
	}{
		{
			name:  "update name",
			input: model.UpdateProjectInput{Name: strPtr("Renamed")},
			check: func(t *testing.T, p model.Project) {
				if p.Name != "Renamed" {
					t.Errorf("name = %q, want Renamed", p.Name)
				}
			},
		},
		{
			name:    "empty name rejected",
			input:   model.UpdateProjectInput{Name: strPtr("")},
			wantErr: ErrInvalidInput,
		},
		{
			name:  "update description",
			input: model.UpdateProjectInput{Description: strPtr("New desc")},
			check: func(t *testing.T, p model.Project) {
				if p.Description == nil || *p.Description != "New desc" {
					t.Errorf("description = %v, want New desc", p.Description)
				}
			},
		},
		{
			name:  "update color",
			input: model.UpdateProjectInput{Color: strPtr("#00ff00")},
			check: func(t *testing.T, p model.Project) {
				if p.Color != "#00ff00" {
					t.Errorf("color = %q, want #00ff00", p.Color)
				}
			},
		},
		{
			name:  "update icon",
			input: model.UpdateProjectInput{Icon: strPtr("star")},
			check: func(t *testing.T, p model.Project) {
				if p.Icon == nil || *p.Icon != "star" {
					t.Errorf("icon = %v, want star", p.Icon)
				}
			},
		},
		{
			name:  "update area",
			input: model.UpdateProjectInput{Area: strPtr("archive")},
			check: func(t *testing.T, p model.Project) {
				if p.Area != "archive" {
					t.Errorf("area = %q, want archive", p.Area)
				}
			},
		},
		{
			name:  "update status",
			input: model.UpdateProjectInput{Status: strPtr("completed")},
			check: func(t *testing.T, p model.Project) {
				if p.Status != "completed" {
					t.Errorf("status = %q, want completed", p.Status)
				}
			},
		},
		{
			name:  "update sort_order",
			input: model.UpdateProjectInput{SortOrder: intPtr(10)},
			check: func(t *testing.T, p model.Project) {
				if p.SortOrder != 10 {
					t.Errorf("sort_order = %d, want 10", p.SortOrder)
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

func TestMockProjectStore_Delete(t *testing.T) {
	s := NewMockProjectStore()
	ctx := context.Background()

	// Delete non-existent
	err := s.Delete(ctx, 999)
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	// Create and delete
	created, _ := s.Create(ctx, model.CreateProjectInput{Name: "To Delete"})
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
