package store

import (
	"context"
	"sync"
	"time"

	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/model"
)

// MockTaskStore is an in-memory implementation of TaskStore for testing.
type MockTaskStore struct {
	mu     sync.RWMutex
	tasks  map[int64]model.Task
	events map[int64][]model.TaskEvent
	nextID int64
	evtID  int64
}

// NewMockTaskStore creates a new MockTaskStore.
func NewMockTaskStore() *MockTaskStore {
	return &MockTaskStore{
		tasks:  make(map[int64]model.Task),
		events: make(map[int64][]model.TaskEvent),
		nextID: 1,
		evtID:  1,
	}
}

func (m *MockTaskStore) List(ctx context.Context, filter model.TaskFilter) (ListResult[model.Task], error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var todayStart, todayEnd time.Time
	if filter.TodayOnly {
		now := time.Now()
		todayStart = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		todayEnd = todayStart.Add(24 * time.Hour)
	}

	var items []model.Task
	for _, t := range m.tasks {
		if filter.Status != nil && t.Status != *filter.Status {
			continue
		}
		if filter.ProjectID != nil && (t.ProjectID == nil || *t.ProjectID != *filter.ProjectID) {
			continue
		}
		if filter.Priority != nil && t.Priority != *filter.Priority {
			continue
		}
		if filter.TodayOnly {
			inDue := t.DueAt != nil && !t.DueAt.Before(todayStart) && t.DueAt.Before(todayEnd)
			inStarted := t.StartedAt != nil && !t.StartedAt.Before(todayStart) && t.StartedAt.Before(todayEnd)
			if !inDue && !inStarted {
				continue
			}
		}
		items = append(items, t)
	}
	if items == nil {
		items = []model.Task{}
	}

	total := len(items)
	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}
	if offset >= len(items) {
		items = []model.Task{}
	} else {
		end := offset + limit
		if end > len(items) {
			end = len(items)
		}
		items = items[offset:end]
	}

	return ListResult[model.Task]{Items: items, Total: total}, nil
}

func (m *MockTaskStore) GetByID(ctx context.Context, id int64) (model.Task, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	t, ok := m.tasks[id]
	if !ok {
		return model.Task{}, ErrNotFound
	}
	return t, nil
}

