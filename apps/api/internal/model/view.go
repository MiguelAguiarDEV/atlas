package model

import (
	"encoding/json"
	"time"
)

// SavedView represents a saved view configuration.
type SavedView struct {
	ID        int64            `json:"id"`
	Name      string           `json:"name"`
	ViewType  string           `json:"view_type"`
	Filters   json.RawMessage  `json:"filters"`
	Grouping  *json.RawMessage `json:"grouping"`
	Sorting   *json.RawMessage `json:"sorting"`
	IsDefault bool             `json:"is_default"`
	SortOrder int              `json:"sort_order"`
	CreatedAt time.Time        `json:"created_at"`
}
