package cache

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

// Entity is the entity label stored on a queue row.
type Entity string

const (
	EntityTasks       Entity = "tasks"
	EntityProjects    Entity = "projects"
	EntityTimeEntries Entity = "time_entries"
	EntityHabits      Entity = "habits"
)

// Verb is the operation recorded on a queue row.
type Verb string

const (
	VerbPOST            Verb = "POST"
	VerbPUT             Verb = "PUT"
	VerbDELETE          Verb = "DELETE"
	VerbPOSTTimerStart  Verb = "POST_TIMER_START"
	VerbPOSTTimerStop   Verb = "POST_TIMER_STOP"
	VerbPOSTHabitDone   Verb = "POST_HABIT_COMPLETE"
)

// QueueRow mirrors a row in sync_queue.
type QueueRow struct {
	Seq         int64
	Entity      Entity
	Verb        Verb
	LocalID     *int64
	ServerID    *int64
	Payload     json.RawMessage
	CreatedAt   string
	AttemptedAt *string
	Attempts    int
	Error       *string
}

// PendingCount reports how many queue rows have not yet been acknowledged by
// the server. Rows with attempts > 3 are still counted (they are poisoned but
// not dropped until the user runs `atlas sync --retry-failed`).
func (c *Cache) PendingCount() int {
	var n int
	_ = c.db.QueryRow(`SELECT COUNT(*) FROM sync_queue`).Scan(&n)
	return n
}

// enqueue is the single writer for the queue, wrapped in a transaction along
// with the optimistic cache update (caller passes a txFn).
//
//nolint:unused // used by Enqueue* helpers below
func (c *Cache) enqueue(entity Entity, verb Verb, localID, serverID *int64, payload any, txFn func(tx *sql.Tx) error) (int64, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return 0, fmt.Errorf("cache.enqueue: marshal: %w", err)
	}
	tx, err := c.db.Begin()
	if err != nil {
		return 0, fmt.Errorf("cache.enqueue: begin: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if txFn != nil {
		if err := txFn(tx); err != nil {
			return 0, err
		}
	}

	res, err := tx.Exec(
		`INSERT INTO sync_queue(entity, verb, local_id, server_id, payload)
		 VALUES(?, ?, ?, ?, ?)`,
		string(entity), string(verb), nullInt(localID), nullInt(serverID), string(raw),
	)
	if err != nil {
		return 0, fmt.Errorf("cache.enqueue: insert: %w", err)
	}
	seq, err := res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("cache.enqueue: lastid: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("cache.enqueue: commit: %w", err)
	}
	return seq, nil
}

func nullInt(p *int64) any {
	if p == nil {
		return nil
	}
	return *p
}

// ----------------------- tasks -----------------------

// EnqueueTaskCreate buffers a POST /tasks mutation. Returns the temp local ID
// (negative) used for the optimistic cache row. The cache row has dirty=1.
func (c *Cache) EnqueueTaskCreate(input model.CreateTaskInput) (int64, error) {
	var localID int64
	seq, err := c.enqueue(EntityTasks, VerbPOST, nil, nil, input, func(tx *sql.Tx) error {
		id, err := c.nextTempID(tx)
		if err != nil {
			return err
		}
		localID = id
		// Build an optimistic Task row from input.
		t := optimisticTaskFromInput(id, input)
		blob, err := json.Marshal(t)
		if err != nil {
			return err
		}
		_, err = tx.Exec(
			`INSERT INTO tasks(id, data, updated_at, dirty) VALUES(?, ?, ?, 1)`,
			id, string(blob), time.Now().UTC().Format(time.RFC3339),
		)
		return err
	})
	if err != nil {
		return 0, err
	}
	_ = seq
	// Rewrite the queue row with the resolved local_id (enqueue already inserted).
	if _, err := c.db.Exec(`UPDATE sync_queue SET local_id = ? WHERE seq = ?`, localID, seq); err != nil {
		return 0, err
	}
	return localID, nil
}

