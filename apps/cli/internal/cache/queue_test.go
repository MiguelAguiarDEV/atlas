package cache

import (
	"testing"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

func TestEnqueueTaskCreateTempID(t *testing.T) {
	c := openTempCache(t)
	id1, err := c.EnqueueTaskCreate(model.CreateTaskInput{Title: "first"})
	if err != nil {
		t.Fatalf("EnqueueTaskCreate: %v", err)
	}
	if id1 >= 0 {
		t.Fatalf("expected negative temp id, got %d", id1)
	}
	id2, err := c.EnqueueTaskCreate(model.CreateTaskInput{Title: "second"})
	if err != nil {
		t.Fatalf("EnqueueTaskCreate: %v", err)
	}
	if id2 >= id1 {
		t.Fatalf("expected monotonically decreasing temp ids, got %d then %d", id1, id2)
	}
	if c.PendingCount() != 2 {
		t.Fatalf("expected 2 pending, got %d", c.PendingCount())
	}

	// Optimistic row should be readable.
	got, err := c.GetTask(id1)
	if err != nil {
		t.Fatalf("GetTask: %v", err)
	}
	if got.Title != "first" {
		t.Fatalf("optimistic task lost title: %+v", got)
	}
}

func TestEnqueueTaskUpdateMerges(t *testing.T) {
	c := openTempCache(t)
	id, err := c.EnqueueTaskCreate(model.CreateTaskInput{Title: "old"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	newTitle := "new"
	if err := c.EnqueueTaskUpdate(id, model.UpdateTaskInput{Title: &newTitle}); err != nil {
		t.Fatalf("update: %v", err)
	}
	got, err := c.GetTask(id)
	if err != nil {
		t.Fatalf("GetTask: %v", err)
	}
	if got.Title != "new" {
		t.Fatalf("expected new title, got %q", got.Title)
	}
	if c.PendingCount() != 2 {
		t.Fatalf("expected 2 pending rows (create + update), got %d", c.PendingCount())
	}
}

func TestEnqueueTaskDelete(t *testing.T) {
	c := openTempCache(t)
	id, _ := c.EnqueueTaskCreate(model.CreateTaskInput{Title: "doomed"})
	if err := c.EnqueueTaskDelete(id); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := c.GetTask(id); err == nil {
		t.Fatal("expected not found after delete")
	}
	if c.PendingCount() != 2 {
		t.Fatalf("expected 2 pending (create + delete), got %d", c.PendingCount())
	}
}
