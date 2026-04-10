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

func newProjectRouter() (chi.Router, *store.MockProjectStore) {
	ms := store.NewMockProjectStore()
	h := NewProjectHandler(ms)
	r := chi.NewRouter()
	r.Mount("/projects", h.Routes())
	return r, ms
}

func TestProjectHandler_Create(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "valid project",
			body:       `{"name":"My Project"}`,
			wantStatus: http.StatusCreated,
		},
		{
			name:       "with all fields",
			body:       `{"name":"Full","description":"desc","color":"#ff0000","icon":"star","area":"areas","status":"paused","sort_order":3}`,
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
			r, _ := newProjectRouter()
			req := httptest.NewRequest("POST", "/projects/", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestProjectHandler_GetByID(t *testing.T) {
	r, ms := newProjectRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateProjectInput{Name: "Test"})

	tests := []struct {
		name       string
		url        string
		wantStatus int
	}{
		{
			name:       "existing project",
			url:        "/projects/1",
			wantStatus: http.StatusOK,
		},
		{
			name:       "non-existent project",
			url:        "/projects/999",
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			url:        "/projects/abc",
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

func TestProjectHandler_List(t *testing.T) {
	r, ms := newProjectRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateProjectInput{Name: "P1"})
	ms.Create(ctx, model.CreateProjectInput{Name: "P2"})

	tests := []struct {
		name       string
		url        string
		wantStatus int
	}{
		{
			name:       "list all",
			url:        "/projects/",
			wantStatus: http.StatusOK,
		},
		{
			name:       "with limit",
			url:        "/projects/?limit=1",
			wantStatus: http.StatusOK,
		},
		{
			name:       "with offset",
			url:        "/projects/?offset=1",
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid limit",
			url:        "/projects/?limit=abc",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid offset",
			url:        "/projects/?offset=-1",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "negative limit",
			url:        "/projects/?limit=-1",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "zero limit",
			url:        "/projects/?limit=0",
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

func TestProjectHandler_ListResponseMeta(t *testing.T) {
	r, ms := newProjectRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateProjectInput{Name: "P1"})

	req := httptest.NewRequest("GET", "/projects/", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp Response
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Meta == nil {
		t.Error("expected meta in list response")
	}
	if resp.Meta.Total != 1 {
		t.Errorf("meta.total = %d, want 1", resp.Meta.Total)
	}
}

func TestProjectHandler_Update(t *testing.T) {
	r, ms := newProjectRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateProjectInput{Name: "Original"})

	tests := []struct {
		name       string
		url        string
		body       string
		wantStatus int
	}{
		{
			name:       "update name",
			url:        "/projects/1",
			body:       `{"name":"Updated"}`,
			wantStatus: http.StatusOK,
		},
		{
			name:       "non-existent project",
			url:        "/projects/999",
			body:       `{"name":"X"}`,
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			url:        "/projects/abc",
			body:       `{"name":"X"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid json",
			url:        "/projects/1",
			body:       `{bad}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty name rejected",
			url:        "/projects/1",
			body:       `{"name":""}`,
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

func TestProjectHandler_Delete(t *testing.T) {
	r, ms := newProjectRouter()
	ctx := httptest.NewRequest("GET", "/", nil).Context()
	ms.Create(ctx, model.CreateProjectInput{Name: "To Delete"})

	tests := []struct {
		name       string
		url        string
		wantStatus int
	}{
		{
			name:       "delete existing",
			url:        "/projects/1",
			wantStatus: http.StatusOK,
		},
		{
			name:       "delete non-existent",
			url:        "/projects/999",
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			url:        "/projects/abc",
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

func TestProjectHandler_FailingStore(t *testing.T) {
	h := NewProjectHandler(store.FailingProjectStore{})
	r := chi.NewRouter()
	r.Mount("/projects", h.Routes())

	tests := []struct {
		name       string
		method     string
		url        string
		body       string
		wantStatus int
	}{
		{"list fails", "GET", "/projects/", "", http.StatusInternalServerError},
		{"get fails", "GET", "/projects/1", "", http.StatusInternalServerError},
		{"create fails", "POST", "/projects/", `{"name":"X"}`, http.StatusInternalServerError},
		{"update fails", "PUT", "/projects/1", `{"name":"X"}`, http.StatusInternalServerError},
		{"delete fails", "DELETE", "/projects/1", "", http.StatusInternalServerError},
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
