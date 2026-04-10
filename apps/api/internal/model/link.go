package model

import "time"

// Link represents a cross-entity reference.
type Link struct {
	ID         int64     `json:"id"`
	SourceType string    `json:"source_type"`
	SourceID   int64     `json:"source_id"`
	TargetType string    `json:"target_type"`
	TargetID   string    `json:"target_id"`
	LinkType   string    `json:"link_type"`
	CreatedAt  time.Time `json:"created_at"`
}
