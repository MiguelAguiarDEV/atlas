package cmd

import "github.com/spf13/cobra"

// addOptional appends the passed commands to root. Exists to keep the
// root wiring stable across commits; the non-task subtrees are introduced
// incrementally.
func addOptional(root *cobra.Command, cmds ...*cobra.Command) {
	for _, c := range cmds {
		if c == nil {
			continue
		}
		root.AddCommand(c)
	}
}

// extraCommands returns the list of subcommands (time, projects, habits,
// config, status) introduced in the group-5 commit. This placeholder is
// overridden in extra_wire.go when those subcommands land.
func extraCommands() []*cobra.Command { return nil }
