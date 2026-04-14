// Package errors defines the typed error hierarchy and exit codes used across the CLI.
package errors

import (
	"errors"
	"fmt"
)

// Exit codes follow the CLI spec.
const (
	ExitOK        = 0 // success
	ExitUserErr   = 1 // bad flag, validation, 4xx
	ExitServerErr = 2 // 5xx
	ExitNetErr    = 3 // dial / timeout
	ExitConfigErr = 4 // unreadable config or invalid TOML
)

// UserErr indicates a client-side error (invalid input or a 4xx response).
type UserErr struct {
	Msg    string
	Status int // HTTP status if applicable, 0 otherwise
}

// Error returns the user error message.
func (e *UserErr) Error() string {
	if e.Status > 0 {
		return fmt.Sprintf("%s (status %d)", e.Msg, e.Status)
	}
	return e.Msg
}

// ServerErr indicates a server-side 5xx response.
type ServerErr struct {
	Msg    string
	Status int
}

// Error returns the server error message.
func (e *ServerErr) Error() string {
	if e.Status > 0 {
		return fmt.Sprintf("server error: %s (status %d)", e.Msg, e.Status)
	}
	return "server error: " + e.Msg
}

// NetErr indicates a network-level failure (timeout, DNS, refused).
type NetErr struct {
	Err error
}

// Error returns the network error message.
func (e *NetErr) Error() string {
	return "network error: " + e.Err.Error()
}

// Unwrap returns the underlying network error.
func (e *NetErr) Unwrap() error { return e.Err }

// ConfigErr indicates a config-file problem (unreadable, invalid TOML, bad key).
type ConfigErr struct {
	Msg string
	Err error
}

// Error returns the config error message.
func (e *ConfigErr) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("config error: %s: %v", e.Msg, e.Err)
	}
	return "config error: " + e.Msg
}

// Unwrap returns the underlying config error.
func (e *ConfigErr) Unwrap() error { return e.Err }

// Code maps an error to its exit code using the typed hierarchy.
// Nil returns ExitOK. Unknown errors fall back to ExitUserErr.
func Code(err error) int {
	if err == nil {
		return ExitOK
	}
	var ue *UserErr
	if errors.As(err, &ue) {
		return ExitUserErr
	}
	var se *ServerErr
	if errors.As(err, &se) {
		return ExitServerErr
	}
	var ne *NetErr
	if errors.As(err, &ne) {
		return ExitNetErr
	}
	var ce *ConfigErr
	if errors.As(err, &ce) {
		return ExitConfigErr
	}
	return ExitUserErr
}
