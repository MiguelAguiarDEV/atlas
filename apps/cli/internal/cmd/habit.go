package cmd

import (
	"fmt"
	"strconv"
	"time"

	"github.com/spf13/cobra"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/client"
	clierr "github.com/MiguelAguiarDEV/atlas/apps/cli/internal/errors"
	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/render"
)

func newHabitCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "habits",
		Aliases: []string{"habit", "h"},
		Short:   "Track habits",
	}
	cmd.AddCommand(newHabitListCmd())
	cmd.AddCommand(newHabitAddCmd())
	cmd.AddCommand(newHabitCheckCmd())
	cmd.AddCommand(newHabitStreakCmd())
	cmd.AddCommand(newHabitRmCmd())
	return cmd
}

func newHabitListCmd() *cobra.Command {
	var activeOnly bool
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List habits",
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			filter := client.HabitFilter{}
			if cmd.Flags().Changed("active") {
				filter.Active = &activeOnly
			}
			habits, meta, err := c.Client.ListHabits(cmd.Context(), filter)
			if err != nil {
				return err
			}
			if c.JSON {
				env := render.Envelope{Data: habits}
				if meta != nil {
					env.Meta = &render.Meta{Total: meta.Total, Limit: meta.Limit, Offset: meta.Offset}
				}
				return render.JSONEnvelope(cmd.OutOrStdout(), env)
			}
			render.Habits(cmd.OutOrStdout(), habits)
			return nil
		},
	}
	cmd.Flags().BoolVar(&activeOnly, "active", true, "only active habits (pass --active=false to include inactive)")
	return cmd
}

func newHabitAddCmd() *cobra.Command {
	var (
		name, description, frequency, group string
		target                              int
	)
	cmd := &cobra.Command{
		Use:   "add <name>",
		Short: "Create a habit",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			name = args[0]
			input := model.CreateHabitInput{Name: name}
			if description != "" {
				input.Description = &description
			}
			if frequency != "" {
				input.Frequency = &frequency
			}
			if group != "" {
				input.HabitGroup = &group
			}
			if target > 0 {
				input.TargetCount = &target
			}
			h, err := c.Client.CreateHabit(cmd.Context(), input)
			if err != nil {
				return err
			}
			return printHabit(cmd, c, h)
		},
	}
	cmd.Flags().StringVar(&description, "description", "", "description")
	cmd.Flags().StringVar(&frequency, "frequency", "", "daily|weekly|monthly")
	cmd.Flags().StringVar(&group, "group", "", "habit group")
	cmd.Flags().IntVar(&target, "target", 0, "target count per period")
	return cmd
}

func newHabitCheckCmd() *cobra.Command {
	var (
		value int
		notes string
	)
	cmd := &cobra.Command{
		Use:   "check <id>",
		Short: "Record a habit completion",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			id, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil {
				return &clierr.UserErr{Msg: "invalid habit id"}
			}
			input := model.CreateHabitCompletionInput{}
			if cmd.Flags().Changed("value") {
				v := value
				input.Value = &v
			}
			if notes != "" {
				input.Notes = &notes
			}
			completion, err := c.Client.CompleteHabit(cmd.Context(), id, input)
			if err != nil {
				return err
			}
			if c.JSON {
				return render.JSONEnvelope(cmd.OutOrStdout(), render.Envelope{Data: completion})
			}
			fmt.Fprintf(cmd.OutOrStdout(), "checked habit %d at %s (value=%d)\n",
				completion.HabitID,
				completion.CompletedAt.Local().Format("2006-01-02 15:04"),
				completion.Value)
			return nil
		},
	}
	cmd.Flags().IntVar(&value, "value", 0, "numeric value for quantified habits")
	cmd.Flags().StringVar(&notes, "notes", "", "optional notes")
	return cmd
}

func newHabitStreakCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "streak <id>",
		Short: "Compute current and longest streak (client-side)",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			id, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil {
				return &clierr.UserErr{Msg: "invalid habit id"}
			}
			completions, err := c.Client.ListHabitCompletions(cmd.Context(), id, nil, nil)
			if err != nil {
				return err
			}
			current, longest := ComputeStreak(completions, time.Now())

			out := struct {
				HabitID        int64 `json:"habit_id"`
				CurrentStreak  int   `json:"current_streak"`
				LongestStreak  int   `json:"longest_streak"`
				CompletionsSet int   `json:"completions"`
			}{id, current, longest, len(completions)}

			if c.JSON {
				return render.JSONEnvelope(cmd.OutOrStdout(), render.Envelope{Data: out})
			}
			fmt.Fprintf(cmd.OutOrStdout(), "habit %d: current_streak=%d, longest_streak=%d (%d completions)\n",
				out.HabitID, out.CurrentStreak, out.LongestStreak, out.CompletionsSet)
			return nil
		},
	}
}

func newHabitRmCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "rm <id>",
		Short: "Delete a habit",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			id, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil {
				return &clierr.UserErr{Msg: "invalid habit id"}
			}
			if err := c.Client.DeleteHabit(cmd.Context(), id); err != nil {
				return err
			}
			fmt.Fprintf(cmd.OutOrStdout(), "deleted habit %d\n", id)
			return nil
		},
	}
}

func printHabit(cmd *cobra.Command, c *Context, h *model.Habit) error {
	if c.JSON {
		return render.JSONEnvelope(cmd.OutOrStdout(), render.Envelope{Data: h})
	}
	render.Habits(cmd.OutOrStdout(), []model.Habit{*h})
	return nil
}

// ComputeStreak returns (current, longest) for the given completions.
// A "day" is a calendar day in the local timezone. Current streak counts
// consecutive days ending today (or yesterday if today has no event — the
// streak is not considered broken until a full calendar day passes with no
// event, matching common habit-tracker conventions).
func ComputeStreak(completions []model.HabitCompletion, now time.Time) (current, longest int) {
	if len(completions) == 0 {
		return 0, 0
	}
	days := make(map[string]struct{}, len(completions))
	dayKey := func(t time.Time) string { return t.Local().Format("2006-01-02") }
	for _, c := range completions {
		days[dayKey(c.CompletedAt)] = struct{}{}
	}

	// Longest streak: scan sorted unique days.
	dates := make([]time.Time, 0, len(days))
	for k := range days {
		t, _ := time.ParseInLocation("2006-01-02", k, now.Location())
		dates = append(dates, t)
	}
	// Simple insertion sort (n is small).
	for i := 1; i < len(dates); i++ {
		for j := i; j > 0 && dates[j].Before(dates[j-1]); j-- {
			dates[j], dates[j-1] = dates[j-1], dates[j]
		}
	}

	best := 1
	cur := 1
	for i := 1; i < len(dates); i++ {
		if dates[i].Sub(dates[i-1]) == 24*time.Hour {
			cur++
			if cur > best {
				best = cur
			}
		} else {
			cur = 1
		}
	}
	longest = best

	// Current streak: starting from today walk backwards while each day has an event.
	today := now.Local()
	y, m, d := today.Date()
	cursor := time.Date(y, m, d, 0, 0, 0, 0, today.Location())
	// If today has no event, allow starting from yesterday (avoid premature break).
	if _, ok := days[dayKey(cursor)]; !ok {
		cursor = cursor.Add(-24 * time.Hour)
	}
	for {
		if _, ok := days[dayKey(cursor)]; !ok {
			break
		}
		current++
		cursor = cursor.Add(-24 * time.Hour)
	}
	return current, longest
}
