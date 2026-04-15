package cache

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	clierr "github.com/MiguelAguiarDEV/atlas/apps/cli/internal/errors"
	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/client"
	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

// DrainResult summarises a DrainOnce pass.
type DrainResult struct {
	Done    int
	Failed  int
	Skipped int // poisoned (attempts > 3), left in queue
}

// DrainOnce processes every unfinished queue row FIFO. Each row is attempted
// until no more progress is made in a pass. On success the row is deleted.
// On failure the row stays in the queue with an incremented attempt counter,
// unless the server returned a 4xx (non-transient) — those are marked as
// poisoned via the error column and left for the operator to inspect via
// `atlas sync --retry-failed`.
//
// The caller owns the client; DrainOnce does not decide whether the network
// is reachable.
func (c *Cache) DrainOnce(ctx context.Context, cli *client.Client) (DrainResult, error) {
	res := DrainResult{}
	// Rows that deferred (awaiting a temp id) are retried after siblings finish.
	// We loop until a pass completes zero rows.
	skipped := map[int64]bool{}
	for {
		rows, err := c.pendingRows(false)
		if err != nil {
			return res, fmt.Errorf("cache.DrainOnce: list: %w", err)
		}
		progress := false
		for _, r := range rows {
			if err := ctx.Err(); err != nil {
				return res, err
			}
			if skipped[r.Seq] {
				continue
			}
			ok, permanent, msg := c.applyRow(ctx, cli, r)
			if ok {
				if _, err := c.db.Exec(`DELETE FROM sync_queue WHERE seq = ?`, r.Seq); err != nil {
					return res, err
				}
				res.Done++
				progress = true
				continue
			}
			// Not ok: deferred vs real failure.
			if !permanent && strings.Contains(msg, "awaiting") {
				skipped[r.Seq] = true
				continue
			}
			res.Failed++
			attempts := r.Attempts + 1
			_, _ = c.db.Exec(
				`UPDATE sync_queue SET attempted_at = ?, attempts = ?, error = ? WHERE seq = ?`,
				time.Now().UTC().Format(time.RFC3339), attempts, msg, r.Seq,
			)
			if permanent {
				res.Skipped++
			}
			skipped[r.Seq] = true
		}
		if !progress {
			break
		}
		// Reset skipped deferrals so newly-resolved rows get another chance.
		skipped = map[int64]bool{}
	}
	return res, nil
}

// applyRow attempts to replay one queue row against the server.
// Returns (ok, permanent, errMessage).
func (c *Cache) applyRow(ctx context.Context, cli *client.Client, r QueueRow) (bool, bool, string) {
	switch r.Entity {
	case EntityTasks:
		return c.applyTaskRow(ctx, cli, r)
	case EntityProjects:
		return c.applyProjectRow(ctx, cli, r)
	case EntityHabits:
		return c.applyHabitRow(ctx, cli, r)
	case EntityTimeEntries:
		return c.applyTimeEntryRow(ctx, cli, r)
	default:
		return false, true, "unknown entity: " + string(r.Entity)
	}
}

