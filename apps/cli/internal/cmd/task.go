package cmd

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/client"
	clierr "github.com/MiguelAguiarDEV/atlas/apps/cli/internal/errors"
	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/model"
	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/render"
)

func newTaskCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "tasks",
		Aliases: []string{"task", "t"},
		Short:   "Manage tasks",
	}
	cmd.AddCommand(newTasksListCmd())
	cmd.AddCommand(newTasksAddCmd())
	cmd.AddCommand(newTasksGetCmd())
	cmd.AddCommand(newTasksEditCmd())
	cmd.AddCommand(newTasksDoneCmd())
	cmd.AddCommand(newTasksStartCmd())
	cmd.AddCommand(newTasksRmCmd())
	cmd.AddCommand(newTasksEventsCmd())
	return cmd
}

func newTasksListCmd() *cobra.Command {
	var (
		status, priority, search, dueFrom, dueTo string
		project                                  int64
		limit, offset                            int
	)
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List tasks with filters",
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			filter := client.TaskFilter{
				Status: status, Priority: priority, Search: search,
				Limit: limit, Offset: offset,
			}
			if project > 0 {
				filter.ProjectID = &project
			}
			now := time.Now()
			if dueFrom != "" {
				t, err := render.ParseDue(dueFrom, now)
				if err != nil {
					return &clierr.UserErr{Msg: err.Error()}
				}
				filter.DueFrom = &t
			}
			if dueTo != "" {
				t, err := render.ParseDue(dueTo, now)
				if err != nil {
					return &clierr.UserErr{Msg: err.Error()}
				}
				filter.DueTo = &t
			}

			ctx := cmd.Context()
			if c.All {
				tasks, err := c.Client.ListAllTasks(ctx, filter)
				if err != nil {
					return err
				}
				return printTasks(cmd, c, tasks, nil)
			}
			tasks, meta, err := c.Client.ListTasks(ctx, filter)
			if err != nil {
				return err
			}
			return printTasks(cmd, c, tasks, meta)
		},
	}
	cmd.Flags().StringVar(&status, "status", "", "filter by status")
	cmd.Flags().StringVar(&priority, "priority", "", "filter by priority")
	cmd.Flags().Int64Var(&project, "project", 0, "filter by project id")
	cmd.Flags().StringVar(&search, "search", "", "full-text search")
	cmd.Flags().StringVar(&dueFrom, "due-from", "", "due after (date/time)")
	cmd.Flags().StringVar(&dueTo, "due-to", "", "due before (date/time)")
	cmd.Flags().IntVar(&limit, "limit", 0, "page size")
	cmd.Flags().IntVar(&offset, "offset", 0, "page offset")
	return cmd
}

func newTasksAddCmd() *cobra.Command {
	var (
		project, parent                    int64
		description, status, priority      string
		energy, taskType, recurrence, due  string
		estimatedMins                      int
		tag                                []string
		deepWork, quickWin                 bool
		setDeepWork, setQuickWin           bool
	)
	cmd := &cobra.Command{
		Use:   "add <title>",
		Short: "Create a new task",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			input := model.CreateTaskInput{Title: args[0]}
			if project > 0 {
				input.ProjectID = &project
			}
			if parent > 0 {
				input.ParentID = &parent
			}
			if description != "" {
				input.Description = &description
			}
			if status != "" {
				input.Status = &status
			}
			if priority != "" {
				input.Priority = &priority
			}
			if energy != "" {
				input.Energy = &energy
			}
			if taskType != "" {
				input.TaskType = &taskType
			}
			if recurrence != "" {
				input.Recurrence = &recurrence
			}
			if estimatedMins > 0 {
				input.EstimatedMins = &estimatedMins
			}
			if len(tag) > 0 {
				input.ContextTags = tag
			}
			if setDeepWork {
				input.DeepWork = &deepWork
			}
			if setQuickWin {
				input.QuickWin = &quickWin
			}
			if due != "" {
				t, err := render.ParseDue(due, time.Now())
				if err != nil {
					return &clierr.UserErr{Msg: err.Error()}
				}
				s := render.RFC3339UTC(t)
				input.DueAt = &s
			}

			task, err := c.Client.CreateTask(cmd.Context(), input)
			if err != nil {
				return err
			}
			return printTask(cmd, c, task)
		},
	}
	cmd.Flags().Int64Var(&project, "project", 0, "project id")
	cmd.Flags().Int64Var(&parent, "parent", 0, "parent task id")
	cmd.Flags().StringVar(&description, "description", "", "long description")
	cmd.Flags().StringVar(&status, "status", "", "initial status")
	cmd.Flags().StringVar(&priority, "priority", "", "priority")
	cmd.Flags().StringVar(&energy, "energy", "", "energy level")
	cmd.Flags().StringVar(&taskType, "type", "", "task type")
	cmd.Flags().StringVar(&recurrence, "recurrence", "", "recurrence rule")
	cmd.Flags().IntVar(&estimatedMins, "estimated-mins", 0, "estimated minutes")
	cmd.Flags().StringSliceVar(&tag, "tag", nil, "context tag (repeatable)")
	cmd.Flags().BoolVar(&deepWork, "deep-work", false, "mark as deep-work")
	cmd.Flags().BoolVar(&quickWin, "quick-win", false, "mark as quick-win")
	cmd.Flags().StringVar(&due, "due", "", "due date/time (e.g. 'today', 'tomorrow 9am', RFC3339)")
	// Detect explicit bool flags to forward only-if-set:
	cmd.PreRun = func(c *cobra.Command, _ []string) {
		setDeepWork = c.Flags().Changed("deep-work")
		setQuickWin = c.Flags().Changed("quick-win")
	}
	return cmd
}

func newTasksGetCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "get <id>",
		Short: "Get a task by id",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			id, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil {
				return &clierr.UserErr{Msg: "invalid task id"}
			}
			task, err := c.Client.GetTask(cmd.Context(), id)
			if err != nil {
				return err
			}
			return printTask(cmd, c, task)
		},
	}
}

func newTasksEditCmd() *cobra.Command {
	var (
		title, description, status, priority, due string
		setTitle, setDescription, setStatus       bool
		setPriority, setDue                       bool
	)
	cmd := &cobra.Command{
		Use:   "edit <id>",
		Short: "Update fields on a task",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			id, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil {
				return &clierr.UserErr{Msg: "invalid task id"}
			}
			input := model.UpdateTaskInput{}
			if setTitle {
				input.Title = &title
			}
			if setDescription {
				input.Description = &description
			}
			if setStatus {
				input.Status = &status
			}
			if setPriority {
				input.Priority = &priority
			}
			if setDue {
				t, err := render.ParseDue(due, time.Now())
				if err != nil {
					return &clierr.UserErr{Msg: err.Error()}
				}
				s := render.RFC3339UTC(t)
				input.DueAt = &s
			}
			task, err := c.Client.UpdateTask(cmd.Context(), id, input)
			if err != nil {
				return err
			}
			return printTask(cmd, c, task)
		},
	}
	cmd.Flags().StringVar(&title, "title", "", "new title")
	cmd.Flags().StringVar(&description, "description", "", "new description")
	cmd.Flags().StringVar(&status, "status", "", "new status")
	cmd.Flags().StringVar(&priority, "priority", "", "new priority")
	cmd.Flags().StringVar(&due, "due", "", "new due date/time")
	cmd.PreRun = func(c *cobra.Command, _ []string) {
		setTitle = c.Flags().Changed("title")
		setDescription = c.Flags().Changed("description")
		setStatus = c.Flags().Changed("status")
		setPriority = c.Flags().Changed("priority")
		setDue = c.Flags().Changed("due")
	}
	return cmd
}

func newTasksDoneCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "done <id>",
		Short: "Mark a task as done (sets status + completed_at=now)",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			id, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil {
				return &clierr.UserErr{Msg: "invalid task id"}
			}
			status := "done"
			now := render.RFC3339UTC(time.Now())
			task, err := c.Client.UpdateTask(cmd.Context(), id, model.UpdateTaskInput{
				Status: &status, CompletedAt: &now,
			})
			if err != nil {
				return err
			}
			return printTask(cmd, c, task)
		},
	}
}

func newTasksStartCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "start <id>",
		Short: "Mark a task as in_progress and start its timer",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			id, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil {
				return &clierr.UserErr{Msg: "invalid task id"}
			}
			ctx := cmd.Context()
			status := "in_progress"
			if _, err := c.Client.UpdateTask(ctx, id, model.UpdateTaskInput{Status: &status}); err != nil {
				fmt.Fprintln(cmd.ErrOrStderr(), "step 1 failed: update status")
				return err
			}
			entry, err := c.Client.StartTimer(ctx, id)
			if err != nil {
				fmt.Fprintln(cmd.ErrOrStderr(), "step 2 failed: start timer")
				return err
			}
			return printTimeEntry(cmd, c, entry)
		},
	}
}

