package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/model"
	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/store"
)

// TimeHandler handles HTTP requests for time entries.
type TimeHandler struct {
	store store.TimeEntryStore
}

// NewTimeHandler creates a new TimeHandler.
func NewTimeHandler(s store.TimeEntryStore) *TimeHandler {
	return &TimeHandler{store: s}
}

// Routes returns a chi.Router with time entry routes mounted.
func (h *TimeHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Route("/{id}", func(r chi.Router) {
		r.Put("/", h.Update)
		r.Delete("/", h.Delete)
	})
	return r
}

// TimerRoutes returns routes for timer start/stop on tasks.
func (h *TimeHandler) TimerRoutes() chi.Router {
	r := chi.NewRouter()
	r.Post("/timer/start", h.StartTimer)
	r.Post("/timer/stop", h.StopTimer)
	return r
}

func (h *TimeHandler) List(w http.ResponseWriter, r *http.Request) {
	limit := 50
	offset := 0

	var taskID *int64
	if v := r.URL.Query().Get("task_id"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil {
			respondError(w, http.StatusBadRequest, "invalid task_id")
			return
		}
		taskID = &id
	}
	if v := r.URL.Query().Get("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			respondError(w, http.StatusBadRequest, "invalid limit")
			return
		}
		limit = n
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 0 {
			respondError(w, http.StatusBadRequest, "invalid offset")
			return
		}
		offset = n
	}

	result, err := h.store.List(r.Context(), taskID, limit, offset)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list time entries")
		return
	}

	respondList(w, http.StatusOK, result.Items, result.Total, limit, offset)
}

func (h *TimeHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.CreateTimeEntryInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	te, err := h.store.Create(r.Context(), input)
	if err != nil {
		if errors.Is(err, store.ErrInvalidInput) {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to create time entry")
		return
	}

	respondJSON(w, http.StatusCreated, te)
}

func (h *TimeHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid time entry id")
		return
	}

	var input model.UpdateTimeEntryInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	te, err := h.store.Update(r.Context(), id, input)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			respondError(w, http.StatusNotFound, "time entry not found")
			return
		}
		if errors.Is(err, store.ErrInvalidInput) {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to update time entry")
		return
	}

	respondJSON(w, http.StatusOK, te)
}

func (h *TimeHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid time entry id")
		return
	}

	if err := h.store.Delete(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			respondError(w, http.StatusNotFound, "time entry not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to delete time entry")
		return
	}

	respondJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

func (h *TimeHandler) StartTimer(w http.ResponseWriter, r *http.Request) {
	taskIDStr := chi.URLParam(r, "id")
	taskID, err := strconv.ParseInt(taskIDStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid task id")
		return
	}

	te, err := h.store.StartTimer(r.Context(), taskID)
	if err != nil {
		if errors.Is(err, store.ErrRunningTimer) {
			respondError(w, http.StatusConflict, "task already has a running timer")
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to start timer")
		return
	}

	respondJSON(w, http.StatusCreated, te)
}

func (h *TimeHandler) StopTimer(w http.ResponseWriter, r *http.Request) {
	taskIDStr := chi.URLParam(r, "id")
	taskID, err := strconv.ParseInt(taskIDStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid task id")
		return
	}

	te, err := h.store.StopTimer(r.Context(), taskID)
	if err != nil {
		if errors.Is(err, store.ErrNoRunningTimer) {
			respondError(w, http.StatusNotFound, "no running timer for this task")
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to stop timer")
		return
	}

	respondJSON(w, http.StatusOK, te)
}