func (m *MockTaskStore) Create(ctx context.Context, input model.CreateTaskInput) (model.Task, error) {
	if input.Title == "" {
		return model.Task{}, ErrInvalidInput
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	t := model.Task{
		ID:          m.nextID,
		ProjectID:   input.ProjectID,
		ParentID:    input.ParentID,
		Title:       input.Title,
		Description: input.Description,
		Status:      "inbox",
		Priority:    "p2",
		Energy:      input.Energy,
		EstimatedMins: input.EstimatedMins,
		TaskType:    "task",
		ContextTags: input.ContextTags,
		DeepWork:    false,
		QuickWin:    false,
		Recurrence:  input.Recurrence,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if input.Status != nil {
		t.Status = *input.Status
	}
	if input.Priority != nil {
		t.Priority = *input.Priority
	}
	if input.TaskType != nil {
		t.TaskType = *input.TaskType
	}
	if input.DeepWork != nil {
		t.DeepWork = *input.DeepWork
	}
	if input.QuickWin != nil {
		t.QuickWin = *input.QuickWin
	}
	if input.DueAt != nil {
		parsed, err := time.Parse(time.RFC3339, *input.DueAt)
		if err != nil {
			return model.Task{}, ErrInvalidInput
		}
		t.DueAt = &parsed
	}
	if t.ContextTags == nil {
		t.ContextTags = []string{}
	}

	m.tasks[m.nextID] = t
	m.nextID++
	return t, nil
}

func (m *MockTaskStore) Update(ctx context.Context, id int64, input model.UpdateTaskInput) (model.Task, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	t, ok := m.tasks[id]
	if !ok {
		return model.Task{}, ErrNotFound
	}

	if input.Title != nil {
		if *input.Title == "" {
			return model.Task{}, ErrInvalidInput
		}
		t.Title = *input.Title
	}
	if input.Description != nil {
		t.Description = input.Description
	}
	if input.Status != nil {
		t.Status = *input.Status
		if *input.Status == "done" || *input.Status == "cancelled" {
			now := time.Now()
			t.CompletedAt = &now
		}
		if *input.Status == "in_progress" && t.StartedAt == nil {
			now := time.Now()
			t.StartedAt = &now
		}
	}
	if input.Priority != nil {
		t.Priority = *input.Priority
	}
	if input.ProjectID != nil {
		t.ProjectID = input.ProjectID
	}
	if input.ParentID != nil {
		t.ParentID = input.ParentID
	}
	if input.Energy != nil {
		t.Energy = input.Energy
	}
	if input.EstimatedMins != nil {
		t.EstimatedMins = input.EstimatedMins
	}
	if input.TaskType != nil {
		t.TaskType = *input.TaskType
	}
	if input.ContextTags != nil {
		t.ContextTags = input.ContextTags
	}
	if input.DeepWork != nil {
		t.DeepWork = *input.DeepWork
	}
	if input.QuickWin != nil {
		t.QuickWin = *input.QuickWin
	}
	if input.Recurrence != nil {
		t.Recurrence = input.Recurrence
	}
	if input.SortOrder != nil {
		t.SortOrder = *input.SortOrder
	}
	if input.DueAt != nil {
		parsed, err := time.Parse(time.RFC3339, *input.DueAt)
		if err != nil {
			return model.Task{}, ErrInvalidInput
		}
		t.DueAt = &parsed
	}

	t.UpdatedAt = time.Now()
	m.tasks[id] = t
	return t, nil
}

func (m *MockTaskStore) Delete(ctx context.Context, id int64) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.tasks[id]; !ok {
		return ErrNotFound
	}
	delete(m.tasks, id)
	delete(m.events, id)
	return nil
}

func (m *MockTaskStore) CreateEvent(ctx context.Context, taskID int64, input model.CreateTaskEventInput) (model.TaskEvent, error) {
	if input.EventType == "" {
		return model.TaskEvent{}, ErrInvalidInput
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.tasks[taskID]; !ok {
		return model.TaskEvent{}, ErrNotFound
	}

	evt := model.TaskEvent{
		ID:         m.evtID,
		TaskID:     taskID,
		EventType:  input.EventType,
		Payload:    input.Payload,
		OccurredAt: time.Now(),
	}
	m.events[taskID] = append(m.events[taskID], evt)
	m.evtID++
	return evt, nil
}

func (m *MockTaskStore) ListEvents(ctx context.Context, taskID int64) ([]model.TaskEvent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	events := m.events[taskID]
	if events == nil {
		events = []model.TaskEvent{}
	}
	return events, nil
}

// MockProjectStore is an in-memory implementation of ProjectStore for testing.
type MockProjectStore struct {
	mu       sync.RWMutex
	projects map[int64]model.Project
	nextID   int64
}

// NewMockProjectStore creates a new MockProjectStore.
func NewMockProjectStore() *MockProjectStore {
	return &MockProjectStore{
		projects: make(map[int64]model.Project),
		nextID:   1,
	}
}

func (m *MockProjectStore) List(ctx context.Context, limit, offset int) (ListResult[model.Project], error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var items []model.Project
	for _, p := range m.projects {
		items = append(items, p)
	}
	if items == nil {
		items = []model.Project{}
	}

	total := len(items)
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	if offset >= len(items) {
		items = []model.Project{}
	} else {
		end := offset + limit
		if end > len(items) {
			end = len(items)
		}
		items = items[offset:end]
	}

	return ListResult[model.Project]{Items: items, Total: total}, nil
}

func (m *MockProjectStore) GetByID(ctx context.Context, id int64) (model.Project, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	p, ok := m.projects[id]
	if !ok {
		return model.Project{}, ErrNotFound
	}
	return p, nil
}

func (m *MockProjectStore) Create(ctx context.Context, input model.CreateProjectInput) (model.Project, error) {
	if input.Name == "" {
		return model.Project{}, ErrInvalidInput
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	p := model.Project{
		ID:        m.nextID,
		Name:      input.Name,
		Description: input.Description,
		Color:     "#3b82f6",
		Icon:      input.Icon,
		Area:      "projects",
		Status:    "active",
		CreatedAt: now,
		UpdatedAt: now,
	}
	if input.Color != nil {
		p.Color = *input.Color
	}
	if input.Area != nil {
		p.Area = *input.Area
	}
	if input.Status != nil {
		p.Status = *input.Status
	}
	if input.SortOrder != nil {
		p.SortOrder = *input.SortOrder
	}

	m.projects[m.nextID] = p
	m.nextID++
	return p, nil
}

func (m *MockProjectStore) Update(ctx context.Context, id int64, input model.UpdateProjectInput) (model.Project, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	p, ok := m.projects[id]
	if !ok {
		return model.Project{}, ErrNotFound
	}

	if input.Name != nil {
		if *input.Name == "" {
			return model.Project{}, ErrInvalidInput
		}
		p.Name = *input.Name
	}
	if input.Description != nil {
		p.Description = input.Description
	}
	if input.Color != nil {
		p.Color = *input.Color
	}
	if input.Icon != nil {
		p.Icon = input.Icon
	}
	if input.Area != nil {
		p.Area = *input.Area
	}
	if input.Status != nil {
		p.Status = *input.Status
	}
	if input.SortOrder != nil {
		p.SortOrder = *input.SortOrder
	}

	p.UpdatedAt = time.Now()
	m.projects[id] = p
	return p, nil
}

func (m *MockProjectStore) Delete(ctx context.Context, id int64) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.projects[id]; !ok {
		return ErrNotFound
	}
	delete(m.projects, id)
	return nil
}

// MockTimeEntryStore is an in-memory implementation of TimeEntryStore for testing.
type MockTimeEntryStore struct {
	mu      sync.RWMutex
	entries map[int64]model.TimeEntry
	nextID  int64
}

// NewMockTimeEntryStore creates a new MockTimeEntryStore.
func NewMockTimeEntryStore() *MockTimeEntryStore {
	return &MockTimeEntryStore{
		entries: make(map[int64]model.TimeEntry),
		nextID:  1,
	}
}

func (m *MockTimeEntryStore) List(ctx context.Context, taskID *int64, limit, offset int) (ListResult[model.TimeEntry], error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var items []model.TimeEntry
	for _, te := range m.entries {
		if taskID != nil && (te.TaskID == nil || *te.TaskID != *taskID) {
			continue
		}
		items = append(items, te)
	}
	if items == nil {
		items = []model.TimeEntry{}
	}

	total := len(items)
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	if offset >= len(items) {
		items = []model.TimeEntry{}
	} else {
		end := offset + limit
		if end > len(items) {
			end = len(items)
		}
		items = items[offset:end]
	}

	return ListResult[model.TimeEntry]{Items: items, Total: total}, nil
}

func (m *MockTimeEntryStore) GetByID(ctx context.Context, id int64) (model.TimeEntry, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	te, ok := m.entries[id]
	if !ok {
		return model.TimeEntry{}, ErrNotFound
	}
	return te, nil
}

func (m *MockTimeEntryStore) Create(ctx context.Context, input model.CreateTimeEntryInput) (model.TimeEntry, error) {
	if input.StartedAt == "" {
		return model.TimeEntry{}, ErrInvalidInput
	}
	startedAt, err := time.Parse(time.RFC3339, input.StartedAt)
	if err != nil {
		return model.TimeEntry{}, ErrInvalidInput
	}

	var endedAt *time.Time
	if input.EndedAt != nil {
		t, err := time.Parse(time.RFC3339, *input.EndedAt)
		if err != nil {
			return model.TimeEntry{}, ErrInvalidInput
		}
		endedAt = &t
	}

	entryType := "timer"
	if input.EntryType != nil {
		entryType = *input.EntryType
	}
	source := "web"
	if input.Source != nil {
		source = *input.Source
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	te := model.TimeEntry{
		ID:           m.nextID,
		TaskID:       input.TaskID,
		StartedAt:    startedAt,
		EndedAt:      endedAt,
		DurationSecs: input.DurationSecs,
		EntryType:    entryType,
		Source:       source,
		Notes:        input.Notes,
		CreatedAt:    time.Now(),
	}
	m.entries[m.nextID] = te
	m.nextID++
	return te, nil
}

func (m *MockTimeEntryStore) Update(ctx context.Context, id int64, input model.UpdateTimeEntryInput) (model.TimeEntry, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	te, ok := m.entries[id]
	if !ok {
		return model.TimeEntry{}, ErrNotFound
	}

	if input.TaskID != nil {
		te.TaskID = input.TaskID
	}
	if input.StartedAt != nil {
		t, err := time.Parse(time.RFC3339, *input.StartedAt)
		if err != nil {
			return model.TimeEntry{}, ErrInvalidInput
		}
		te.StartedAt = t
	}
	if input.EndedAt != nil {
		t, err := time.Parse(time.RFC3339, *input.EndedAt)
		if err != nil {
			return model.TimeEntry{}, ErrInvalidInput
		}
		te.EndedAt = &t
	}
	if input.DurationSecs != nil {
		te.DurationSecs = input.DurationSecs
	}
	if input.EntryType != nil {
		te.EntryType = *input.EntryType
	}
	if input.Source != nil {
		te.Source = *input.Source
	}
	if input.Notes != nil {
		te.Notes = input.Notes
	}

	m.entries[id] = te
	return te, nil
}

func (m *MockTimeEntryStore) Delete(ctx context.Context, id int64) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.entries[id]; !ok {
		return ErrNotFound
	}
	delete(m.entries, id)
	return nil
}

func (m *MockTimeEntryStore) StartTimer(ctx context.Context, taskID int64) (model.TimeEntry, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Check for running timer
	for _, te := range m.entries {
		if te.TaskID != nil && *te.TaskID == taskID && te.EndedAt == nil {
			return model.TimeEntry{}, ErrRunningTimer
		}
	}

	now := time.Now()
	tid := taskID
	te := model.TimeEntry{
		ID:        m.nextID,
		TaskID:    &tid,
		StartedAt: now,
		EntryType: "timer",
		Source:    "web",
		CreatedAt: now,
	}
	m.entries[m.nextID] = te
	m.nextID++
	return te, nil
}

func (m *MockTimeEntryStore) StopTimer(ctx context.Context, taskID int64) (model.TimeEntry, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for id, te := range m.entries {
		if te.TaskID != nil && *te.TaskID == taskID && te.EndedAt == nil {
			now := time.Now()
			te.EndedAt = &now
			dur := int(now.Sub(te.StartedAt).Seconds())
			te.DurationSecs = &dur
			m.entries[id] = te
			return te, nil
		}
	}
	return model.TimeEntry{}, ErrNoRunningTimer
}

// MockHabitStore is an in-memory implementation of HabitStore for testing.
type MockHabitStore struct {
	mu          sync.RWMutex
	habits      map[int64]model.Habit
	completions map[int64][]model.HabitCompletion
	nextID      int64
	compID      int64
}

// NewMockHabitStore creates a new MockHabitStore.
func NewMockHabitStore() *MockHabitStore {
	return &MockHabitStore{
		habits:      make(map[int64]model.Habit),
		completions: make(map[int64][]model.HabitCompletion),
		nextID:      1,
		compID:      1,
	}
}

func (m *MockHabitStore) List(ctx context.Context, limit, offset int) (ListResult[model.Habit], error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var items []model.Habit
	for _, h := range m.habits {
		items = append(items, h)
	}
	if items == nil {
		items = []model.Habit{}
	}

	total := len(items)
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	if offset >= len(items) {
		items = []model.Habit{}
	} else {
		end := offset + limit
		if end > len(items) {
			end = len(items)
		}
		items = items[offset:end]
	}

	return ListResult[model.Habit]{Items: items, Total: total}, nil
}

func (m *MockHabitStore) GetByID(ctx context.Context, id int64) (model.Habit, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	h, ok := m.habits[id]
	if !ok {
		return model.Habit{}, ErrNotFound
	}
	return h, nil
}

func (m *MockHabitStore) Create(ctx context.Context, input model.CreateHabitInput) (model.Habit, error) {
	if input.Name == "" {
		return model.Habit{}, ErrInvalidInput
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	h := model.Habit{
		ID:          m.nextID,
		Name:        input.Name,
		Description: input.Description,
		Frequency:   "daily",
		TargetCount: 1,
		HabitGroup:  input.HabitGroup,
		Active:      true,
		CreatedAt:   time.Now(),
	}
	if input.Frequency != nil {
		h.Frequency = *input.Frequency
	}
	if input.TargetCount != nil {
		h.TargetCount = *input.TargetCount
	}
	if input.SortOrder != nil {
		h.SortOrder = *input.SortOrder
	}

	m.habits[m.nextID] = h
	m.nextID++
	return h, nil
}

func (m *MockHabitStore) Update(ctx context.Context, id int64, input model.UpdateHabitInput) (model.Habit, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	h, ok := m.habits[id]
	if !ok {
		return model.Habit{}, ErrNotFound
	}

	if input.Name != nil {
		if *input.Name == "" {
			return model.Habit{}, ErrInvalidInput
		}
		h.Name = *input.Name
	}
	if input.Description != nil {
		h.Description = input.Description
	}
	if input.Frequency != nil {
		h.Frequency = *input.Frequency
	}
	if input.TargetCount != nil {
		h.TargetCount = *input.TargetCount
	}
	if input.HabitGroup != nil {
		h.HabitGroup = input.HabitGroup
	}
	if input.SortOrder != nil {
		h.SortOrder = *input.SortOrder
	}
	if input.Active != nil {
		h.Active = *input.Active
	}

	m.habits[id] = h
	return h, nil
}

func (m *MockHabitStore) Delete(ctx context.Context, id int64) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.habits[id]; !ok {
		return ErrNotFound
	}
	delete(m.habits, id)
	delete(m.completions, id)
	return nil
}

func (m *MockHabitStore) Complete(ctx context.Context, habitID int64, input model.CreateHabitCompletionInput) (model.HabitCompletion, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.habits[habitID]; !ok {
		return model.HabitCompletion{}, ErrNotFound
	}

	value := 1
	if input.Value != nil {
		value = *input.Value
	}

	hc := model.HabitCompletion{
		ID:          m.compID,
		HabitID:     habitID,
		CompletedAt: time.Now(),
		Value:       value,
		Notes:       input.Notes,
	}
	m.completions[habitID] = append(m.completions[habitID], hc)
	m.compID++
	return hc, nil
}

func (m *MockHabitStore) ListCompletions(ctx context.Context, habitID int64, limit, offset int) ([]model.HabitCompletion, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	completions := m.completions[habitID]
	if completions == nil {
		completions = []model.HabitCompletion{}
	}
	return completions, nil
}

func (m *MockHabitStore) ListCompletionsByDate(ctx context.Context, date time.Time) ([]model.HabitCompletion, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	end := start.Add(24 * time.Hour)

	var out []model.HabitCompletion
	for _, list := range m.completions {
		for _, hc := range list {
			if (hc.CompletedAt.Equal(start) || hc.CompletedAt.After(start)) && hc.CompletedAt.Before(end) {
				out = append(out, hc)
			}
		}
	}
	if out == nil {
		out = []model.HabitCompletion{}
	}
	return out, nil
}
