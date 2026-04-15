package cache

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

func openTempCache(t *testing.T) *Cache {
	t.Helper()
	dir := t.TempDir()
	c, err := Open(filepath.Join(dir, "cache.db"))
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { _ = c.Close() })
	return c
}

func TestOpenIdempotent(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "cache.db")
	c1, err := Open(p)
	if err != nil {
		t.Fatalf("first open: %v", err)
	}
	if err := c1.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}
	// Reopening must not re-run DDL destructively.
	c2, err := Open(p)
	if err != nil {
		t.Fatalf("second open: %v", err)
	}
	_ = c2.Close()
}

func TestPutAndListTasks(t *testing.T) {
	c := openTempCache(t)
	now := time.Now().UTC()
	tasks := []model.Task{
		{ID: 1, Title: "a", Status: "pending", Priority: "high", UpdatedAt: now},
		{ID: 2, Title: "b", Status: "done", Priority: "low", UpdatedAt: now},
	}
	if err := c.PutTasks(tasks, true); err != nil {
		t.Fatalf("PutTasks: %v", err)
	}

	got, err := c.ListTasks(TaskFilter{})
	if err != nil {
		t.Fatalf("ListTasks: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 tasks, got %d", len(got))
	}

	// Filter by status.
	got, err = c.ListTasks(TaskFilter{Status: "done"})
	if err != nil {
		t.Fatalf("ListTasks status: %v", err)
	}
	if len(got) != 1 || got[0].ID != 2 {
		t.Fatalf("status filter failed: %+v", got)
	}

	// GetTask round-trip.
	one, err := c.GetTask(1)
	if err != nil {
		t.Fatalf("GetTask: %v", err)
	}
	if one.Title != "a" {
		t.Fatalf("got title %q", one.Title)
	}
}

func TestDeleteTask(t *testing.T) {
	c := openTempCache(t)
	_ = c.PutTasks([]model.Task{{ID: 99, Title: "x", UpdatedAt: time.Now().UTC()}}, true)
	if err := c.DeleteTask(99); err != nil {
		t.Fatalf("DeleteTask: %v", err)
	}
	if _, err := c.GetTask(99); err == nil {
		t.Fatal("expected error after delete")
	}
}

func TestLastSyncRoundtrip(t *testing.T) {
	c := openTempCache(t)
	ts := time.Now().UTC().Format(time.RFC3339)
	if err := c.SetLastSync(ts); err != nil {
		t.Fatalf("SetLastSync: %v", err)
	}
	got, err := c.LastSync()
	if err != nil {
		t.Fatalf("LastSync: %v", err)
	}
	if got != ts {
		t.Fatalf("want %s got %s", ts, got)
	}
}
