package render

import (
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

// columns reports the terminal width from $COLUMNS, falling back to 100.
func columns() int {
	if v := os.Getenv("COLUMNS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return 100
}

// truncate shortens s to at most n runes, appending an ellipsis when trimmed.
func truncate(s string, n int) string {
	if n <= 0 {
		return ""
	}
	if len(s) <= n {
		return s
	}
	if n <= 3 {
		return s[:n]
	}
	return s[:n-1] + "\u2026"
}

// Tasks renders a slice of tasks as a fixed-column table on w.
// The columns are: id, status, pri, due, title (title absorbs slack).
func Tasks(w io.Writer, tasks []model.Task, dateMode string) {
	if len(tasks) == 0 {
		fmt.Fprintln(w, "No tasks.")
		return
	}
	// Fixed widths: id (4), status (11), pri (6), due (12). Title = rest - 4*sep (" | ").
	total := columns()
	fixed := 4 + 11 + 6 + 12 + 4*3
	titleW := total - fixed
	if titleW < 10 {
		titleW = 10
	}

	writeRow := func(id, status, pri, due, title string) {
		fmt.Fprintf(w, "%-4s | %-11s | %-6s | %-12s | %s\n",
			truncate(id, 4), truncate(status, 11), truncate(pri, 6),
			truncate(due, 12), truncate(title, titleW))
	}

	writeRow("id", "status", "pri", "due", "title")
	fmt.Fprintln(w, strings.Repeat("-", total))
	for _, t := range tasks {
		writeRow(strconv.FormatInt(t.ID, 10), t.Status, t.Priority, FormatDate(t.DueAt, dateMode), t.Title)
	}
}

// Projects renders projects as a table.
func Projects(w io.Writer, projects []model.Project) {
	if len(projects) == 0 {
		fmt.Fprintln(w, "No projects.")
		return
	}
	total := columns()
	nameW := total - (4 + 10 + 10 + 3*3)
	if nameW < 10 {
		nameW = 10
	}
	fmt.Fprintf(w, "%-4s | %-10s | %-10s | %s\n", "id", "area", "status", "name")
	fmt.Fprintln(w, strings.Repeat("-", total))
	for _, p := range projects {
		fmt.Fprintf(w, "%-4d | %-10s | %-10s | %s\n",
			p.ID, truncate(p.Area, 10), truncate(p.Status, 10), truncate(p.Name, nameW))
	}
}

// TimeEntries renders time entries as a table.
func TimeEntries(w io.Writer, entries []model.TimeEntry, dateMode string) {
	if len(entries) == 0 {
		fmt.Fprintln(w, "No time entries.")
		return
	}
	fmt.Fprintf(w, "%-5s | %-8s | %-12s | %-12s | %-8s | %s\n",
		"id", "task", "start", "end", "dur", "notes")
	fmt.Fprintln(w, strings.Repeat("-", columns()))
	for _, e := range entries {
		task := "-"
		if e.TaskID != nil {
			task = strconv.FormatInt(*e.TaskID, 10)
		}
		dur := "-"
		if e.DurationSecs != nil {
			dur = fmt.Sprintf("%dm", *e.DurationSecs/60)
		}
		notes := ""
		if e.Notes != nil {
			notes = *e.Notes
		}
		fmt.Fprintf(w, "%-5d | %-8s | %-12s | %-12s | %-8s | %s\n",
			e.ID, truncate(task, 8),
			FormatDate(&e.StartedAt, dateMode), FormatDate(e.EndedAt, dateMode),
			dur, truncate(notes, 30))
	}
}

// Habits renders habits as a table.
func Habits(w io.Writer, habits []model.Habit) {
	if len(habits) == 0 {
		fmt.Fprintln(w, "No habits.")
		return
	}
	fmt.Fprintf(w, "%-4s | %-10s | %-7s | %-6s | %s\n",
		"id", "frequency", "target", "active", "name")
	fmt.Fprintln(w, strings.Repeat("-", columns()))
	for _, h := range habits {
		active := "no"
		if h.Active {
			active = "yes"
		}
		fmt.Fprintf(w, "%-4d | %-10s | %-7d | %-6s | %s\n",
			h.ID, truncate(h.Frequency, 10), h.TargetCount, active, truncate(h.Name, 40))
	}
}
