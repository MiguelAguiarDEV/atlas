package cache

import (
	"testing"
	"time"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

func TestPutAndListProjects(t *testing.T) {
	c := openTempCache(t)
	now := time.Now().UTC()
	projects := []model.Project{
		{ID: 1, Name: "work", Status: "active", Area: "career", UpdatedAt: now},
		{ID: 2, Name: "home", Status: "paused", Area: "life", UpdatedAt: now},
	}
	if err := c.PutProjects(projects, true); err != nil {
		t.Fatalf("PutProjects: %v", err)
	}
	got, err := c.ListProjects(ProjectFilter{Status: "active"})
	if err != nil {
		t.Fatalf("ListProjects: %v", err)
	}
	if len(got) != 1 || got[0].ID != 1 {
		t.Fatalf("expected only active project; got %+v", got)
	}
}

func TestPutAndListTimeEntries(t *testing.T) {
	c := openTempCache(t)
	now := time.Now().UTC()
	taskID := int64(42)
	entries := []model.TimeEntry{
		{ID: 10, TaskID: &taskID, StartedAt: now, EntryType: "work", CreatedAt: now},
		{ID: 11, StartedAt: now, EntryType: "break", CreatedAt: now},
	}
	if err := c.PutTimeEntries(entries, true); err != nil {
		t.Fatalf("PutTimeEntries: %v", err)
	}
	got, err := c.ListTimeEntries(TimeEntryFilter{TaskID: &taskID})
	if err != nil {
		t.Fatalf("ListTimeEntries: %v", err)
	}
	if len(got) != 1 || got[0].ID != 10 {
		t.Fatalf("task filter failed: %+v", got)
	}
}

func TestPutAndListHabits(t *testing.T) {
	c := openTempCache(t)
	now := time.Now().UTC()
	g := "morning"
	habits := []model.Habit{
		{ID: 1, Name: "read", Frequency: "daily", TargetCount: 1, HabitGroup: &g, Active: true, CreatedAt: now},
		{ID: 2, Name: "quit", Frequency: "daily", TargetCount: 1, Active: false, CreatedAt: now},
	}
	if err := c.PutHabits(habits, true); err != nil {
		t.Fatalf("PutHabits: %v", err)
	}
	active := true
	got, err := c.ListHabits(HabitFilter{Active: &active})
	if err != nil {
		t.Fatalf("ListHabits: %v", err)
	}
	if len(got) != 1 || got[0].Name != "read" {
		t.Fatalf("active filter failed: %+v", got)
	}
}