func newTasksRmCmd() *cobra.Command {
	var yes bool
	cmd := &cobra.Command{
		Use:     "rm <id>",
		Aliases: []string{"delete", "del"},
		Short:   "Delete a task",
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			id, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil {
				return &clierr.UserErr{Msg: "invalid task id"}
			}
			if !yes {
				fmt.Fprintf(cmd.OutOrStdout(), "Delete task %d? [y/N] ", id)
				reader := bufio.NewReader(cmd.InOrStdin())
				line, _ := reader.ReadString('\n')
				line = strings.TrimSpace(line)
				if !strings.EqualFold(line, "y") {
					fmt.Fprintln(cmd.OutOrStdout(), "cancelled")
					return nil
				}
			}
			if err := c.Client.DeleteTask(cmd.Context(), id); err != nil {
				return err
			}
			fmt.Fprintf(cmd.OutOrStdout(), "deleted task %d\n", id)
			return nil
		},
	}
	cmd.Flags().BoolVarP(&yes, "yes", "y", false, "skip confirmation")
	return cmd
}

func newTasksEventsCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "events <id>",
		Short: "List audit events for a task",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			id, err := strconv.ParseInt(args[0], 10, 64)
			if err != nil {
				return &clierr.UserErr{Msg: "invalid task id"}
			}
			events, err := c.Client.ListTaskEvents(cmd.Context(), id)
			if err != nil {
				return err
			}
			if c.JSON {
				return render.JSONEnvelope(cmd.OutOrStdout(), render.Envelope{Data: events})
			}
			if len(events) == 0 {
				fmt.Fprintln(cmd.OutOrStdout(), "No events.")
				return nil
			}
			for _, e := range events {
				fmt.Fprintf(cmd.OutOrStdout(), "%s  %s  (id=%d)\n",
					e.OccurredAt.Local().Format("2006-01-02 15:04"), e.EventType, e.ID)
			}
			return nil
		},
	}
}

// newNewCmd is the top-level `atlas new "title"` quick-capture alias.
func newNewCmd() *cobra.Command {
	var project int64
	cmd := &cobra.Command{
		Use:   "new <title>",
		Short: "Quick-capture: create a task with just a title",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := FromCmd(cmd)
			input := model.CreateTaskInput{Title: args[0]}
			if project > 0 {
				input.ProjectID = &project
			} else if c.Config.DefaultProject > 0 {
				id := c.Config.DefaultProject
				input.ProjectID = &id
			}
			task, err := c.Client.CreateTask(cmd.Context(), input)
			if err != nil {
				return err
			}
			return printTask(cmd, c, task)
		},
	}
	cmd.Flags().Int64Var(&project, "project", 0, "project id (overrides default_project_id)")
	return cmd
}

// ---- print helpers (keep task command file small) ------------------------

func printTasks(cmd *cobra.Command, c *Context, tasks []model.Task, meta *client.Meta) error {
	if c.JSON {
		env := render.Envelope{Data: tasks}
		if meta != nil {
			env.Meta = &render.Meta{Total: meta.Total, Limit: meta.Limit, Offset: meta.Offset}
		}
		return render.JSONEnvelope(cmd.OutOrStdout(), env)
	}
	render.Tasks(cmd.OutOrStdout(), tasks, c.Config.DateFormat)
	return nil
}

func printTask(cmd *cobra.Command, c *Context, task *model.Task) error {
	if c.JSON {
		return render.JSONEnvelope(cmd.OutOrStdout(), render.Envelope{Data: task})
	}
	render.Tasks(cmd.OutOrStdout(), []model.Task{*task}, c.Config.DateFormat)
	return nil
}

func printTimeEntry(cmd *cobra.Command, c *Context, entry *model.TimeEntry) error {
	if c.JSON {
		return render.JSONEnvelope(cmd.OutOrStdout(), render.Envelope{Data: entry})
	}
	render.TimeEntries(cmd.OutOrStdout(), []model.TimeEntry{*entry}, c.Config.DateFormat)
	return nil
}

// ensure context import is not deadcode on some build paths.
var _ = context.Background
var _ = os.Stdin
