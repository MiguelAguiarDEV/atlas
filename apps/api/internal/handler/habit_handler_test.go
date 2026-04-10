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

func newHabitRouter() (chi.Router, *store.MockHabitStore) {
	ms := store.NewMockHabitStore()
	h := NewHabitHandler(ms)
	r := chi.NewRouter()
	r.Mount("/habits", h.Routes())
	return r, ms
}

func TestHabitHandler_Create(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "valid habit",
			body:       `{"name":"Exercise"}`,
			wantStatus: http.StatusCreated,
		},
		{
			name:       "with all fields",
			body:       `{"name":"Meditate","description":"10 min","frequency":"daily","target_count":2,"habit_group":"morning","sort_order":1}`,
			wantStatus: http.StatusCreated,
		},
		{
			name:       "empty name",
			body:       `{"name":""}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid json",
			body:       `{bad}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty body",
			body:       `{}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r, _ := newHabitRouter()
			req := httptest.NewRequest("POST", "/habits/", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestHabitHandler_GetByID(t *testing.T) {
	r, ms := newHabitRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateHabitInput{Name: "Test"})

	tests := []struct {
		name       string
		url        string
		wantStatus int
	}{
		{
			name:       "existing habit",
			url:        "/habits/1",
			wantStatus: http.StatusOK,
		},
		{
			name:       "non-existent habit",
			url:        "/habits/999",
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			url:        "/habits/abc",
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

func TestHabitHandler_List(t *testing.T) {
	r, ms := newHabitRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateHabitInput{Name: "H1"})
	ms.Create(ctx, model.CreateHabitInput{Name: "H2"})

	tests := []struct {
		name       string
		url        string
		wantStatus int
	}{
		{
			name:       "list all",
			url:        "/habits/",
			wantStatus: http.StatusOK,
		},
		{
			name:       "with limit",
			url:        "/habits/?limit=1",
			wantStatus: http.StatusOK,
		},
		{
			name:       "with offset",
			url:        "/habits/?offset=1",
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid limit",
			url:        "/habits/?limit=abc",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid offset",
			url:        "/habits/?offset=-1",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "negative limit",
			url:        "/habits/?limit=-1",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "zero limit",
			url:        "/habits/?limit=0",
			wantStatus: http.StatusBadRequest,
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

func TestHabitHandler_ListResponseMeta(t *testing.T) {
	r, ms := newHabitRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateHabitInput{Name: "H1"})

	req := httptest.NewRequest("GET", "/habits/", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp Response
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Meta == nil {
		t.Error("expected meta in list response")
	}
}

func TestHabitHandler_Update(t *testing.T) {
	r, ms := newHabitRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateHabitInput{Name: "Original"})

	tests := []struct {
		name       string
		url        string
		body       string
		wantStatus int
	}{
		{
			name:       "update name",
			url:        "/habits/1",
			body:       `{"name":"Updated"}`,
			wantStatus: http.StatusOK,
		},
		{
			name:       "non-existent habit",
			url:        "/habits/999",
			body:       `{"name":"X"}`,
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			url:        "/habits/abc",
			body:       `{"name":"X"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid json",
			url:        "/habits/1",
			body:       `{bad}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty name rejected",
			url:        "/habits/1",
			body:       `{"name":""}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "deactivate",
			url:        "/habits/1",
			body:       `{"active":false}`,
			wantStatus: http.StatusOK,
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

func TestHabitHandler_Delete(t *testing.T) {
	r, ms := newHabitRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateHabitInput{Name: "To Delete"})

	tests := []struct {
		name       string
		url        string
		wantStatus int
	}{
		{
			name:       "delete existing",
			url:        "/habits/1",
			wantStatus: http.StatusOK,
		},
		{
			name:       "delete non-existent",
			url:        "/habits/999",
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			url:        "/habits/abc",
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

func TestHabitHandler_Complete(t *testing.T) {
	r, ms := newHabitRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateHabitInput{Name: "Completable"})

	tests := []struct {
		name       string
		url        string
		body       string
		wantStatus int
	}{
		{
			name:       "default completion",
			url:        "/habits/1/complete",
			body:       `{}`,
			wantStatus: http.StatusCreated,
		},
		{
			name:       "with value and notes",
			url:        "/habits/1/complete",
			body:       `{"value":3,"notes":"Extra"}`,
			wantStatus: http.StatusCreated,
		},
		{
			name:       "empty body OK",
			url:        "/habits/1/complete",
			body:       ``,
			wantStatus: http.StatusCreated,
		},
		{
			name:       "non-existent habit",
			url:        "/habits/999/complete",
			body:       `{}`,
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			url:        "/habits/abc/complete",
			body:       `{}`,
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

func TestHabitHandler_ListCompletions(t *testing.T) {
	r, ms := newHabitRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateHabitInput{Name: "Test"})

	tests := []struct {
		name       string
		url        string
		wantStatus int
	}{
		{
			name:       "list completions",
			url:        "/habits/1/completions",
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid id",
			url:        "/habits/abc/completions",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid limit",
			url:        "/habits/1/completions?limit=abc",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid offset",
			url:        "/habits/1/completions?offset=-1",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "negative limit",
			url:        "/habits/1/completions?limit=-1",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "zero limit",
			url:        "/habits/1/completions?limit=0",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "valid limit and offset",
			url:        "/habits/1/completions?limit=10&offset=5",
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

func TestHabitHandler_FailingStore(t *testing.T) {
	h := NewHabitHandler(store.FailingHabitStore{})
	r := chi.NewRouter()
	r.Mount("/habits", h.Routes())

	tests := []struct {
		name       string
		method     string
		url        string
		body       string
		wantStatus int
	}{
		{"list fails", "GET", "/habits/", "", http.StatusInternalServerError},
		{"get fails", "GET", "/habits/1", "", http.StatusInternalServerError},
		{"create fails", "POST", "/habits/", `{"name":"X"}`, http.StatusInternalServerError},
		{"update fails", "PUT", "/habits/1", `{"name":"X"}`, http.StatusInternalServerError},
		{"delete fails", "DELETE", "/habits/1", "", http.StatusInternalServerError},
		{"complete fails", "POST", "/habits/1/complete", `{}`, http.StatusInternalServerError},
		{"list completions fails", "GET", "/habits/1/completions", "", http.StatusInternalServerError},
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
