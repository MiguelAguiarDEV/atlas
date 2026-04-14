package client

import (
	"context"
	"fmt"
	"net/url"
	"strconv"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

// ProjectFilter holds the query params accepted by GET /projects.
type ProjectFilter struct {
	Status string
	Area   string
	Limit  int
	Offset int
}

// Query returns the URL query.
func (f ProjectFilter) Query() url.Values {
	q := url.Values{}
	if f.Status != "" {
		q.Set("status", f.Status)
	}
	if f.Area != "" {
		q.Set("area", f.Area)
	}
	if f.Limit > 0 {
		q.Set("limit", strconv.Itoa(f.Limit))
	}
	if f.Offset > 0 {
		q.Set("offset", strconv.Itoa(f.Offset))
	}
	return q
}

// ListProjects issues GET /projects.
func (c *Client) ListProjects(ctx context.Context, f ProjectFilter) ([]model.Project, *Meta, error) {
	raw, meta, err := c.Do(ctx, "GET", c.BuildURL("/projects", f.Query()), nil)
	if err != nil {
		return nil, meta, err
	}
	var out []model.Project
	if err := Unmarshal(raw, &out); err != nil {
		return nil, meta, err
	}
	return out, meta, nil
}

// GetProject issues GET /projects/{id}.
func (c *Client) GetProject(ctx context.Context, id int64) (*model.Project, error) {
	raw, _, err := c.Do(ctx, "GET", c.BuildURL(fmt.Sprintf("/projects/%d", id), nil), nil)
	if err != nil {
		return nil, err
	}
	var out model.Project
	if err := Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// CreateProject issues POST /projects.
func (c *Client) CreateProject(ctx context.Context, input model.CreateProjectInput) (*model.Project, error) {
	raw, _, err := c.Do(ctx, "POST", c.BuildURL("/projects", nil), input)
	if err != nil {
		return nil, err
	}
	var out model.Project
	if err := Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// UpdateProject issues PUT /projects/{id}.
func (c *Client) UpdateProject(ctx context.Context, id int64, input model.UpdateProjectInput) (*model.Project, error) {
	raw, _, err := c.Do(ctx, "PUT", c.BuildURL(fmt.Sprintf("/projects/%d", id), nil), input)
	if err != nil {
		return nil, err
	}
	var out model.Project
	if err := Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// DeleteProject issues DELETE /projects/{id}.
func (c *Client) DeleteProject(ctx context.Context, id int64) error {
	_, _, err := c.Do(ctx, "DELETE", c.BuildURL(fmt.Sprintf("/projects/%d", id), nil), nil)
	return err
}
