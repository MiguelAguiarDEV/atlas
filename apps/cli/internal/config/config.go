// Package config manages the atlas CLI configuration: precedence resolution
// (flag > env > file > default), file I/O with secure permissions, and helpers
// for viewing/updating values.
package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/viper"

	clierr "github.com/MiguelAguiarDEV/atlas/apps/cli/internal/errors"
)

// DefaultServer is the fallback API base URL when nothing else is set.
const DefaultServer = "http://100.71.66.54:4000"

// DefaultTimeout is the default HTTP request timeout.
const DefaultTimeout = 10 * time.Second

// EnvPrefix is prepended to all environment variables (ATLAS_SERVER, ATLAS_TOKEN, ...).
const EnvPrefix = "ATLAS"

// Config holds resolved CLI configuration.
type Config struct {
	Server         string
	Token          string
	Timeout        time.Duration
	DefaultProject int64
	DateFormat     string // "friendly" | "rfc3339"
	Verbose        bool
	JSON           bool
	NoColor        bool
	AllPages       bool
}

// DefaultPath returns the resolved default config path following XDG_CONFIG_HOME.
func DefaultPath() string {
	if xdg := os.Getenv("XDG_CONFIG_HOME"); xdg != "" {
		return filepath.Join(xdg, "atlas", "config.toml")
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return filepath.Join(".", ".atlas", "config.toml")
	}
	return filepath.Join(home, ".config", "atlas", "config.toml")
}

// New returns a viper instance pre-wired with defaults, env bindings, and the
// provided config file path (or DefaultPath when empty).
func New(path string) *viper.Viper {
	v := viper.New()
	v.SetDefault("server", DefaultServer)
	v.SetDefault("token", "")
	v.SetDefault("timeout_seconds", int(DefaultTimeout.Seconds()))
	v.SetDefault("default_project_id", 0)
	v.SetDefault("date_format", "friendly")

	v.SetEnvPrefix(EnvPrefix)
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_", "-", "_"))
	v.AutomaticEnv()

	if path == "" {
		path = DefaultPath()
	}
	v.SetConfigFile(path)
	v.SetConfigType("toml")
	return v
}

// Load reads the config file (if present) and returns the resolved Config.
// Missing files are non-fatal; invalid TOML returns a ConfigErr.
func Load(v *viper.Viper) (*Config, error) {
	if err := v.ReadInConfig(); err != nil {
		var notFound viper.ConfigFileNotFoundError
		if !errors.As(err, &notFound) {
			// Check plain os.IsNotExist too (SetConfigFile path).
			if !os.IsNotExist(errors.Unwrap(err)) && !os.IsNotExist(err) {
				return nil, &clierr.ConfigErr{Msg: "failed to read config", Err: err}
			}
		}
	}
	timeoutSecs := v.GetInt("timeout_seconds")
	if timeoutSecs <= 0 {
		timeoutSecs = int(DefaultTimeout.Seconds())
	}
	return &Config{
		Server:         v.GetString("server"),
		Token:          v.GetString("token"),
		Timeout:        time.Duration(timeoutSecs) * time.Second,
		DefaultProject: v.GetInt64("default_project_id"),
		DateFormat:     v.GetString("date_format"),
	}, nil
}

// Set writes key=value to the config file, ensuring mode 0600 and parent 0700.
// Valid keys: server, token, timeout_seconds, default_project_id, date_format.
func Set(path, key, value string) error {
	if path == "" {
		path = DefaultPath()
	}
	v := viper.New()
	v.SetConfigFile(path)
	v.SetConfigType("toml")
	_ = v.ReadInConfig() // ignore missing

	key = strings.ToLower(strings.TrimSpace(key))
	switch key {
	case "server", "token", "date_format":
		v.Set(key, value)
	case "timeout_seconds", "default_project_id":
		// viper handles conversion when reading.
		v.Set(key, value)
	default:
		return &clierr.UserErr{Msg: fmt.Sprintf("unknown config key %q", key)}
	}

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return &clierr.ConfigErr{Msg: "failed to create config dir", Err: err}
	}
	// WriteConfigAs creates the file with default permissions; we enforce 0600 after.
	if err := v.WriteConfigAs(path); err != nil {
		return &clierr.ConfigErr{Msg: "failed to write config", Err: err}
	}
	if err := os.Chmod(path, 0o600); err != nil {
		return &clierr.ConfigErr{Msg: "failed to chmod config", Err: err}
	}
	return nil
}

// Get returns the value of a single key from the loaded config (or empty string).
func Get(v *viper.Viper, key string) string {
	return fmt.Sprintf("%v", v.Get(key))
}
