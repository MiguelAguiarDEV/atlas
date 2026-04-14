package errors

import (
	"errors"
	"testing"
)

func TestCode(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want int
	}{
		{"nil error maps to ok", nil, ExitOK},
		{"user error", &UserErr{Msg: "bad"}, ExitUserErr},
		{"server error", &ServerErr{Msg: "boom"}, ExitServerErr},
		{"net error", &NetErr{Err: errors.New("refused")}, ExitNetErr},
		{"config error", &ConfigErr{Msg: "bad toml"}, ExitConfigErr},
		{"wrapped user error", wrap(&UserErr{Msg: "x"}), ExitUserErr},
		{"unknown falls back to user", errors.New("whatever"), ExitUserErr},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Code(tt.err); got != tt.want {
				t.Errorf("Code() = %d, want %d", got, tt.want)
			}
		})
	}
}

func wrap(err error) error { return &wrapped{err} }

type wrapped struct{ err error }

func (w *wrapped) Error() string { return "wrapped: " + w.err.Error() }
func (w *wrapped) Unwrap() error { return w.err }
