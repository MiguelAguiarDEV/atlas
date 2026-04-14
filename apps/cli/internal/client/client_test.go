package client

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	clierr "github.com/MiguelAguiarDEV/atlas/apps/cli/internal/errors"
	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

func newServer(t *testing.T, handler http.HandlerFunc) *httptest.Server {
	t.Helper()
	return httptest.NewServer(handler)
}

func TestDoUnwrapsEnvelope(t *testing.T) {
	srv := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintln(w, `{"data":{"id":1,"title":"x"},"error":null}`)
	})
	defer srv.Close()

	c := New(Options{Base: srv.URL})
	raw, meta, err := c.Do(context.Background(), "GET", srv.URL+"/api/v1/tasks/1", nil)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	if meta != nil {
		t.Errorf("meta should be nil for single-resource response")
	}
	var task model.Task
	if err := Unmarshal(raw, &task); err != nil {
		t.Fatalf("Unmarshal: %v", err)
	}
	if task.Title != "x" {
		t.Errorf("title = %q, want x", task.Title)
	}
}

func TestDoSendsBearerHeader(t *testing.T) {
	var got string
	srv := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		got = r.Header.Get("Authorization")
		fmt.Fprintln(w, `{"data":null,"error":null}`)
	})
	defer srv.Close()

	c := New(Options{Base: srv.URL, Token: "secret"})
	_, _, err := c.Do(context.Background(), "GET", srv.URL+"/api/v1/status", nil)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	if got != "Bearer secret" {
		t.Errorf("Authorization = %q, want Bearer secret", got)
	}
}

func TestDoOmitsAuthHeaderWhenNoToken(t *testing.T) {
	var seen string
	srv := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		seen = r.Header.Get("Authorization")
		fmt.Fprintln(w, `{"data":null,"error":null}`)
	})
	defer srv.Close()
	c := New(Options{Base: srv.URL})
	_, _, _ = c.Do(context.Background(), "GET", srv.URL+"/api/v1/status", nil)
	if seen != "" {
		t.Errorf("Authorization sent unexpectedly: %q", seen)
	}
}

func TestDoMaps5xxToServerErr(t *testing.T) {
	srv := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintln(w, `{"data":null,"error":"boom"}`)
	})
	defer srv.Close()
	c := New(Options{Base: srv.URL})
	_, _, err := c.Do(context.Background(), "GET", srv.URL+"/api/v1/tasks", nil)
	var se *clierr.ServerErr
	if !errors.As(err, &se) {
		t.Fatalf("want ServerErr, got %T: %v", err, err)
	}
	if !strings.Contains(se.Msg, "boom") {
		t.Errorf("msg = %q", se.Msg)
	}
}

func TestDoMaps4xxToUserErr(t *testing.T) {
	srv := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintln(w, `{"data":null,"error":"bad input"}`)
	})
	defer srv.Close()
	c := New(Options{Base: srv.URL})
	_, _, err := c.Do(context.Background(), "POST", srv.URL+"/api/v1/tasks", map[string]string{"title": ""})
	var ue *clierr.UserErr
	if !errors.As(err, &ue) {
		t.Fatalf("want UserErr, got %T: %v", err, err)
	}
	if ue.Status != 400 || !strings.Contains(ue.Msg, "bad input") {
		t.Errorf("unexpected ue: %+v", ue)
	}
}

func TestDoNetworkErrorMapsToNetErr(t *testing.T) {
	// Point at a closed port. (Use a TCP socket we close immediately.)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	srv.Close() // immediately closed — connections will be refused.

	c := New(Options{Base: srv.URL, Timeout: 200 * time.Millisecond})
	_, _, err := c.Do(context.Background(), "GET", srv.URL+"/api/v1/status", nil)
	var ne *clierr.NetErr
	if !errors.As(err, &ne) {
		t.Fatalf("want NetErr, got %T: %v", err, err)
	}
}

func TestTaskFilterQueryEncoding(t *testing.T) {
	pid := int64(42)
	from := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	f := TaskFilter{Status: "open", Priority: "high", ProjectID: &pid, Search: "hi", DueFrom: &from, Limit: 10, Offset: 20}
	q := f.Query()
	if q.Get("status") != "open" || q.Get("priority") != "high" || q.Get("project_id") != "42" {
		t.Errorf("query missing fields: %v", q)
	}
	if q.Get("due_from") != "2026-01-01T00:00:00Z" {
		t.Errorf("due_from = %q", q.Get("due_from"))
	}
	if q.Get("limit") != "10" || q.Get("offset") != "20" {
		t.Errorf("limit/offset: %v", q)
	}
}

func TestVerboseLogsDoNotLeakToken(t *testing.T) {
	srv := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, `{"data":null,"error":null}`)
	})
	defer srv.Close()
	var buf strings.Builder
	c := New(Options{Base: srv.URL, Token: "supersecret", Verbose: true, Out: &buf})
	_, _, err := c.Do(context.Background(), "GET", srv.URL+"/api/v1/status", nil)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	if strings.Contains(buf.String(), "supersecret") {
		t.Errorf("verbose log leaked token: %q", buf.String())
	}
}

func TestListAllTasksPaginates(t *testing.T) {
	// Server returns 73 items in pages of 50.
	var calls int
	srv := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		calls++
		offsetStr := r.URL.Query().Get("offset")
		limitStr := r.URL.Query().Get("limit")
		_ = limitStr
		offset := 0
		fmt.Sscanf(offsetStr, "%d", &offset)
		items := []model.Task{}
		end := offset + 50
		if end > 73 {
			end = 73
		}
		for i := offset; i < end; i++ {
			items = append(items, model.Task{ID: int64(i + 1), Title: fmt.Sprintf("t%d", i+1)})
		}
		env := map[string]any{
			"data":  items,
			"error": nil,
			"meta":  map[string]int{"total": 73, "limit": 50, "offset": offset},
		}
		_ = json.NewEncoder(w).Encode(env)
	})
	defer srv.Close()
	c := New(Options{Base: srv.URL})
	all, err := c.ListAllTasks(context.Background(), TaskFilter{Limit: 50})
	if err != nil {
		t.Fatalf("ListAllTasks: %v", err)
	}
	if len(all) != 73 {
		t.Errorf("len = %d, want 73", len(all))
	}
	if calls != 2 {
		t.Errorf("calls = %d, want 2", calls)
	}
}

// ensure context deadline actually surfaces as NetErr (timeout).
func TestDoRespectsContextTimeout(t *testing.T) {
	srv := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		io.WriteString(w, `{"data":null,"error":null}`)
	})
	defer srv.Close()
	c := New(Options{Base: srv.URL, Timeout: 20 * time.Millisecond})
	_, _, err := c.Do(context.Background(), "GET", srv.URL+"/api/v1/status", nil)
	var ne *clierr.NetErr
	if !errors.As(err, &ne) {
		t.Fatalf("want NetErr, got %T: %v", err, err)
	}
}
