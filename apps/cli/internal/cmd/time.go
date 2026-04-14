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

func newTimeCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "time",
		Short: "Track time",
	}
	cmd.AddCommand(newTimeStartCmd())
	cmd.AddCommand(newTimeStopCmd())
	cmd.AddCommand(newTimeListCmd())
	cmd.AddCommand(newTimeAddCmd())
	cmd.AddCommand(newTimeRmCmd())
	return cmd
}

func newTimeStartCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "start <task-id>",
		Short: "Start a timer on a task",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			id, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil {
				return &clierr.UserErr{Msg: "invalid task id"}
			}
			entry, err := c.Client.StartTimer(cmd.Context(), id)
			if err != nil {
				return err
			}
			return printTimeEntry(cmd, c, entry)
		},
	}
}

func newTimeStopCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "stop",
		Short: "Stop the currently active timer",
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			ctx := cmd.Context()
			active := true
			entries, _, err := c.Client.ListTimeEntries(ctx, client.TimeFilter{Active: &active})
			if err != nil {
				return err
			}
			if len(entries) == 0 {
				return &clierr.UserErr{Msg: "no active timer"}
			}
			if entries[0].TaskID == nil {
				return &clierr.UserErr{Msg: "active entry has no task id; cannot stop"}
			}
			entry, err := c.Client.StopTimer(ctx, *entries[0].TaskID)
			if err != nil {
				return err
			}
			return printTimeEntry(cmd, c, entry)
		},
	}
}

func newTimeListCmd() *cobra.Command {
	var (
		today         bool
		taskID        int64
		from, to      string
		limit, offset int
	)
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List time entries",
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			filter := client.TimeFilter{Limit: limit, Offset: offset}
			if taskID > 0 {
				filter.TaskID = &taskID
			}
			now := time.Now()
			if today {
				m := render.LocalMidnight(now)
				filter.From = &m
			} else {
				if from != "" {
					t, err := render.ParseDue(from, now)
					if err != nil {
						return &clierr.UserErr{Msg: err.Error()}
					}
					filter.From = &t
				}
				if to != "" {
					t, err := render.ParseDue(to, now)
					if err != nil {
						return &clierr.UserErr{Msg: err.Error()}
					}
					filter.To = &t
				}
			}
			entries, meta, err := c.Client.ListTimeEntries(cmd.Context(), filter)
			if err != nil {
				return err
			}
			if c.JSON {
				env := render.Envelope{Data: entries}
				if meta != nil {
					env.Meta = &render.Meta{Total: meta.Total, Limit: meta.Limit, Offset: meta.Offset}
				}
				return render.JSONEnvelope(cmd.OutOrStdout(), env)
			}
			render.TimeEntries(cmd.OutOrStdout(), entries, c.Config.DateFormat)
			return nil
		},
	}
	cmd.Flags().BoolVar(&today, "today", false, "only entries started since local midnight")
	cmd.Flags().Int64Var(&taskID, "task", 0, "filter by task id")
	cmd.Flags().StringVar(&from, "from", "", "start of time window")
	cmd.Flags().StringVar(&to, "to", "", "end of time window")
	cmd.Flags().IntVar(&limit, "limit", 0, "page size")
	cmd.Flags().IntVar(&offset, "offset", 0, "page offset")
	return cmd
}

func newTimeAddCmd() *cobra.Command {
	var (
		taskID        int64
		started, notes string
		mins          int
	)
	cmd := &cobra.Command{
		Use:   "add",
		Short: "Manually record a time entry",
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			if started == "" {
				return &clierr.UserErr{Msg: "--started is required"}
			}
			t, err := render.ParseDue(started, time.Now())
			if err != nil {
				return &clierr.UserErr{Msg: err.Error()}
			}
			input := model.CreateTimeEntryInput{StartedAt: render.RFC3339UTC(t)}
			if taskID > 0 {
				input.TaskID = &taskID
			}
			if mins > 0 {
				secs := mins * 60
				input.DurationSecs = &secs
			}
			if notes != "" {
				input.Notes = &notes
			}
			entry, err := c.Client.CreateTimeEntry(cmd.Context(), input)
			if err != nil {
				return err
			}
			return printTimeEntry(cmd, c, entry)
		},
	}
	cmd.Flags().Int64Var(&taskID, "task", 0, "task id")
	cmd.Flags().StringVar(&started, "started", "", "start time (required)")
	cmd.Flags().IntVar(&mins, "mins", 0, "duration in minutes")
	cmd.Flags().StringVar(&notes, "notes", "", "optional notes")
	return cmd
}

func newTimeRmCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "rm <id>",
		Short: "Delete a time entry",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			id, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil {
				return &clierr.UserErr{Msg: "invalid id"}
			}
			if err := c.Client.DeleteTimeEntry(cmd.Context(), id); err != nil {
				return err
			}
			fmt.Fprintf(cmd.OutOrStdout(), "deleted time entry %d\n", id)
			return nil
		},
	}
}
