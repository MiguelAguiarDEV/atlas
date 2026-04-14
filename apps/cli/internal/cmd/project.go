package cmd

import (
	"fmt"
	"strconv"

	"github.com/spf13/cobra"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/client"
	clierr "github.com/MiguelAguiarDEV/atlas/apps/cli/internal/errors"
	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/render"
)

func newProjectCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "projects",
		Aliases: []string{"project", "p"},
		Short:   "Manage projects",
	}
	cmd.AddCommand(newProjectListCmd())
	cmd.AddCommand(newProjectAddCmd())
	cmd.AddCommand(newProjectGetCmd())
	cmd.AddCommand(newProjectEditCmd())
	cmd.AddCommand(newProjectArchiveCmd())
	cmd.AddCommand(newProjectRmCmd())
	return cmd
}

func newProjectListCmd() *cobra.Command {
	var (
		status, area  string
		limit, offset int
	)
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List projects",
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			projects, meta, err := c.Client.ListProjects(cmd.Context(), client.ProjectFilter{
				Status: status, Area: area, Limit: limit, Offset: offset,
			})
			if err != nil {
				return err
			}
			if c.JSON {
				env := render.Envelope{Data: projects}
				if meta != nil {
					env.Meta = &render.Meta{Total: meta.Total, Limit: meta.Limit, Offset: meta.Offset}
				}
				return render.JSONEnvelope(cmd.OutOrStdout(), env)
			}
			render.Projects(cmd.OutOrStdout(), projects)
			return nil
		},
	}
	cmd.Flags().StringVar(&status, "status", "", "filter by status")
	cmd.Flags().StringVar(&area, "area", "", "filter by PARA area")
	cmd.Flags().IntVar(&limit, "limit", 0, "page size")
	cmd.Flags().IntVar(&offset, "offset", 0, "page offset")
	return cmd
}

func newProjectAddCmd() *cobra.Command {
	var (
		name, description, color, icon, area, status string
	)
	cmd := &cobra.Command{
		Use:   "add <name>",
		Short: "Create a project",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			name = args[0]
			input := model.CreateProjectInput{Name: name}
			if description != "" {
				input.Description = &description
			}
			if color != "" {
				input.Color = &color
			}
			if icon != "" {
				input.Icon = &icon
			}
			if area != "" {
				input.Area = &area
			}
			if status != "" {
				input.Status = &status
			}
			p, err := c.Client.CreateProject(cmd.Context(), input)
			if err != nil {
				return err
			}
			return printProject(cmd, c, p)
		},
	}
	cmd.Flags().StringVar(&description, "description", "", "description")
	cmd.Flags().StringVar(&color, "color", "", "hex color")
	cmd.Flags().StringVar(&icon, "icon", "", "icon")
	cmd.Flags().StringVar(&area, "area", "", "PARA area")
	cmd.Flags().StringVar(&status, "status", "", "initial status")
	return cmd
}

func newProjectGetCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "get <id>",
		Short: "Get a project",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			id, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil {
				return &clierr.UserErr{Msg: "invalid project id"}
			}
			p, err := c.Client.GetProject(cmd.Context(), id)
			if err != nil {
				return err
			}
			return printProject(cmd, c, p)
		},
	}
}

func newProjectEditCmd() *cobra.Command {
	var name, status, area string
	cmd := &cobra.Command{
		Use:   "edit <id>",
		Short: "Update a project",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			id, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil {
				return &clierr.UserErr{Msg: "invalid project id"}
			}
			input := model.UpdateProjectInput{}
			if cmd.Flags().Changed("name") {
				input.Name = &name
			}
			if cmd.Flags().Changed("status") {
				input.Status = &status
			}
			if cmd.Flags().Changed("area") {
				input.Area = &area
			}
			p, err := c.Client.UpdateProject(cmd.Context(), id, input)
			if err != nil {
				return err
			}
			return printProject(cmd, c, p)
		},
	}
	cmd.Flags().StringVar(&name, "name", "", "new name")
	cmd.Flags().StringVar(&status, "status", "", "new status")
	cmd.Flags().StringVar(&area, "area", "", "new area")
	return cmd
}

func newProjectArchiveCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "archive <id>",
		Short: "Archive a project (sets status=archived)",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			id, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil {
				return &clierr.UserErr{Msg: "invalid project id"}
			}
			archived := "archived"
			p, err := c.Client.UpdateProject(cmd.Context(), id, model.UpdateProjectInput{Status: &archived})
			if err != nil {
				return err
			}
			return printProject(cmd, c, p)
		},
	}
}

func newProjectRmCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "rm <id>",
		Short: "Delete a project",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			id, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil {
				return &clierr.UserErr{Msg: "invalid project id"}
			}
			if err := c.Client.DeleteProject(cmd.Context(), id); err != nil {
				return err
			}
			fmt.Fprintf(cmd.OutOrStdout(), "deleted project %d\n", id)
			return nil
		},
	}
}

func printProject(cmd *cobra.Command, c *Context, p *model.Project) error {
	if c.JSON {
		return render.JSONEnvelope(cmd.OutOrStdout(), render.Envelope{Data: p})
	}
	render.Projects(cmd.OutOrStdout(), []model.Project{*p})
	return nil
}