func optimisticTaskFromInput(localID int64, in model.CreateTaskInput) model.Task {
	t := model.Task{
		ID:    localID,
		Title: in.Title,
	}
	if in.ProjectID != nil {
		t.ProjectID = in.ProjectID
	}
	if in.ParentID != nil {
		t.ParentID = in.ParentID
	}
	if in.Description != nil {
		t.Description = in.Description
	}
	if in.Status != nil {
		t.Status = *in.Status
	} else {
		t.Status = "pending"
	}
	if in.Priority != nil {
		t.Priority = *in.Priority
	} else {
		t.Priority = "medium"
	}
	if in.Energy != nil {
		t.Energy = in.Energy
	}
	if in.EstimatedMins != nil {
		t.EstimatedMins = in.EstimatedMins
	}
	if in.TaskType != nil {
		t.TaskType = *in.TaskType
	}
	if in.ContextTags != nil {
		t.ContextTags = in.ContextTags
	}
	if in.DeepWork != nil {
		t.DeepWork = *in.DeepWork
	}
	if in.QuickWin != nil {
		t.QuickWin = *in.QuickWin
	}
	if in.Recurrence != nil {
		t.Recurrence = in.Recurrence
	}
	now := time.Now().UTC()
	t.CreatedAt = now
	t.UpdatedAt = now
	return t
}

// EnqueueTaskUpdate buffers a PUT /tasks/{id} mutation and merges the change
// into the cache row optimistically. The row is marked dirty.
func (c *Cache) EnqueueTaskUpdate(id int64, input model.UpdateTaskInput) error {
	_, err := c.enqueue(EntityTasks, VerbPUT, nil, &id, input, func(tx *sql.Tx) error {
		// Merge into existing row if present; otherwise skip (user may be updating
		// a record the local cache does not know about — server will correct on sync).
		var blob string
		if err := tx.QueryRow(`SELECT data FROM tasks WHERE id = ?`, id).Scan(&blob); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil
			}
			return err
		}
		var t model.Task
		if err := json.Unmarshal([]byte(blob), &t); err != nil {
			return err
		}
		applyTaskUpdate(&t, input)
		out, err := json.Marshal(t)
		if err != nil {
			return err
		}
		_, err = tx.Exec(
			`UPDATE tasks SET data = ?, updated_at = ?, dirty = 1 WHERE id = ?`,
			string(out), time.Now().UTC().Format(time.RFC3339), id,
		)
		return err
	})
	return err
}

func applyTaskUpdate(t *model.Task, in model.UpdateTaskInput) {
	if in.ProjectID != nil {
		t.ProjectID = in.ProjectID
	}
	if in.ParentID != nil {
		t.ParentID = in.ParentID
	}
	if in.Title != nil {
		t.Title = *in.Title
	}
	if in.Description != nil {
		t.Description = in.Description
	}
	if in.Status != nil {
		t.Status = *in.Status
	}
	if in.Priority != nil {
		t.Priority = *in.Priority
	}
	if in.Energy != nil {
		t.Energy = in.Energy
	}
	if in.EstimatedMins != nil {
		t.EstimatedMins = in.EstimatedMins
	}
	if in.TaskType != nil {
		t.TaskType = *in.TaskType
	}
	if in.ContextTags != nil {
		t.ContextTags = in.ContextTags
	}
	if in.DeepWork != nil {
		t.DeepWork = *in.DeepWork
	}
	if in.QuickWin != nil {
		t.QuickWin = *in.QuickWin
	}
	if in.Recurrence != nil {
		t.Recurrence = in.Recurrence
	}
	if in.SortOrder != nil {
		t.SortOrder = *in.SortOrder
	}
	t.UpdatedAt = time.Now().UTC()
}

// EnqueueTaskDelete buffers a DELETE and removes the task row locally.
func (c *Cache) EnqueueTaskDelete(id int64) error {
	_, err := c.enqueue(EntityTasks, VerbDELETE, nil, &id, map[string]int64{"id": id}, func(tx *sql.Tx) error {
		_, err := tx.Exec(`DELETE FROM tasks WHERE id = ?`, id)
		return err
	})
	return err
}

