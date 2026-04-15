package cache

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/client"
	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

// writeEnvelope writes a minimal {data, error} envelope.
func writeEnvelope(w http.ResponseWriter, status int, data any, errMsg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	body := map[string]any{"data": data}
	if errMsg != "" {
		body["error"] = errMsg
		body["data"] = nil
	}
	_ = json.NewEncoder(w).Encode(body)
}

func TestDrainOnceHappyPath(t *testing.T) {
	var nextID int64 = 1
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/api/v1/tasks":
			var in model.CreateTaskInput
			_ = json.NewDecoder(r.Body).Decode(&in)
			id := nextID
			nextID++
			task := model.Task{ID: id, Title: in.Title, Status: "pending", CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}
			writeEnvelope(w, http.StatusCreated, task, "")
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	cli := client.New(client.Options{Base: srv.URL, Timeout: 2 * time.Second})

	c := openTempCache(t)
	localID, err := c.EnqueueTaskCreate(model.CreateTaskInput{Title: "queued task"})
	if err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	if localID >= 0 {
		t.Fatalf("expected negative temp id")
	}

	res, err := c.DrainOnce(context.Background(), cli)
	if err != nil {
		t.Fatalf("DrainOnce: %v", err)
	}
	if res.Done != 1 || res.Failed != 0 {
		t.Fatalf("unexpected drain result: %+v", res)
	}
	if c.PendingCount() != 0 {
		t.Fatalf("expected 0 pending, got %d", c.PendingCount())
	}
	// Temp row should be gone; real row should exist.
	if _, err := c.GetTask(localID); err == nil {
		t.Fatal("expected temp row replaced")
	}
	if _, err := c.GetTask(1); err != nil {
		t.Fatalf("expected real row with id 1: %v", err)
	}
}

func TestDrainConflictSurfacesFailure(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeEnvelope(w, http.StatusConflict, nil, "title taken")
	}))
	defer srv.Close()

	cli := client.New(client.Options{Base: srv.URL, Timeout: 2 * time.Second})

	c := openTempCache(t)
	if _, err := c.EnqueueTaskCreate(model.CreateTaskInput{Title: "dup"}); err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	res, err := c.DrainOnce(context.Background(), cli)
	if err != nil {
		t.Fatalf("DrainOnce: %v", err)
	}
	if res.Failed != 1 {
		t.Fatalf("expected failed=1, got %+v", res)
	}
	// Row must remain in queue, with error recorded.
	rows, _ := c.pendingRows(true)
	if len(rows) != 1 || rows[0].Error == nil || !strings.Contains(*rows[0].Error, "title taken") {
		t.Fatalf("expected conflict surfaced; rows=%+v", rows)
	}
}

func TestDrainReconcilesEmbeddedTempTaskID(t *testing.T) {
	// Two-step scenario: a task is created offline (temp id), then a time-entry
	// referencing that temp id is enqueued. When we drain, the task POST lands
	// first and the time-entry payload must have its task_id rewritten before
	// it is sent to the server.
	var nextTaskID int64 = 77
	var nextEntryID int64 = 500
	seenTaskIDs := []int64{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/api/v1/tasks":
			var in model.CreateTaskInput
			_ = json.NewDecoder(r.Body).Decode(&in)
			id := nextTaskID
			nextTaskID++
			task := model.Task{ID: id, Title: in.Title, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}
			writeEnvelope(w, http.StatusCreated, task, "")
		case r.Method == http.MethodPost && r.URL.Path == "/api/v1/time-entries":
			var in model.CreateTimeEntryInput
			_ = json.NewDecoder(r.Body).Decode(&in)
			if in.TaskID != nil {
				seenTaskIDs = append(seenTaskIDs, *in.TaskID)
			}
			entry := model.TimeEntry{ID: nextEntryID, TaskID: in.TaskID, CreatedAt: time.Now().UTC(), StartedAt: time.Now().UTC()}
			nextEntryID++
			writeEnvelope(w, http.StatusCreated, entry, "")
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	cli := client.New(client.Options{Base: srv.URL, Timeout: 2 * time.Second})

	c := openTempCache(t)
	tempTaskID, err := c.EnqueueTaskCreate(model.CreateTaskInput{Title: "parent"})
	if err != nil {
		t.Fatalf("enqueue task: %v", err)
	}
	// Enqueue a time entry with the temp task id.
	if _, err := c.EnqueueTimeEntryCreate(model.CreateTimeEntryInput{
		TaskID:    &tempTaskID,
		StartedAt: time.Now().UTC().Format(time.RFC3339),
	}); err != nil {
		t.Fatalf("enqueue entry: %v", err)
	}
	res, err := c.DrainOnce(context.Background(), cli)
	if err != nil {
		t.Fatalf("DrainOnce: %v", err)
	}
	if res.Done != 2 || res.Failed != 0 {
		t.Fatalf("unexpected drain result: %+v", res)
	}
	if len(seenTaskIDs) != 1 || seenTaskIDs[0] != 77 {
		t.Fatalf("expected server to see rewritten task id 77, got %v", seenTaskIDs)
	}
}
