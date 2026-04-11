package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/db"
	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/handler"
	"github.com/MiguelAguiarDEV/atlas/apps/api/internal/store"
)


func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Max-Age", "86400")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}

	ctx := context.Background()

	// Connect to database
	pool, err := db.Connect(ctx)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Run migrations
	if err := db.RunMigrations(ctx, pool); err != nil {
		slog.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}

	// Create stores
	taskStore := store.NewPgTaskStore(pool)
	projectStore := store.NewPgProjectStore(pool)
	timeStore := store.NewPgTimeEntryStore(pool)
	habitStore := store.NewPgHabitStore(pool)

	// Create handlers
	taskHandler := handler.NewTaskHandler(taskStore)
	projectHandler := handler.NewProjectHandler(projectStore)
	timeHandler := handler.NewTimeHandler(timeStore)
	habitHandler := handler.NewHabitHandler(habitStore)

	// Setup router
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)
	r.Use(middleware.Heartbeat("/health"))
	r.Use(handler.JSONContentType)

	r.Get("/api/v1/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"service":"atlas","status":"ok","version":"0.1.0"}`)
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Mount("/projects", projectHandler.Routes())
		r.Mount("/time-entries", timeHandler.Routes())
		r.Mount("/habits", habitHandler.Routes())

		// Tasks with timer routes — register timer BEFORE mounting the task handler
		// so the task handler's /{id} routes don't shadow them.
		r.Route("/tasks", func(r chi.Router) {
			r.Get("/", taskHandler.List)
			r.Post("/", taskHandler.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", taskHandler.GetByID)
				r.Put("/", taskHandler.Update)
				r.Delete("/", taskHandler.Delete)
				r.Post("/events", taskHandler.CreateEvent)
				r.Get("/events", taskHandler.ListEvents)
				r.Post("/timer/start", timeHandler.StartTimer)
				r.Post("/timer/stop", timeHandler.StopTimer)
			})
		})
	})

	slog.Info("atlas API starting", "port", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
}
