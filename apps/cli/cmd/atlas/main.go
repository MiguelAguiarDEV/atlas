// Package main is the entrypoint for the atlas CLI.
package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

// version is overridden at build time via -ldflags.
var version = "dev"

func main() {
	root := &cobra.Command{
		Use:           "atlas",
		Short:         "atlas CLI — fast command-line access to the atlas API",
		SilenceUsage:  true,
		SilenceErrors: true,
		Version:       version,
		RunE: func(cmd *cobra.Command, args []string) error {
			return cmd.Help()
		},
	}

	if err := root.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}