// EnqueueTimerStart buffers a POST /tasks/{id}/timer/start call.
func (c *Cache) EnqueueTimerStart(taskID int64) error {
	_, err := c.enqueue(EntityTimeEntries, VerbPOSTTimerStart, nil, &taskID,
		map[string]int64{"task_id": taskID}, nil)
	return err
}

// EnqueueTimerStop buffers a POST /tasks/{id}/timer/stop call.
func (c *Cache) EnqueueTimerStop(taskID int64) error {
	_, err := c.enqueue(EntityTimeEntries, VerbPOSTTimerStop, nil, &taskID,
		map[string]int64{"task_id": taskID}, nil)
	return err
}

// ----------------------- projects -----------------------

// EnqueueProjectCreate buffers POST /projects.
func (c *Cache) EnqueueProjectCreate(input model.CreateProjectInput) (int64, error) {
	var localID int64
	seq, err := c.enqueue(EntityProjects, VerbPOST, nil, nil, input, func(tx *sql.Tx) error {
		id, err := c.nextTempID(tx)
		if err != nil {
			return err
		}
		localID = id
		p := model.Project{ID: id, Name: input.Name}
		if input.Description != nil {
			p.Description = input.Description
		}
		if input.Color != nil {
			p.Color = *input.Color
		}
		if input.Area != nil {
			p.Area = *input.Area
		} else {
			p.Area = "other"
		}
		if input.Status != nil {
			p.Status = *input.Status
		} else {
			p.Status = "active"
		}
		now := time.Now().UTC()
		p.CreatedAt = now
		p.UpdatedAt = now
		blob, _ := json.Marshal(p)
		_, err = tx.Exec(
			`INSERT INTO projects(id, data, updated_at, dirty) VALUES(?, ?, ?, 1)`,
			id, string(blob), now.Format(time.RFC3339),
		)
		return err
	})
	if err != nil {
		return 0, err
	}
	if _, err := c.db.Exec(`UPDATE sync_queue SET local_id = ? WHERE seq = ?`, localID, seq); err != nil {
		return 0, err
	}
	return localID, nil
}

// EnqueueProjectUpdate buffers PUT /projects/{id}.
func (c *Cache) EnqueueProjectUpdate(id int64, input model.UpdateProjectInput) error {
	_, err := c.enqueue(EntityProjects, VerbPUT, nil, &id, input, nil)
	return err
}

// EnqueueProjectDelete buffers DELETE /projects/{id}.
func (c *Cache) EnqueueProjectDelete(id int64) error {
	_, err := c.enqueue(EntityProjects, VerbDELETE, nil, &id, map[string]int64{"id": id}, func(tx *sql.Tx) error {
		_, err := tx.Exec(`DELETE FROM projects WHERE id = ?`, id)
		return err
	})
	return err
}

// ----------------------- habits -----------------------

// EnqueueHabitCreate buffers POST /habits.
func (c *Cache) EnqueueHabitCreate(input model.CreateHabitInput) (int64, error) {
	var localID int64
	seq, err := c.enqueue(EntityHabits, VerbPOST, nil, nil, input, func(tx *sql.Tx) error {
		id, err := c.nextTempID(tx)
		if err != nil {
			return err
		}
		localID = id
		h := model.Habit{ID: id, Name: input.Name, Active: true, TargetCount: 1}
		if input.Frequency != nil {
			h.Frequency = *input.Frequency
		}
		now := time.Now().UTC()
		h.CreatedAt = now
		blob, _ := json.Marshal(h)
		_, err = tx.Exec(
			`INSERT INTO habits(id, data, updated_at, dirty) VALUES(?, ?, ?, 1)`,
			id, string(blob), now.Format(time.RFC3339),
		)
		return err
	})
	if err != nil {
		return 0, err
	}
	if _, err := c.db.Exec(`UPDATE sync_queue SET local_id = ? WHERE seq = ?`, localID, seq); err != nil {
		return 0, err
	}
	return localID, nil
}

// EnqueueHabitDelete buffers DELETE /habits/{id}.
func (c *Cache) EnqueueHabitDelete(id int64) error {
	_, err := c.enqueue(EntityHabits, VerbDELETE, nil, &id, map[string]int64{"id": id}, func(tx *sql.Tx) error {
		_, err := tx.Exec(`DELETE FROM habits WHERE id = ?`, id)
		return err
	})
	return err
}

