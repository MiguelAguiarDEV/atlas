package cmd

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/render"
)

func newStatusCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "status",
		Short: "Check API health",
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			info, err := c.Client.Status(cmd.Context())
			if err != nil {
				return err
			}
			if c.JSON {
				return render.JSONEnvelope(cmd.OutOrStdout(), render.Envelope{Data: info})
			}
			for k, v := range info {
				fmt.Fprintf(cmd.OutOrStdout(), "%-10s %v\n", k+":", v)
			}
			return nil
		},
	}
}