func (c *Cache) applyTaskRow(ctx context.Context, cli *client.Client, r QueueRow) (bool, bool, string) {
	switch r.Verb {
	case VerbPOST:
		var in model.CreateTaskInput
		if err := json.Unmarshal(r.Payload, &in); err != nil {
			return false, true, "unmarshal: " + err.Error()
		}
		task, err := cli.CreateTask(ctx, in)
		if err != nil {
			return false, isPermanent(err), err.Error()
		}
		if r.LocalID != nil {
			if err := c.reconcileTempTask(*r.LocalID, *task); err != nil {
				return false, false, err.Error()
			}
		} else {
			_ = c.PutTasks([]model.Task{*task}, true)
		}
		return true, false, ""
	case VerbPUT:
		if r.ServerID == nil {
			return false, true, "missing server_id for PUT"
		}
		var in model.UpdateTaskInput
		if err := json.Unmarshal(r.Payload, &in); err != nil {
			return false, true, "unmarshal: " + err.Error()
		}
		// If the row references a still-temp id (creation hasn't synced yet),
		// leave it in the queue until the POST ahead of it lands.
		if *r.ServerID < 0 {
			return false, false, "awaiting temp id resolution"
		}
		task, err := cli.UpdateTask(ctx, *r.ServerID, in)
		if err != nil {
			return false, isPermanent(err), err.Error()
		}
		_ = c.PutTasks([]model.Task{*task}, true)
		return true, false, ""
	case VerbDELETE:
		if r.ServerID == nil {
			return false, true, "missing server_id for DELETE"
		}
		if *r.ServerID < 0 {
			// Row was created locally and then deleted before ever syncing;
			// nothing to do on the server.
			return true, false, ""
		}
		if err := cli.DeleteTask(ctx, *r.ServerID); err != nil {
			return false, isPermanent(err), err.Error()
		}
		return true, false, ""
	case VerbPOSTTimerStart:
		if r.ServerID == nil {
			return false, true, "missing server_id for timer start"
		}
		if *r.ServerID < 0 {
			return false, false, "awaiting temp id resolution"
		}
		entry, err := cli.StartTimer(ctx, *r.ServerID)
		if err != nil {
			return false, isPermanent(err), err.Error()
		}
		_ = c.PutTimeEntries([]model.TimeEntry{*entry}, true)
		return true, false, ""
	case VerbPOSTTimerStop:
		if r.ServerID == nil {
			return false, true, "missing server_id for timer stop"
		}
		if *r.ServerID < 0 {
			return false, false, "awaiting temp id resolution"
		}
		entry, err := cli.StopTimer(ctx, *r.ServerID)
		if err != nil {
			return false, isPermanent(err), err.Error()
		}
		_ = c.PutTimeEntries([]model.TimeEntry{*entry}, true)
		return true, false, ""
	}
	return false, true, "unsupported verb: " + string(r.Verb)
}

func (c *Cache) applyProjectRow(ctx context.Context, cli *client.Client, r QueueRow) (bool, bool, string) {
	switch r.Verb {
	case VerbPOST:
		var in model.CreateProjectInput
		if err := json.Unmarshal(r.Payload, &in); err != nil {
			return false, true, err.Error()
		}
		p, err := cli.CreateProject(ctx, in)
		if err != nil {
			return false, isPermanent(err), err.Error()
		}
		if r.LocalID != nil {
			if err := c.reconcileTempProject(*r.LocalID, *p); err != nil {
				return false, false, err.Error()
			}
		} else {
			_ = c.PutProjects([]model.Project{*p}, true)
		}
		return true, false, ""
	case VerbPUT:
		if r.ServerID == nil || *r.ServerID < 0 {
			return false, false, "awaiting server id"
		}
		var in model.UpdateProjectInput
		if err := json.Unmarshal(r.Payload, &in); err != nil {
			return false, true, err.Error()
		}
		p, err := cli.UpdateProject(ctx, *r.ServerID, in)
		if err != nil {
			return false, isPermanent(err), err.Error()
		}
		_ = c.PutProjects([]model.Project{*p}, true)
		return true, false, ""
	case VerbDELETE:
		if r.ServerID == nil {
			return false, true, "missing server_id"
		}
		if *r.ServerID < 0 {
			return true, false, ""
		}
		if err := cli.DeleteProject(ctx, *r.ServerID); err != nil {
			return false, isPermanent(err), err.Error()
		}
		return true, false, ""
	}
	return false, true, "unsupported verb: " + string(r.Verb)
}

