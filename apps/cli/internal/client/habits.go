package client

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
	"time"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

// HabitFilter holds query params accepted by GET /habits.
type HabitFilter struct {
	Active *bool
	Limit  int
	Offset int
}

// Query returns the URL query.
func (f HabitFilter) Query() url.Values {
	q := url.Values{}
	if f.Active != nil {
		q.Set("active", strconv.FormatBool(*f.Active))
	}
	if f.Limit > 0 {
		q.Set("limit", strconv.Itoa(f.Limit))
	}
	if f.Offset > 0 {
		q.Set("offset", strconv.Itoa(f.Offset))
	}
	return q
}

// ListHabits issues GET /habits.
func (c *Client) ListHabits(ctx context.Context, f HabitFilter) ([]model.Habit, *Meta, error) {
	raw, meta, err := c.Do(ctx, "GET", c.BuildURL("/habits", f.Query()), nil)
	if err != nil {
		return nil, meta, err
	}
	var out []model.Habit
	if err := Unmarshal(raw, &out); err != nil {
		return nil, meta, err
	}
	return out, meta, nil
}

// GetHabit issues GET /habits/{id}.
func (c *Client) GetHabit(ctx context.Context, id int64) (*model.Habit, error) {
	raw, _, err := c.Do(ctx, "GET", c.BuildURL(fmt.Sprintf("/habits/%d", id), nil), nil)
	if err != nil {
		return nil, err
	}
	var out model.Habit
	if err := Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// CreateHabit issues POST /habits.
func (c *Client) CreateHabit(ctx context.Context, input model.CreateHabitInput) (*model.Habit, error) {
	raw, _, err := c.Do(ctx, "POST", c.BuildURL("/habits", nil), input)
	if err != nil {
		return nil, err
	}
	var out model.Habit
	if err := Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// DeleteHabit issues DELETE /habits/{id}.
func (c *Client) DeleteHabit(ctx context.Context, id int64) error {
	_, _, err := c.Do(ctx, "DELETE", c.BuildURL(fmt.Sprintf("/habits/%d", id), nil), nil)
	return err
}

// CompleteHabit issues POST /habits/{id}/complete.
func (c *Client) CompleteHabit(ctx context.Context, id int64, input model.CreateHabitCompletionInput) (*model.HabitCompletion, error) {
	raw, _, err := c.Do(ctx, "POST", c.BuildURL(fmt.Sprintf("/habits/%d/complete", id), nil), input)
	if err != nil {
		return nil, err
	}
	var out model.HabitCompletion
	if err := Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// ListHabitCompletions issues GET /habits/{id}/completions with optional from/to window.
func (c *Client) ListHabitCompletions(ctx context.Context, id int64, from, to *time.Time) ([]model.HabitCompletion, error) {
	q := url.Values{}
	if from != nil {
		q.Set("from", from.UTC().Format(time.RFC3339))
	}
	if to != nil {
		q.Set("to", to.UTC().Format(time.RFC3339))
	}
	raw, _, err := c.Do(ctx, "GET", c.BuildURL(fmt.Sprintf("/habits/%d/completions", id), q), nil)
	if err != nil {
		return nil, err
	}
	var out []model.HabitCompletion
	if err := Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out, nil
}

// Status issues GET /api/v1/status.
// It returns the raw body map; typed decoding not required since shape is trivial.
func (c *Client) Status(ctx context.Context) (map[string]any, error) {
	// Status is not wrapped in an envelope — it's a direct object at /api/v1/status.
	urlStr := c.base + APIBase + "/status"
	raw, _, err := c.Do(ctx, "GET", urlStr, nil)
	if err != nil {
		// If the server didn't return an envelope, raw is empty and err contains the issue.
		return nil, err
	}
	// /status returns a direct object, so env.Data will likely be empty.
	// We can also re-fetch raw body; here we just return a best-effort map.
	out := map[string]any{}
	if len(raw) > 0 {
		if err := Unmarshal(raw, &out); err != nil {
			return nil, err
		}
	}
	return out, nil
}
