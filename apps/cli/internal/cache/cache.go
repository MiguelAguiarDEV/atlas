// Package cache provides an offline-first SQLite cache and sync queue for the
// atlas CLI. It mirrors the server entities (tasks, projects, time_entries,
// habits) in a local SQLite database and buffers mutations while offline so
// they can be replayed on the next connection.
//
// The cache is intentionally minimal for v0.2:
//   - One row per entity keyed by server ID (negative IDs for temp local rows
//     awaiting a POST ack).
//   - A single append-only sync_queue FIFO of pending mutations.
//   - Optimistic conflict handling: server wins, failures surface via
//     `atlas sync`.
//
// CGO is not used: the driver is `modernc.org/sqlite`.
package cache

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	_ "modernc.org/sqlite"
)

// SchemaVersion is the current cache schema version. Bump this when the DDL
// below changes and handle migrations in applyMigrations.
const SchemaVersion = 1

// Cache is a handle on the local SQLite cache database.
//
// Zero value is not usable; call Open.
type Cache struct {
	db *sql.DB
	mu sync.Mutex // guards temp-ID allocator
}

// Open opens (or creates) the cache database at the given path. Missing parent
// directories are created with mode 0700; the database file is created with the
// SQLite default and we chmod it to 0600 post-open to match the config file's
// posture.
func Open(path string) (*Cache, error) {
	if path == "" {
		return nil, fmt.Errorf("cache.Open: empty path")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return nil, fmt.Errorf("cache.Open: mkdir: %w", err)
	}

	// modernc.org/sqlite DSN: file path plus pragma hints for sane defaults.
	dsn := path + "?_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("cache.Open: sql.Open: %w", err)
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("cache.Open: ping: %w", err)
	}

	// Best-effort 0600 on the file itself (may not exist yet pre-schema).
	_ = os.Chmod(path, 0o600)

	c := &Cache{db: db}
	if err := c.applyMigrations(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return c, nil
}

// Close releases the underlying database handle.
func (c *Cache) Close() error {
	if c == nil || c.db == nil {
		return nil
	}
	return c.db.Close()
}

// DefaultPath returns the default cache database path under XDG_DATA_HOME
// (falling back to ~/.local/share/atlas/cache.db).
func DefaultPath() string {
	if xdg := os.Getenv("XDG_DATA_HOME"); xdg != "" {
		return filepath.Join(xdg, "atlas", "cache.db")
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return filepath.Join(".", ".atlas", "cache.db")
	}
	return filepath.Join(home, ".local", "share", "atlas", "cache.db")
}

// applyMigrations is idempotent: it creates the schema if missing, and records
// the current SchemaVersion. Future migrations branch on the recorded value.
func (c *Cache) applyMigrations() error {
	tx, err := c.db.Begin()
	if err != nil {
		return fmt.Errorf("cache: begin migration: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	stmts := []string{
		`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS tasks (
			id INTEGER PRIMARY KEY,
			data TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			dirty INTEGER NOT NULL DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS projects (
			id INTEGER PRIMARY KEY,
			data TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			dirty INTEGER NOT NULL DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS time_entries (
			id INTEGER PRIMARY KEY,
			data TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			dirty INTEGER NOT NULL DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS habits (
			id INTEGER PRIMARY KEY,
			data TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			dirty INTEGER NOT NULL DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS sync_queue (
			seq INTEGER PRIMARY KEY AUTOINCREMENT,
			entity TEXT NOT NULL,
			verb TEXT NOT NULL,
			local_id INTEGER,
			server_id INTEGER,
			payload TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			attempted_at TEXT,
			attempts INTEGER NOT NULL DEFAULT 0,
			error TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS meta (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		)`,
	}
	for _, s := range stmts {
		if _, err := tx.Exec(s); err != nil {
			return fmt.Errorf("cache: migrate: %w", err)
		}
	}

	// Seed/upgrade schema_version.
	var current int
	row := tx.QueryRow(`SELECT version FROM schema_version LIMIT 1`)
	if err := row.Scan(&current); err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("cache: read schema version: %w", err)
		}
		if _, err := tx.Exec(`INSERT INTO schema_version(version) VALUES (?)`, SchemaVersion); err != nil {
			return fmt.Errorf("cache: seed schema version: %w", err)
		}
	} else if current < SchemaVersion {
		if _, err := tx.Exec(`UPDATE schema_version SET version = ?`, SchemaVersion); err != nil {
			return fmt.Errorf("cache: update schema version: %w", err)
		}
	}

	return tx.Commit()
}

// nextTempID allocates the next negative ID used for local rows awaiting their
// real server ID. Stored in meta so it survives restarts. Monotonically
// decreasing: -1, -2, -3, ...
func (c *Cache) nextTempID(tx *sql.Tx) (int64, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	var raw string
	err := tx.QueryRow(`SELECT value FROM meta WHERE key = 'temp_id_counter'`).Scan(&raw)
	var next int64 = -1
	if err == nil {
		// counter was last value used, go one more negative
		var v int64
		if _, err := fmt.Sscanf(raw, "%d", &v); err == nil {
			next = v - 1
		}
	} else if !errors.Is(err, sql.ErrNoRows) {
		return 0, fmt.Errorf("cache: read temp id: %w", err)
	}
	if _, err := tx.Exec(
		`INSERT INTO meta(key, value) VALUES ('temp_id_counter', ?)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		fmt.Sprintf("%d", next),
	); err != nil {
		return 0, fmt.Errorf("cache: write temp id: %w", err)
	}
	return next, nil
}

// setMeta writes a key=value pair to the meta table.
func (c *Cache) setMeta(key, value string) error {
	_, err := c.db.Exec(
		`INSERT INTO meta(key, value) VALUES (?, ?)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		key, value,
	)
	return err
}

// getMeta reads a key from the meta table; returns "" if missing.
func (c *Cache) getMeta(key string) (string, error) {
	var v string
	err := c.db.QueryRow(`SELECT value FROM meta WHERE key = ?`, key).Scan(&v)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	return v, err
}

// SetLastSync records the last successful full-sync timestamp (RFC3339 UTC).
func (c *Cache) SetLastSync(ts string) error { return c.setMeta("last_sync", ts) }

// LastSync returns the last-sync timestamp, or "" if never synced.
func (c *Cache) LastSync() (string, error) { return c.getMeta("last_sync") }