func (c *Cache) applyHabitRow(ctx context.Context, cli *client.Client, r QueueRow) (bool, bool, string) {
	switch r.Verb {
	case VerbPOST:
		var in model.CreateHabitInput
		if err := json.Unmarshal(r.Payload, &in); err != nil {
			return false, true, err.Error()
		}
		h, err := cli.CreateHabit(ctx, in)
		if err != nil {
			return false, isPermanent(err), err.Error()
		}
		if r.LocalID != nil {
			if err := c.reconcileTempHabit(*r.LocalID, *h); err != nil {
				return false, false, err.Error()
			}
		} else {
			_ = c.PutHabits([]model.Habit{*h}, true)
		}
		return true, false, ""
	case VerbDELETE:
		if r.ServerID == nil {
			return false, true, "missing server_id"
		}
		if *r.ServerID < 0 {
			return true, false, ""
		}
		if err := cli.DeleteHabit(ctx, *r.ServerID); err != nil {
			return false, isPermanent(err), err.Error()
		}
		return true, false, ""
	case VerbPOSTHabitDone:
		if r.ServerID == nil || *r.ServerID < 0 {
			return false, false, "awaiting server id"
		}
		var in model.CreateHabitCompletionInput
		if err := json.Unmarshal(r.Payload, &in); err != nil {
			return false, true, err.Error()
		}
		if _, err := cli.CompleteHabit(ctx, *r.ServerID, in); err != nil {
			return false, isPermanent(err), err.Error()
		}
		return true, false, ""
	}
	return false, true, "unsupported verb: " + string(r.Verb)
}

func (c *Cache) applyTimeEntryRow(ctx context.Context, cli *client.Client, r QueueRow) (bool, bool, string) {
	switch r.Verb {
	case VerbPOST:
		var in model.CreateTimeEntryInput
		if err := json.Unmarshal(r.Payload, &in); err != nil {
			return false, true, err.Error()
		}
		// If the embedded task_id is still a temp id, wait for the POST /tasks to resolve it first.
		if in.TaskID != nil && *in.TaskID < 0 {
			return false, false, "awaiting task temp id resolution"
		}
		e, err := cli.CreateTimeEntry(ctx, in)
		if err != nil {
			return false, isPermanent(err), err.Error()
		}
		if r.LocalID != nil {
			if err := c.reconcileTempTimeEntry(*r.LocalID, *e); err != nil {
				return false, false, err.Error()
			}
		} else {
			_ = c.PutTimeEntries([]model.TimeEntry{*e}, true)
		}
		return true, false, ""
	case VerbPUT:
		if r.ServerID == nil || *r.ServerID < 0 {
			return false, false, "awaiting server id"
		}
		var in model.UpdateTimeEntryInput
		if err := json.Unmarshal(r.Payload, &in); err != nil {
			return false, true, err.Error()
		}
		e, err := cli.UpdateTimeEntry(ctx, *r.ServerID, in)
		if err != nil {
			return false, isPermanent(err), err.Error()
		}
		_ = c.PutTimeEntries([]model.TimeEntry{*e}, true)
		return true, false, ""
	case VerbDELETE:
		if r.ServerID == nil {
			return false, true, "missing server_id"
		}
		if *r.ServerID < 0 {
			return true, false, ""
		}
		if err := cli.DeleteTimeEntry(ctx, *r.ServerID); err != nil {
			return false, isPermanent(err), err.Error()
		}
		return true, false, ""
	}
	return false, true, "unsupported verb: " + string(r.Verb)
}

// reconcileTempTask swaps a negative temp id row for its real server row, and
// rewrites any queued rows that referenced the temp id.
func (c *Cache) reconcileTempTask(localID int64, real model.Task) error {
	return c.reconcileTempRow("tasks", localID, real.ID, mustJSON(real), real.UpdatedAt)
}

func (c *Cache) reconcileTempProject(localID int64, real model.Project) error {
	return c.reconcileTempRow("projects", localID, real.ID, mustJSON(real), real.UpdatedAt)
}

func (c *Cache) reconcileTempHabit(localID int64, real model.Habit) error {
	return c.reconcileTempRow("habits", localID, real.ID, mustJSON(real), real.CreatedAt)
}

