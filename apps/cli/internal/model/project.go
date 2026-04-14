package model

import "time"

// Project mirrors apps/api/internal/model.Project.
type Project struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	Color       string    `json:"color"`
	Icon        *string   `json:"icon"`
	Area        string    `json:"area"`
	Status      string    `json:"status"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreateProjectInput is the body for POST /projects.
type CreateProjectInput struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	Color       *string `json:"color,omitempty"`
	Icon        *string `json:"icon,omitempty"`
	Area        *string `json:"area,omitempty"`
	Status      *string `json:"status,omitempty"`
	SortOrder   *int    `json:"sort_order,omitempty"`
}

// UpdateProjectInput is the body for PUT /projects/{id}.
type UpdateProjectInput struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Color       *string `json:"color,omitempty"`
	Icon        *string `json:"icon,omitempty"`
	Area        *string `json:"area,omitempty"`
	Status      *string `json:"status,omitempty"`
	SortOrder   *int    `json:"sort_order,omitempty"`
}
