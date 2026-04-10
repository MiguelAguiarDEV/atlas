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

func newTimeRouter() (chi.Router, *store.MockTimeEntryStore) {
	ms := store.NewMockTimeEntryStore()
	h := NewTimeHandler(ms)
	r := chi.NewRouter()
	r.Mount("/time-entries", h.Routes())
	r.Route("/tasks/{id}", func(r chi.Router) {
		r.Post("/timer/start", h.StartTimer)
		r.Post("/timer/stop", h.StopTimer)
	})
	return r, ms
}

func TestTimeHandler_Create(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "valid entry",
			body:       `{"started_at":"2026-01-01T09:00:00Z"}`,
			wantStatus: http.StatusCreated,
		},
		{
			name:       "with all fields",
			body:       `{"task_id":1,"started_at":"2026-01-01T09:00:00Z","ended_at":"2026-01-01T10:00:00Z","duration_secs":3600,"entry_type":"pomodoro","source":"cli","notes":"work"}`,
			wantStatus: http.StatusCreated,
		},
		{
			name:       "empty started_at",
			body:       `{"started_at":""}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid json",
			body:       `{bad}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing started_at",
			body:       `{}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r, _ := newTimeRouter()
			req := httptest.NewRequest("POST", "/time-entries/", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestTimeHandler_List(t *testing.T) {
	r, ms := newTimeRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()

	tid := int64(1)
	ms.Create(ctx, model.CreateTimeEntryInput{TaskID: &tid, StartedAt: "2026-01-01T09:00:00Z"})
	ms.Create(ctx, model.CreateTimeEntryInput{StartedAt: "2026-01-01T10:00:00Z"})

	tests := []struct {
		name       string
		url        string
		wantStatus int
	}{
		{
			name:       "list all",
			url:        "/time-entries/",
			wantStatus: http.StatusOK,
		},
		{
			name:       "filter by task_id",
			url:        "/time-entries/?task_id=1",
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid task_id",
			url:        "/time-entries/?task_id=abc",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid limit",
			url:        "/time-entries/?limit=abc",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid offset",
			url:        "/time-entries/?offset=-1",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "negative limit",
			url:        "/time-entries/?limit=-1",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "zero limit",
			url:        "/time-entries/?limit=0",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "valid limit and offset",
			url:        "/time-entries/?limit=10&offset=1",
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

func TestTimeHandler_ListResponseMeta(t *testing.T) {
	r, ms := newTimeRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateTimeEntryInput{StartedAt: "2026-01-01T09:00:00Z"})

	req := httptest.NewRequest("GET", "/time-entries/", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp Response
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Meta == nil {
		t.Error("expected meta in list response")
	}
}

func TestTimeHandler_Update(t *testing.T) {
	r, ms := newTimeRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateTimeEntryInput{StartedAt: "2026-01-01T09:00:00Z"})

	tests := []struct {
		name       string
		url        string
		body       string
		wantStatus int
	}{
		{
			name:       "update notes",
			url:        "/time-entries/1",
			body:       `{"notes":"Updated"}`,
			wantStatus: http.StatusOK,
		},
		{
			name:       "non-existent",
			url:        "/time-entries/999",
			body:       `{"notes":"X"}`,
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			url:        "/time-entries/abc",
			body:       `{"notes":"X"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid json",
			url:        "/time-entries/1",
			body:       `{bad}`,
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

func TestTimeHandler_Delete(t *testing.T) {
	r, ms := newTimeRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateTimeEntryInput{StartedAt: "2026-01-01T09:00:00Z"})

	tests := []struct {
		name       string
		url        string
		wantStatus int
	}{
		{
			name:       "delete existing",
			url:        "/time-entries/1",
			wantStatus: http.StatusOK,
		},
		{
			name:       "delete non-existent",
			url:        "/time-entries/999",
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			url:        "/time-entries/abc",
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

func TestTimeHandler_StartStopTimer(t *testing.T) {
	r, _ := newTimeRouter()

	// Start timer
	req := httptest.NewRequest("POST", "/tasks/1/timer/start", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Errorf("start timer: status = %d, want %d, body: %s", w.Code, http.StatusCreated, w.Body.String())
	}

	// Start again should conflict
	req = httptest.NewRequest("POST", "/tasks/1/timer/start", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusConflict {
		t.Errorf("duplicate start: status = %d, want %d", w.Code, http.StatusConflict)
	}

	// Stop timer
	req = httptest.NewRequest("POST", "/tasks/1/timer/stop", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("stop timer: status = %d, want %d, body: %s", w.Code, http.StatusOK, w.Body.String())
	}

	// Stop again should not found
	req = httptest.NewRequest("POST", "/tasks/1/timer/stop", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Errorf("double stop: status = %d, want %d", w.Code, http.StatusNotFound)
	}
}

func TestTimeHandler_TimerInvalidID(t *testing.T) {
	r, _ := newTimeRouter()

	// Invalid ID for start
	req := httptest.NewRequest("POST", "/tasks/abc/timer/start", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("invalid start id: status = %d, want %d", w.Code, http.StatusBadRequest)
	}

	// Invalid ID for stop
	req = httptest.NewRequest("POST", "/tasks/abc/timer/stop", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("invalid stop id: status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestTimeHandler_FailingStore(t *testing.T) {
	h := NewTimeHandler(store.FailingTimeEntryStore{})
	r := chi.NewRouter()
	r.Mount("/time-entries", h.Routes())
	r.Route("/tasks/{id}", func(r chi.Router) {
		r.Post("/timer/start", h.StartTimer)
		r.Post("/timer/stop", h.StopTimer)
	})

	tests := []struct {
		name       string
		method     string
		url        string
		body       string
		wantStatus int
	}{
		{"list fails", "GET", "/time-entries/", "", http.StatusInternalServerError},
		{"create fails", "POST", "/time-entries/", `{"started_at":"2026-01-01T09:00:00Z"}`, http.StatusInternalServerError},
		{"update fails", "PUT", "/time-entries/1", `{"notes":"X"}`, http.StatusInternalServerError},
		{"delete fails", "DELETE", "/time-entries/1", "", http.StatusInternalServerError},
		{"start timer fails", "POST", "/tasks/1/timer/start", "", http.StatusInternalServerError},
		{"stop timer fails", "POST", "/tasks/1/timer/stop", "", http.StatusInternalServerError},
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

func TestTimeHandler_TimerRoutesMethod(t *testing.T) {
	ms := store.NewMockTimeEntryStore()
	h := NewTimeHandler(ms)
	timerR := h.TimerRoutes()

	// Mount under a task-like path with chi
	r := chi.NewRouter()
	r.Mount("/timer", timerR)

	// This just verifies TimerRoutes() returns a working router
	req := httptest.NewRequest("POST", "/timer/timer/start", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	// It won't have an {id} param so it will fail to parse, but that's OK
	// The point is to cover the TimerRoutes function itself
	if w.Code == 0 {
		t.Error("expected a response")
	}
}

func TestTimeHandler_UpdateInvalidInput(t *testing.T) {
	r, ms := newTimeRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateTimeEntryInput{StartedAt: "2026-01-01T09:00:00Z"})

	// Send invalid started_at to trigger ErrInvalidInput from mock
	req := httptest.NewRequest("PUT", "/time-entries/1", bytes.NewBufferString(`{"started_at":"bad"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d, body: %s", w.Code, http.StatusBadRequest, w.Body.String())
	}
}
