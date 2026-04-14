package client

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
	"time"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

// TimeFilter holds query params accepted by GET /time-entries.
type TimeFilter struct {
	TaskID *int64
	From   *time.Time
	To     *time.Time
	Active *bool
	Limit  int
	Offset int
}

// Query returns the URL query for the filter.
func (f TimeFilter) Query() url.Values {
	q := url.Values{}
	if f.TaskID != nil {
		q.Set("task_id", strconv.FormatInt(*f.TaskID, 10))
	}
	if f.From != nil {
		q.Set("from", f.From.UTC().Format(time.RFC3339))
	}
	if f.To != nil {
		q.Set("to", f.To.UTC().Format(time.RFC3339))
	}
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

// ListTimeEntries issues GET /time-entries.
func (c *Client) ListTimeEntries(ctx context.Context, f TimeFilter) ([]model.TimeEntry, *Meta, error) {
	raw, meta, err := c.Do(ctx, "GET", c.BuildURL("/time-entries", f.Query()), nil)
	if err != nil {
		return nil, meta, err
	}
	var out []model.TimeEntry
	if err := Unmarshal(raw, &out); err != nil {
		return nil, meta, err
	}
	return out, meta, nil
}

// CreateTimeEntry issues POST /time-entries.
func (c *Client) CreateTimeEntry(ctx context.Context, input model.CreateTimeEntryInput) (*model.TimeEntry, error) {
	raw, _, err := c.Do(ctx, "POST", c.BuildURL("/time-entries", nil), input)
	if err != nil {
		return nil, err
	}
	var out model.TimeEntry
	if err := Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// UpdateTimeEntry issues PUT /time-entries/{id}.
func (c *Client) UpdateTimeEntry(ctx context.Context, id int64, input model.UpdateTimeEntryInput) (*model.TimeEntry, error) {
	raw, _, err := c.Do(ctx, "PUT", c.BuildURL(fmt.Sprintf("/time-entries/%d", id), nil), input)
	if err != nil {
		return nil, err
	}
	var out model.TimeEntry
	if err := Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// DeleteTimeEntry issues DELETE /time-entries/{id}.
func (c *Client) DeleteTimeEntry(ctx context.Context, id int64) error {
	_, _, err := c.Do(ctx, "DELETE", c.BuildURL(fmt.Sprintf("/time-entries/%d", id), nil), nil)
	return err
}
