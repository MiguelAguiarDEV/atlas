package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/model"
	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/store"
)

func newTaskRouter() (chi.Router, *store.MockTaskStore) {
	ms := store.NewMockTaskStore()
	h := NewTaskHandler(ms)
	r := chi.NewRouter()
	r.Mount("/tasks", h.Routes())
	return r, ms
}

func TestTaskHandler_Create(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantErr    bool
	}{
		{
			name:       "valid task",
			body:       `{"title":"New Task"}`,
			wantStatus: http.StatusCreated,
		},
		{
			name:       "with all fields",
			body:       `{"title":"Full","description":"desc","status":"ready","priority":"p0","energy":"high","task_type":"bug","context_tags":["@home"],"deep_work":true,"quick_win":true,"due_at":"2026-12-31T00:00:00Z"}`,
			wantStatus: http.StatusCreated,
		},
		{
			name:       "empty title",
			body:       `{"title":""}`,
			wantStatus: http.StatusBadRequest,
			wantErr:    true,
		},
		{
			name:       "invalid json",
			body:       `{bad json`,
			wantStatus: http.StatusBadRequest,
			wantErr:    true,
		},
		{
			name:       "empty body",
			body:       `{}`,
			wantStatus: http.StatusBadRequest,
			wantErr:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r, _ := newTaskRouter()
			req := httptest.NewRequest("POST", "/tasks/", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}

			var resp Response
			json.NewDecoder(w.Body).Decode(&resp)
			if tt.wantErr && resp.Error == nil {
				t.Error("expected error in response")
			}
			if !tt.wantErr && resp.Error != nil {
				t.Errorf("unexpected error: %s", *resp.Error)
			}
		})
	}
}