// EnqueueHabitComplete buffers POST /habits/{id}/complete.
func (c *Cache) EnqueueHabitComplete(id int64, input model.CreateHabitCompletionInput) error {
	_, err := c.enqueue(EntityHabits, VerbPOSTHabitDone, nil, &id, input, nil)
	return err
}

// ----------------------- time entries -----------------------

// EnqueueTimeEntryCreate buffers POST /time-entries.
func (c *Cache) EnqueueTimeEntryCreate(input model.CreateTimeEntryInput) (int64, error) {
	var localID int64
	seq, err := c.enqueue(EntityTimeEntries, VerbPOST, nil, nil, input, func(tx *sql.Tx) error {
		id, err := c.nextTempID(tx)
		if err != nil {
			return err
		}
		localID = id
		e := model.TimeEntry{ID: id}
		if t, err := time.Parse(time.RFC3339, input.StartedAt); err == nil {
			e.StartedAt = t
		} else {
			e.StartedAt = time.Now().UTC()
		}
		if input.TaskID != nil {
			e.TaskID = input.TaskID
		}
		if input.EntryType != nil {
			e.EntryType = *input.EntryType
		}
		if input.Source != nil {
			e.Source = *input.Source
		}
		if input.Notes != nil {
			e.Notes = input.Notes
		}
		e.CreatedAt = time.Now().UTC()
		blob, _ := json.Marshal(e)
		_, err = tx.Exec(
			`INSERT INTO time_entries(id, data, updated_at, dirty) VALUES(?, ?, ?, 1)`,
			id, string(blob), e.CreatedAt.Format(time.RFC3339),
		)
		return err
	})
	if err != nil {
		return 0, err
	}
	if _, err := c.db.Exec(`UPDATE sync_queue SET local_id = ? WHERE seq = ?`, localID, seq); err != nil {
		return 0, err
	}
	return localID, nil
}

// EnqueueTimeEntryUpdate buffers PUT /time-entries/{id}.
func (c *Cache) EnqueueTimeEntryUpdate(id int64, input model.UpdateTimeEntryInput) error {
	_, err := c.enqueue(EntityTimeEntries, VerbPUT, nil, &id, input, nil)
	return err
}

// EnqueueTimeEntryDelete buffers DELETE /time-entries/{id}.
func (c *Cache) EnqueueTimeEntryDelete(id int64) error {
	_, err := c.enqueue(EntityTimeEntries, VerbDELETE, nil, &id, map[string]int64{"id": id}, func(tx *sql.Tx) error {
		_, err := tx.Exec(`DELETE FROM time_entries WHERE id = ?`, id)
		return err
	})
	return err
}

// pendingRows returns all queue rows ordered by seq, skipping those with too
// many attempts unless includeFailed is true.
func (c *Cache) pendingRows(includeFailed bool) ([]QueueRow, error) {
	q := `SELECT seq, entity, verb, local_id, server_id, payload, created_at, attempted_at, attempts, error
	      FROM sync_queue`
	if !includeFailed {
		q += ` WHERE attempts < 3`
	}
	q += ` ORDER BY seq ASC`
	rows, err := c.db.Query(q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []QueueRow
	for rows.Next() {
		var r QueueRow
		var payload string
		var localID, serverID sql.NullInt64
		var attemptedAt, errStr sql.NullString
		if err := rows.Scan(&r.Seq, &r.Entity, &r.Verb, &localID, &serverID, &payload, &r.CreatedAt, &attemptedAt, &r.Attempts, &errStr); err != nil {
			return nil, err
		}
		if localID.Valid {
			v := localID.Int64
			r.LocalID = &v
		}
		if serverID.Valid {
			v := serverID.Int64
			r.ServerID = &v
		}
		if attemptedAt.Valid {
			v := attemptedAt.String
			r.AttemptedAt = &v
		}
		if errStr.Valid {
			v := errStr.String
			r.Error = &v
		}
		r.Payload = json.RawMessage(payload)
		out = append(out, r)
	}
	return out, rows.Err()
}
