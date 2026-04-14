package cmd

import (
	"testing"
	"time"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
)

func TestComputeStreak(t *testing.T) {
	// "now" is noon UTC on 2026-04-14 (a Tuesday).
	now := time.Date(2026, 4, 14, 10, 0, 0, 0, time.UTC)

	mk := func(day int) model.HabitCompletion {
		return model.HabitCompletion{
			CompletedAt: time.Date(2026, 4, day, 8, 0, 0, 0, time.UTC),
		}
	}

	tests := []struct {
		name        string
		completions []model.HabitCompletion
		wantCurrent int
		wantLongest int
	}{
		{"empty", nil, 0, 0},
		{"single-today", []model.HabitCompletion{mk(14)}, 1, 1},
		{"three-in-a-row", []model.HabitCompletion{mk(12), mk(13), mk(14)}, 3, 3},
		{"gap-in-middle", []model.HabitCompletion{mk(10), mk(12), mk(13), mk(14)}, 3, 3},
		{"only-old-broken", []model.HabitCompletion{mk(1), mk(2), mk(3)}, 0, 3},
		{"yesterday-not-broken", []model.HabitCompletion{mk(13)}, 1, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cur, long := ComputeStreak(tt.completions, now)
			if cur != tt.wantCurrent || long != tt.wantLongest {
				t.Errorf("got (cur=%d, long=%d), want (%d, %d)", cur, long, tt.wantCurrent, tt.wantLongest)
			}
		})
	}
}
