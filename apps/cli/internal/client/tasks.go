package client

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
	"time"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

// TaskFilter holds the query params accepted by GET /tasks.
type TaskFilter struct {
	Status    string
	Priority  string
	ProjectID *int64
	Search    string
	DueFrom   *time.Time // RFC3339 UTC
	DueTo     *time.Time
	Limit     int // 0 means server default
	Offset    int
}

// Query returns the URL query for the filter.
func (f TaskFilter) Query() url.Values {
	q := url.Values{}
	if f.Status != "" {
		q.Set("status", f.Status)
	}
	if f.Priority != "" {
		q.Set("priority", f.Priority)
	}
	if f.ProjectID != nil {
		q.Set("project_id", strconv.FormatInt(*f.ProjectID, 10))
	}
	if f.Search != "" {
		q.Set("search", f.Search)
	}
	if f.DueFrom != nil {
		q.Set("due_from", f.DueFrom.UTC().Format(time.RFC3339))
	}
	if f.DueTo != nil {
		q.Set("due_to", f.DueTo.UTC().Format(time.RFC3339))
	}
	if f.Limit > 0 {
		q.Set("limit", strconv.Itoa(f.Limit))
	}
	if f.Offset > 0 {
		q.Set("offset", strconv.Itoa(f.Offset))
	}
	return q
}

// ListTasks issues GET /tasks with the filter.
func (c *Client) ListTasks(ctx context.Context, f TaskFilter) ([]model.Task, *Meta, error) {
	raw, meta, err := c.Do(ctx, "GET", c.BuildURL("/tasks", f.Query()), nil)
	if err != nil {
		return nil, meta, err
	}
	var out []model.Task
	if err := Unmarshal(raw, &out); err != nil {
		return nil, meta, err
	}
	return out, meta, nil
}

// ListAllTasks auto-paginates until every task is fetched.
func (c *Client) ListAllTasks(ctx context.Context, f TaskFilter) ([]model.Task, error) {
	if f.Limit <= 0 {
		f.Limit = 50
	}
	var all []model.Task
	for {
		page, meta, err := c.ListTasks(ctx, f)
		if err != nil {
			return all, err
		}
		all = append(all, page...)
		if meta == nil || len(all) >= meta.Total || len(page) == 0 {
			return all, nil
		}
		f.Offset += len(page)
	}
}

// GetTask issues GET /tasks/{id}.
func (c *Client) GetTask(ctx context.Context, id int64) (*model.Task, error) {
	raw, _, err := c.Do(ctx, "GET", c.BuildURL(fmt.Sprintf("/tasks/%d", id), nil), nil)
	if err != nil {
		return nil, err
	}
	var out model.Task
	if err := Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// CreateTask issues POST /tasks.
func (c *Client) CreateTask(ctx context.Context, input model.CreateTaskInput) (*model.Task, error) {
	raw, _, err := c.Do(ctx, "POST", c.BuildURL("/tasks", nil), input)
	if err != nil {
		return nil, err
	}
	var out model.Task
	if err := Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// UpdateTask issues PUT /tasks/{id}.
func (c *Client) UpdateTask(ctx context.Context, id int64, input model.UpdateTaskInput) (*model.Task, error) {
	raw, _, err := c.Do(ctx, "PUT", c.BuildURL(fmt.Sprintf("/tasks/%d", id), nil), input)
	if err != nil {
		return nil, err
	}
	var out model.Task
	if err := Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// DeleteTask issues DELETE /tasks/{id}.
func (c *Client) DeleteTask(ctx context.Context, id int64) error {
	_, _, err := c.Do(ctx, "DELETE", c.BuildURL(fmt.Sprintf("/tasks/%d", id), nil), nil)
	return err
}

// ListTaskEvents issues GET /tasks/{id}/events.
func (c *Client) ListTaskEvents(ctx context.Context, id int64) ([]model.TaskEvent, error) {
	raw, _, err := c.Do(ctx, "GET", c.BuildURL(fmt.Sprintf("/tasks/%d/events", id), nil), nil)
	if err != nil {
		return nil, err
	}
	var out []model.TaskEvent
	if err := Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out, nil
}

// StartTimer issues POST /tasks/{id}/timer/start.
func (c *Client) StartTimer(ctx context.Context, id int64) (*model.TimeEntry, error) {
	raw, _, err := c.Do(ctx, "POST", c.BuildURL(fmt.Sprintf("/tasks/%d/timer/start", id), nil), nil)
	if err != nil {
		return nil, err
	}
	var out model.TimeEntry
	if err := Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// StopTimer issues POST /tasks/{id}/timer/stop.
func (c *Client) StopTimer(ctx context.Context, id int64) (*model.TimeEntry, error) {
	raw, _, err := c.Do(ctx, "POST", c.BuildURL(fmt.Sprintf("/tasks/%d/timer/stop", id), nil), nil)
	if err != nil {
		return nil, err
	}
	var out model.TimeEntry
	if err := Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
