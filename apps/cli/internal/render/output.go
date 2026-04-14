package render

import (
	"encoding/json"
	"fmt"
	"io"
)

// Mode is the top-level output mode.
type Mode int

const (
	// ModeTable renders a human-readable fixed-column table.
	ModeTable Mode = iota
	// ModeJSON emits the raw API envelope (one JSON value per command).
	ModeJSON
)

// FromFlag returns ModeJSON when jsonFlag is true, else ModeTable.
func FromFlag(jsonFlag bool) Mode {
	if jsonFlag {
		return ModeJSON
	}
	return ModeTable
}

// JSONEnvelope writes the pre-built envelope (or any JSON-serializable value) as a single JSON line.
func JSONEnvelope(w io.Writer, v any) error {
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	return enc.Encode(v)
}

// Envelope wraps a data payload and optional meta into the API-style envelope.
// Used for --json output so it matches the server's shape.
type Envelope struct {
	Data  any   `json:"data"`
	Error *any  `json:"error"`
	Meta  *Meta `json:"meta,omitempty"`
}

// Meta mirrors the client Meta shape for JSON encoding.
type Meta struct {
	Total  int `json:"total"`
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

// PrintError writes an error message to stderr in a human-readable form.
// When mode is ModeJSON, errors are emitted as an envelope with the `error`
// field set (to keep --json output parseable).
func PrintError(stderr io.Writer, mode Mode, msg string) {
	if mode == ModeJSON {
		_ = JSONEnvelope(stderr, Envelope{Data: nil, Error: ptr(any(msg))})
		return
	}
	fmt.Fprintln(stderr, "error:", msg)
}

func ptr[T any](v T) *T { return &v }
