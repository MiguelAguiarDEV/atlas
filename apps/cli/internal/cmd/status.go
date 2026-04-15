package cmd

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/render"
)

func newStatusCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "status",
		Short: "Check API health and local cache status",
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			info, err := c.Client.Status(cmd.Context())
			// Attach cache stats even if the API is unreachable.
			if info == nil {
				info = map[string]any{}
			}
			if c.Cache != nil {
				info["pending_mutations"] = c.Cache.PendingCount()
				if last, e := c.Cache.LastSync(); e == nil && last != "" {
					info["last_sync"] = last
				}
			}
			if err != nil {
				// If we have cache data, surface both the API error and stats in
				// --json mode; in table mode, print what we know then return err.
				if c.JSON {
					info["error"] = err.Error()
					return render.JSONEnvelope(cmd.OutOrStdout(), render.Envelope{Data: info})
				}
				for k, v := range info {
					fmt.Fprintf(cmd.OutOrStdout(), "%-20s %v\n", k+":", v)
				}
				return err
			}
			if c.JSON {
				return render.JSONEnvelope(cmd.OutOrStdout(), render.Envelope{Data: info})
			}
			for k, v := range info {
				fmt.Fprintf(cmd.OutOrStdout(), "%-20s %v\n", k+":", v)
			}
			return nil
		},
	}
}
