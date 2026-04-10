package model

import "time"

// Project represents a project or area in the PARA framework.
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

// CreateProjectInput is the input for creating a project.
type CreateProjectInput struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Color       *string `json:"color"`
	Icon        *string `json:"icon"`
	Area        *string `json:"area"`
	Status      *string `json:"status"`
	SortOrder   *int    `json:"sort_order"`
}

// UpdateProjectInput is the input for updating a project.
type UpdateProjectInput struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Color       *string `json:"color"`
	Icon        *string `json:"icon"`
	Area        *string `json:"area"`
	Status      *string `json:"status"`
	SortOrder   *int    `json:"sort_order"`
}