func (c *Cache) reconcileTempTimeEntry(localID int64, real model.TimeEntry) error {
	return c.reconcileTempRow("time_entries", localID, real.ID, mustJSON(real), real.CreatedAt)
}

func (c *Cache) reconcileTempRow(table string, localID, realID int64, blob string, updatedAt time.Time) error {
	tx, err := c.db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	// Replace row: delete temp, insert real (avoids PK update quirks).
	if _, err := tx.Exec(`DELETE FROM `+table+` WHERE id = ?`, localID); err != nil {
		return err
	}
	if _, err := tx.Exec(
		`INSERT INTO `+table+`(id, data, updated_at, dirty) VALUES(?, ?, ?, 0)
		 ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, dirty = 0`,
		realID, blob, updatedAt.UTC().Format(time.RFC3339),
	); err != nil {
		return err
	}

	// Rewrite any queue rows that referenced the temp id in server_id OR that
	// have the temp id inside their JSON payload (for time entries with task_id).
	if _, err := tx.Exec(
		`UPDATE sync_queue SET server_id = ? WHERE server_id = ? AND entity = ?`,
		realID, localID, table,
	); err != nil {
		return err
	}
	// For task temp ids referenced by time_entries queue rows, update payload JSON.
	if table == "tasks" {
		rows, err := tx.Query(
			`SELECT seq, payload FROM sync_queue WHERE entity = 'time_entries'`,
		)
		if err != nil {
			return err
		}
		type patch struct {
			seq     int64
			payload string
		}
		var patches []patch
		for rows.Next() {
			var seq int64
			var payload string
			if err := rows.Scan(&seq, &payload); err != nil {
				rows.Close()
				return err
			}
			var m map[string]any
			if err := json.Unmarshal([]byte(payload), &m); err != nil {
				continue
			}
			if v, ok := m["task_id"].(float64); ok && int64(v) == localID {
				m["task_id"] = realID
				out, _ := json.Marshal(m)
				patches = append(patches, patch{seq, string(out)})
			}
		}
		rows.Close()
		for _, p := range patches {
			if _, err := tx.Exec(`UPDATE sync_queue SET payload = ? WHERE seq = ?`, p.payload, p.seq); err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func mustJSON(v any) string {
	out, _ := json.Marshal(v)
	return string(out)
}

// isPermanent returns true when an API error is not worth retrying (4xx).
func isPermanent(err error) bool {
	if err == nil {
		return false
	}
	var ue *clierr.UserErr
	if errors.As(err, &ue) {
		// 409 conflict / 400 validation errors are permanent from our POV.
		if ue.Status >= 400 && ue.Status < 500 {
			return true
		}
	}
	// Generic server errors (5xx) and NetErr are transient.
	return false
}

// RetryFailed resets attempts on all poisoned queue rows so the next DrainOnce
// reprocesses them. Error columns are preserved for forensics.
func (c *Cache) RetryFailed() error {
	_, err := c.db.Exec(`UPDATE sync_queue SET attempts = 0`)
	return err
}

// NearestReachable returns whether the API responded within the given timeout.
// Network/DNS/timeout errors all count as "unreachable".
func NearestReachable(ctx context.Context, cli *client.Client, timeout time.Duration) bool {
	if timeout <= 0 {
		timeout = 2 * time.Second
	}
	pingCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	_, err := cli.Status(pingCtx)
	if err == nil {
		return true
	}
	// Treat both network errors and 5xx as unreachable; 4xx means server is
	// actually up (auth issue, missing endpoint, etc.) so we call that reachable.
	var netErr *clierr.NetErr
	if errors.As(err, &netErr) {
		return false
	}
	var se *clierr.ServerErr
	if errors.As(err, &se) {
		return false
	}
	// Unknown — be conservative and treat as offline.
	if strings.Contains(strings.ToLower(err.Error()), "timeout") {
		return false
	}
	return true
}

// Unused guard to satisfy sql import when future helpers are added.
var _ = sql.ErrNoRows
