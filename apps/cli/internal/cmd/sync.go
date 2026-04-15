package cmd

import (
	"fmt"
	"time"

	"github.com/spf13/cobra"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/cache"
	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/client"
	clierr "github.com/MiguelAguiarDEV/atlas/apps/cli/internal/errors"
)

// newSyncCmd replays the pending mutation queue and refreshes cached entities.
func newSyncCmd() *cobra.Command {
	var retryFailed bool
	cmd := &cobra.Command{
		Use:   "sync",
		Short: "Drain the offline queue and refresh the local cache",
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			if c.Cache == nil {
				return &clierr.UserErr{Msg: "sync requires the local cache (remove --no-cache)"}
			}
			if retryFailed {
				if err := c.Cache.RetryFailed(); err != nil {
					return err
				}
			}

			ctx := cmd.Context()

			before := c.Cache.PendingCount()
			res, err := c.Cache.DrainOnce(ctx, c.Client)
			if err != nil {
				return err
			}
			fmt.Fprintf(cmd.OutOrStdout(),
				"drain: processed=%d done=%d failed=%d skipped=%d pending_before=%d pending_after=%d\n",
				res.Done+res.Failed, res.Done, res.Failed, res.Skipped,
				before, c.Cache.PendingCount(),
			)

			// Refresh caches from server.
			refresh := func(label string, fn func() error) {
				if err := fn(); err != nil {
					fmt.Fprintf(cmd.OutOrStdout(), "refresh %s: %v\n", label, err)
					return
				}
				fmt.Fprintf(cmd.OutOrStdout(), "refresh %s: ok\n", label)
			}
			refresh("tasks", func() error {
				tasks, err := c.Client.ListAllTasks(ctx, client.TaskFilter{})
				if err != nil {
					return err
				}
				return c.Cache.PutTasks(tasks, true)
			})
			refresh("projects", func() error {
				projects, _, err := c.Client.ListProjects(ctx, client.ProjectFilter{Limit: 500})
				if err != nil {
					return err
				}
				return c.Cache.PutProjects(projects, true)
			})
			refresh("habits", func() error {
				habits, _, err := c.Client.ListHabits(ctx, client.HabitFilter{Limit: 500})
				if err != nil {
					return err
				}
				return c.Cache.PutHabits(habits, true)
			})
			refresh("time_entries", func() error {
				entries, _, err := c.Client.ListTimeEntries(ctx, client.TimeFilter{Limit: 500})
				if err != nil {
					return err
				}
				return c.Cache.PutTimeEntries(entries, true)
			})

			_ = c.Cache.SetLastSync(time.Now().UTC().Format(time.RFC3339))
			return nil
		},
	}
	cmd.Flags().BoolVar(&retryFailed, "retry-failed", false, "reset attempts on poisoned queue rows before draining")

	// Enforce package import even when sync.go is the only file referencing cache.
	_ = cache.SchemaVersion
	return cmd
}
