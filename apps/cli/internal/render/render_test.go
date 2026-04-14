package render

import (
	"bytes"
	"flag"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

var update = flag.Bool("update", false, "update golden files")

func goldenPath(name string) string { return filepath.Join("testdata", name+".golden") }

func checkGolden(t *testing.T, name string, got []byte) {
	t.Helper()
	path := goldenPath(name)
	if *update {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, got, 0o644); err != nil {
			t.Fatal(err)
		}
		return
	}
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read golden: %v (run tests with -update once)", err)
	}
	if !bytes.Equal(got, want) {
		t.Errorf("mismatch for %s:\n-- got --\n%s-- want --\n%s", name, string(got), string(want))
	}
}

func TestTasksGolden(t *testing.T) {
	t.Setenv("COLUMNS", "80")
	due := time.Date(2026, 4, 14, 9, 0, 0, 0, time.UTC)
	tasks := []model.Task{
		{ID: 1, Title: "Short", Status: "open", Priority: "high", DueAt: &due},
		{ID: 2, Title: "A very long title that should get truncated with ellipsis at the end",
			Status: "in_progress", Priority: "med", DueAt: nil},
	}
	var buf bytes.Buffer
	Tasks(&buf, tasks, "rfc3339")
	checkGolden(t, "tasks_basic", buf.Bytes())
}

func TestTasksEmpty(t *testing.T) {
	var buf bytes.Buffer
	Tasks(&buf, nil, "friendly")
	got := buf.String()
	if got != "No tasks.\n" {
		t.Errorf("got %q", got)
	}
}

func TestProjectsGolden(t *testing.T) {
	t.Setenv("COLUMNS", "80")
	projects := []model.Project{
		{ID: 1, Name: "Atlas", Area: "project", Status: "active"},
		{ID: 2, Name: "Sabbatical", Area: "area", Status: "archived"},
	}
	var buf bytes.Buffer
	Projects(&buf, projects)
	checkGolden(t, "projects_basic", buf.Bytes())
}

func TestParseDueShortcuts(t *testing.T) {
	// Force UTC so "today"/"tomorrow" shortcuts are deterministic regardless of host TZ.
	t.Setenv("TZ", "UTC")
	orig := time.Local
	time.Local = time.UTC
	t.Cleanup(func() { time.Local = orig })

	now := time.Date(2026, 4, 14, 10, 0, 0, 0, time.UTC)
	tests := []struct {
		in   string
		want string
	}{
		{"today", "2026-04-14T23:59:00Z"},
		{"tomorrow", "2026-04-15T09:00:00Z"},
		{"2026-05-01", "2026-05-01T00:00:00Z"},
	}
	for _, tt := range tests {
		t.Run(tt.in, func(t *testing.T) {
			got, err := ParseDue(tt.in, now)
			if err != nil {
				t.Fatalf("ParseDue(%q): %v", tt.in, err)
			}
			if got.UTC().Format(time.RFC3339) != tt.want {
				t.Errorf("got %s, want %s", got.UTC().Format(time.RFC3339), tt.want)
			}
		})
	}
}

func TestParseDueInvalid(t *testing.T) {
	_, err := ParseDue("notadate", time.Now())
	if err == nil {
		t.Fatal("want error, got nil")
	}
}

func TestFormatDateMode(t *testing.T) {
	ts := time.Date(2026, 1, 15, 9, 30, 0, 0, time.UTC)
	if got := FormatDate(&ts, "rfc3339"); got != "2026-01-15T09:30:00Z" {
		t.Errorf("rfc3339 got %q", got)
	}
	if got := FormatDate(nil, "friendly"); got != "-" {
		t.Errorf("nil got %q", got)
	}
}

func TestJSONEnvelopeStable(t *testing.T) {
	var buf bytes.Buffer
	if err := JSONEnvelope(&buf, Envelope{Data: []int{1, 2, 3}}); err != nil {
		t.Fatal(err)
	}
	got := buf.String()
	want := `{"data":[1,2,3],"error":null}` + "\n"
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}