func TestTaskHandler_GetByID(t *testing.T) {
	r, ms := newTaskRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()

	// Create a task
	task, _ := ms.Create(ctx, model.CreateTaskInput{Title: "Test"})

	tests := []struct {
		name       string
		url        string
		wantStatus int
	}{
		{
			name:       "existing task",
			url:        "/tasks/1",
			wantStatus: http.StatusOK,
		},
		{
			name:       "non-existent task",
			url:        "/tasks/999",
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			url:        "/tasks/abc",
			wantStatus: http.StatusBadRequest,
		},
	}

	_ = task

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.url, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestTaskHandler_List(t *testing.T) {
	r, ms := newTaskRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()

	ms.Create(ctx, model.CreateTaskInput{Title: "Task 1"})
	ms.Create(ctx, model.CreateTaskInput{Title: "Task 2", Status: strPtr("done")})

	tests := []struct {
		name       string
		url        string
		wantStatus int
		wantTotal  int
	}{
		{
			name:       "list all",
			url:        "/tasks/",
			wantStatus: http.StatusOK,
			wantTotal:  2,
		},
		{
			name:       "filter by status",
			url:        "/tasks/?status=inbox",
			wantStatus: http.StatusOK,
			wantTotal:  1,
		},
		{
			name:       "with limit",
			url:        "/tasks/?limit=1",
			wantStatus: http.StatusOK,
			wantTotal:  2,
		},
		{
			name:       "with offset",
			url:        "/tasks/?offset=1",
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid limit",
			url:        "/tasks/?limit=abc",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid offset",
			url:        "/tasks/?offset=-1",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "valid project_id",
			url:        "/tasks/?project_id=1",
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid project_id",
			url:        "/tasks/?project_id=abc",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid due_from",
			url:        "/tasks/?due_from=bad",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid due_to",
			url:        "/tasks/?due_to=bad",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "valid due_from",
			url:        "/tasks/?due_from=2026-01-01T00:00:00Z",
			wantStatus: http.StatusOK,
		},
		{
			name:       "valid due_to",
			url:        "/tasks/?due_to=2026-12-31T00:00:00Z",
			wantStatus: http.StatusOK,
		},
		{
			name:       "filter by priority",
			url:        "/tasks/?priority=p0",
			wantStatus: http.StatusOK,
		},
		{
			name:       "negative limit",
			url:        "/tasks/?limit=-1",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "zero limit uses default",
			url:        "/tasks/?limit=0",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "with search param",
			url:        "/tasks/?search=task",
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.url, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestTaskHandler_Update(t *testing.T) {
	r, ms := newTaskRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateTaskInput{Title: "Original"})

	tests := []struct {
		name       string
		url        string
		body       string
		wantStatus int
	}{
		{
			name:       "update title",
			url:        "/tasks/1",
			body:       `{"title":"Updated"}`,
			wantStatus: http.StatusOK,
		},
		{
			name:       "update status",
			url:        "/tasks/1",
			body:       `{"status":"done"}`,
			wantStatus: http.StatusOK,
		},
		{
			name:       "non-existent task",
			url:        "/tasks/999",
			body:       `{"title":"X"}`,
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			url:        "/tasks/abc",
			body:       `{"title":"X"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid json",
			url:        "/tasks/1",
			body:       `{bad}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty title rejected",
			url:        "/tasks/1",
			body:       `{"title":""}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("PUT", tt.url, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestTaskHandler_Delete(t *testing.T) {
	r, ms := newTaskRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateTaskInput{Title: "To Delete"})

	tests := []struct {
		name       string
		url        string
		wantStatus int
	}{
		{
			name:       "delete existing",
			url:        "/tasks/1",
			wantStatus: http.StatusOK,
		},
		{
			name:       "delete non-existent",
			url:        "/tasks/999",
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			url:        "/tasks/abc",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("DELETE", tt.url, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", w.Code, tt.wantStatus)
			}
		})
	}
}

func TestTaskHandler_CreateEvent(t *testing.T) {
	r, ms := newTaskRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateTaskInput{Title: "Evented"})

	tests := []struct {
		name       string
		url        string
		body       string
		wantStatus int
	}{
		{
			name:       "valid event",
			url:        "/tasks/1/events",
			body:       `{"event_type":"status_changed","payload":{"from":"inbox","to":"done"}}`,
			wantStatus: http.StatusCreated,
		},
		{
			name:       "empty event_type",
			url:        "/tasks/1/events",
			body:       `{"event_type":""}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "non-existent task",
			url:        "/tasks/999/events",
			body:       `{"event_type":"test"}`,
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			url:        "/tasks/abc/events",
			body:       `{"event_type":"test"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid json",
			url:        "/tasks/1/events",
			body:       `{bad}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", tt.url, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestTaskHandler_ListEvents(t *testing.T) {
	r, ms := newTaskRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateTaskInput{Title: "Evented"})

	tests := []struct {
		name       string
		url        string
		wantStatus int
	}{
		{
			name:       "list events",
			url:        "/tasks/1/events",
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid id",
			url:        "/tasks/abc/events",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.url, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", w.Code, tt.wantStatus)
			}
		})
	}
}

func TestTaskHandler_ResponseEnvelope(t *testing.T) {
	r, ms := newTaskRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateTaskInput{Title: "Test"})

	// List response has meta
	req := httptest.NewRequest("GET", "/tasks/", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp Response
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Meta == nil {
		t.Error("expected meta in list response")
	}
	if resp.Error != nil {
		t.Errorf("unexpected error: %s", *resp.Error)
	}

	// Get response has no meta
	req = httptest.NewRequest("GET", "/tasks/1", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp2 Response
	json.NewDecoder(w.Body).Decode(&resp2)
	if resp2.Meta != nil {
		t.Error("expected no meta in get response")
	}
}

func TestTaskHandler_FailingStore(t *testing.T) {
	h := NewTaskHandler(store.FailingTaskStore{})
	r := chi.NewRouter()
	r.Mount("/tasks", h.Routes())

	tests := []struct {
		name       string
		method     string
		url        string
		body       string
		wantStatus int
	}{
		{"list fails", "GET", "/tasks/", "", http.StatusInternalServerError},
		{"get fails", "GET", "/tasks/1", "", http.StatusInternalServerError},
		{"create fails", "POST", "/tasks/", `{"title":"X"}`, http.StatusInternalServerError},
		{"update fails", "PUT", "/tasks/1", `{"title":"X"}`, http.StatusInternalServerError},
		{"delete fails", "DELETE", "/tasks/1", "", http.StatusInternalServerError},
		{"create event fails", "POST", "/tasks/1/events", `{"event_type":"test"}`, http.StatusInternalServerError},
		{"list events fails", "GET", "/tasks/1/events", "", http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req *http.Request
			if tt.body != "" {
				req = httptest.NewRequest(tt.method, tt.url, bytes.NewBufferString(tt.body))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest(tt.method, tt.url, nil)
			}
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func strPtr(s string) *string { return &s }
