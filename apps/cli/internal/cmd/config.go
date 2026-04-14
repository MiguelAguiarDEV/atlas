package cmd

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/config"
	clierr "github.com/MiguelAguiarDEV/atlas/apps/cli/internal/errors"
)

func newConfigCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "config",
		Short: "View or edit the CLI config file",
	}
	cmd.AddCommand(newConfigPathCmd())
	cmd.AddCommand(newConfigGetCmd())
	cmd.AddCommand(newConfigSetCmd())
	return cmd
}

func newConfigPathCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "path",
		Short: "Print the resolved config file path",
		RunE: func(cmd *cobra.Command, args []string) error {
			path, _ := cmd.Flags().GetString("config")
			if path == "" {
				path = config.DefaultPath()
			}
			fmt.Fprintln(cmd.OutOrStdout(), path)
			return nil
		},
	}
}

func newConfigGetCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "get <key>",
		Short: "Print the value of a config key",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			key := args[0]
			path, _ := cmd.Flags().GetString("config")
			v := config.New(path)
			if _, err := config.Load(v); err != nil {
				return err
			}
			fmt.Fprintln(cmd.OutOrStdout(), config.Get(v, key))
			return nil
		},
	}
}

func newConfigSetCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "set <key> <value>",
		Short: "Set a config key and write the file (mode 0600)",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			path, _ := cmd.Flags().GetString("config")
			if err := config.Set(path, args[0], args[1]); err != nil {
				return err
			}
			fmt.Fprintf(cmd.OutOrStdout(), "set %s=%s\n", args[0], args[1])
			return nil
		},
	}
}

// Ensure UserErr import is used (for consistency with other cmd files).
var _ = clierr.UserErr{}
