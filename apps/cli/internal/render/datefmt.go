// Package render contains output formatters: tables, JSON, dates.
package render

import (
	"fmt"
	"os"
	"time"

	"github.com/araddon/dateparse"
)

// ParseDue parses a user-supplied date/time string into RFC3339 UTC.
// It accepts RFC3339, common natural formats via dateparse, plus the
// shortcuts "today" and "tomorrow".
// Returns the parsed time in the local timezone; callers SHOULD convert to
// UTC via .UTC() when serializing to the API.
func ParseDue(input string, now time.Time) (time.Time, error) {
	if input == "" {
		return time.Time{}, fmt.Errorf("empty date")
	}
	switch input {
	case "today":
		y, m, d := now.Date()
		return time.Date(y, m, d, 23, 59, 0, 0, now.Location()), nil
	case "tomorrow":
		y, m, d := now.Add(24 * time.Hour).Date()
		return time.Date(y, m, d, 9, 0, 0, 0, now.Location()), nil
	}

	t, err := dateparse.ParseLocal(input)
	if err != nil {
		return time.Time{}, fmt.Errorf("cannot parse date %q: %w", input, err)
	}
	return t, nil
}

// RFC3339UTC is a convenience wrapper returning t.UTC().Format(time.RFC3339).
func RFC3339UTC(t time.Time) string {
	return t.UTC().Format(time.RFC3339)
}

// FormatFriendly renders a timestamp as a short human-readable string in the
// local timezone: "15 Jan 09:30". Zero times render as "-".
func FormatFriendly(t *time.Time) string {
	if t == nil || t.IsZero() {
		return "-"
	}
	return t.Local().Format("02 Jan 15:04")
}

// FormatRFC3339 renders a timestamp as RFC3339. Zero times render as "-".
func FormatRFC3339(t *time.Time) string {
	if t == nil || t.IsZero() {
		return "-"
	}
	return t.UTC().Format(time.RFC3339)
}

// FormatDate chooses FormatFriendly or FormatRFC3339 based on env/config.
// Callers pass the configured date_format ("friendly" | "rfc3339").
func FormatDate(t *time.Time, mode string) string {
	if mode == "rfc3339" {
		return FormatRFC3339(t)
	}
	return FormatFriendly(t)
}

// LocalMidnight returns today's 00:00 in the local timezone.
func LocalMidnight(now time.Time) time.Time {
	y, m, d := now.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, now.Location())
}

// NoColor reports whether ANSI output should be suppressed.
// Honors --no-color flag (caller sets env) and the NO_COLOR convention.
func NoColor() bool {
	return os.Getenv("NO_COLOR") != ""
}
