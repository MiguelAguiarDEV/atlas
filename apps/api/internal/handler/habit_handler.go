package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/model"
	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/store"
)

// HabitHandler handles HTTP requests for habits.
type HabitHandler struct {
	store store.HabitStore
}

// NewHabitHandler creates a new HabitHandler.
func NewHabitHandler(s store.HabitStore) *HabitHandler {
	return &HabitHandler{store: s}
}

// Routes returns a chi.Router with habit routes mounted.
func (h *HabitHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	// Collection-level completions endpoint, used by the Today page to fetch
	// ALL habit completions for a given date in a single request.
	// Must be registered BEFORE the /{id} route so chi doesn't treat
	// "completions" as a habit id.
	r.Get("/completions", h.ListCompletionsByDate)
	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", h.GetByID)
		r.Put("/", h.Update)
		r.Delete("/", h.Delete)
		r.Post("/complete", h.Complete)
		r.Get("/completions", h.ListCompletions)
	})
	return r
}

func (h *HabitHandler) List(w http.ResponseWriter, r *http.Request) {
	limit := 50
	offset := 0

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

	result, err := h.store.List(r.Context(), limit, offset)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list habits")
		return
	}

	respondList(w, http.StatusOK, result.Items, result.Total, limit, offset)
}

func (h *HabitHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid habit id")
		return
	}

	habit, err := h.store.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			respondError(w, http.StatusNotFound, "habit not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to get habit")
		return
	}

	respondJSON(w, http.StatusOK, habit)
}

func (h *HabitHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.CreateHabitInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	habit, err := h.store.Create(r.Context(), input)
	if err != nil {
		if errors.Is(err, store.ErrInvalidInput) {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to create habit")
		return
	}

	respondJSON(w, http.StatusCreated, habit)
}

func (h *HabitHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid habit id")
		return
	}

	var input model.UpdateHabitInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	habit, err := h.store.Update(r.Context(), id, input)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			respondError(w, http.StatusNotFound, "habit not found")
			return
		}
		if errors.Is(err, store.ErrInvalidInput) {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to update habit")
		return
	}

	respondJSON(w, http.StatusOK, habit)
}

func (h *HabitHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid habit id")
		return
	}

	if err := h.store.Delete(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			respondError(w, http.StatusNotFound, "habit not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to delete habit")
		return
	}

	respondJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

func (h *HabitHandler) Complete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid habit id")
		return
	}

	var input model.CreateHabitCompletionInput
	// Allow empty body (defaults to value=1)
	json.NewDecoder(r.Body).Decode(&input)

	completion, err := h.store.Complete(r.Context(), id, input)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			respondError(w, http.StatusNotFound, "habit not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to record completion")
		return
	}

	respondJSON(w, http.StatusCreated, completion)
}

func (h *HabitHandler) ListCompletions(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid habit id")
		return
	}

	limit := 50
	offset := 0
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

	completions, err := h.store.ListCompletions(r.Context(), id, limit, offset)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list completions")
		return
	}

	respondJSON(w, http.StatusOK, completions)
}

// ListCompletionsByDate handles GET /api/v1/habits/completions?date=YYYY-MM-DD.
// If `date` is omitted or "today", returns completions for the server's
// current local day. This lets the Today page render "done today" state
// with a single request.
func (h *HabitHandler) ListCompletionsByDate(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("date")
	var date time.Time
	if q == "" || q == "today" {
		date = time.Now()
	} else {
		d, err := time.Parse("2006-01-02", q)
		if err != nil {
			respondError(w, http.StatusBadRequest, "invalid date format (expected YYYY-MM-DD)")
			return
		}
		date = d
	}

	completions, err := h.store.ListCompletionsByDate(r.Context(), date)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list completions")
		return
	}
	respondJSON(w, http.StatusOK, completions)
}
