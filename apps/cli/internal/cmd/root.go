// Package cmd wires the cobra command tree for the atlas CLI.
package cmd

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/cache"
	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/client"
	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/config"
	clierr "github.com/MiguelAguiarDEV/atlas/apps/cli/internal/errors"
	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/render"
)

// Context bundles everything a command handler needs.
type Context struct {
	Viper   *viper.Viper
	Config  *config.Config
	Client  *client.Client
	Cache   *cache.Cache // may be nil when --no-cache is set
	Mode    render.Mode  // table vs json
	JSON    bool
	All     bool // --all pagination
	Offline bool // --offline or auto-detected
	NoCache bool // --no-cache skips cache entirely (v1.0 behavior)
}

// key is a private context key type.
type ctxKey int

const cliKey ctxKey = 1

// FromCmd returns the CLI Context attached to a cobra command's context.
func FromCmd(cmd *cobra.Command) *Context {
	v := cmd.Context().Value(cliKey)
	if v == nil {
		return nil
	}
	return v.(*Context)
}

// WithCLI attaches the CLI Context to a context.Context.
func WithCLI(ctx context.Context, c *Context) context.Context {
	return context.WithValue(ctx, cliKey, c)
}

// NewRootCmd builds the root command tree.
// The returned command owns all flags; callers invoke Execute on it.
func NewRootCmd(version string) *cobra.Command {
	v := viper.New()
	v.SetDefault("server", config.DefaultServer)
	v.SetDefault("timeout_seconds", int(config.DefaultTimeout.Seconds()))
	v.SetDefault("date_format", "friendly")
	v.SetEnvPrefix(config.EnvPrefix)
	v.AutomaticEnv()

	root := &cobra.Command{
		Use:           "atlas",
		Short:         "atlas CLI — command-line access to the atlas API",
		SilenceUsage:  true,
		SilenceErrors: true,
		Version:       version,
	}

	// Persistent flags.
	root.PersistentFlags().String("server", "", "API base URL")
	root.PersistentFlags().String("token", "", "bearer token")
	root.PersistentFlags().Bool("json", false, "emit raw JSON envelope (one value per invocation)")
	root.PersistentFlags().Bool("no-color", false, "disable ANSI colors")
	root.PersistentFlags().CountP("verbose", "V", "verbose debug output to stderr (repeatable)")
	root.PersistentFlags().Duration("timeout", config.DefaultTimeout, "HTTP request timeout (Go duration, e.g. 30s)")
	root.PersistentFlags().String("config", "", "path to config file (default: ~/.config/atlas/config.toml)")
	root.PersistentFlags().Bool("all", false, "auto-paginate until all items are fetched")
	root.PersistentFlags().Bool("offline", false, "force offline mode (read cache, enqueue writes)")
	root.PersistentFlags().Bool("no-cache", false, "bypass the local cache entirely (pre-v0.2 behavior)")

	// Bind viper for each persistent flag so --flag > env > file > default all converge.
	_ = v.BindPFlag("server", root.PersistentFlags().Lookup("server"))
	_ = v.BindPFlag("token", root.PersistentFlags().Lookup("token"))
	_ = v.BindPFlag("date_format", root.PersistentFlags().Lookup("date-format"))

	root.PersistentPreRunE = func(cmd *cobra.Command, args []string) error {
		return initContext(cmd, v)
	}

	root.AddCommand(newTaskCmd())
	root.AddCommand(newNewCmd())
	// Added in the time/projects/habits/config/status commit:
	addOptional(root, extraCommands()...)
	return root
}

// initContext resolves config + builds the Client and attaches them to the command's ctx.
func initContext(cmd *cobra.Command, v *viper.Viper) error {
	// Resolve config file path.
	cfgPath, _ := cmd.Flags().GetString("config")
	if cfgPath == "" {
		cfgPath = config.DefaultPath()
	}

	// Load the file view (defaults applied) — merge into our persistent viper.
	fileV := config.New(cfgPath)
	cfg, err := config.Load(fileV)
	if err != nil {
		return err
	}

	// Precedence: explicit persistent flags > env (already bound on v) > file (cfg).
	if v.GetString("server") == "" {
		v.Set("server", cfg.Server)
	}
	if v.GetString("token") == "" {
		v.Set("token", cfg.Token)
	}

	server := v.GetString("server")
	token := v.GetString("token")

	// --no-color / NO_COLOR
	noColor, _ := cmd.Flags().GetBool("no-color")
	if noColor {
		_ = os.Setenv("NO_COLOR", "1")
	}

	verbosity, _ := cmd.Flags().GetCount("verbose")
	timeout, _ := cmd.Flags().GetDuration("timeout")
	if timeout <= 0 {
		timeout = cfg.Timeout
	}
	if timeout <= 0 {
		timeout = 10 * time.Second
	}

	jsonFlag, _ := cmd.Flags().GetBool("json")
	allFlag, _ := cmd.Flags().GetBool("all")
	offlineFlag, _ := cmd.Flags().GetBool("offline")
	noCacheFlag, _ := cmd.Flags().GetBool("no-cache")

	c := client.New(client.Options{
		Base:    server,
		Token:   token,
		Timeout: timeout,
		Verbose: verbosity > 0,
	})

	ctx := &Context{
		Viper:   v,
		Config:  cfg,
		Client:  c,
		Mode:    render.FromFlag(jsonFlag),
		JSON:    jsonFlag,
		All:     allFlag,
		Offline: offlineFlag,
		NoCache: noCacheFlag,
	}

	// Open the cache unless the user opted out with --no-cache.
	if !noCacheFlag {
		ch, err := cache.Open(cache.DefaultPath())
		if err != nil {
			// Cache failures are non-fatal: warn and continue in pre-v0.2 mode.
			fmt.Fprintf(cmd.ErrOrStderr(), "[atlas] warning: cache unavailable: %v\n", err)
		} else {
			ctx.Cache = ch
		}
	}

	cmd.SetContext(WithCLI(cmd.Context(), ctx))
	return nil
}

// ExitCode maps an error to a CLI exit code.
func ExitCode(err error) int { return clierr.Code(err) }

// FailJSON prints an error as an envelope (for --json mode) and returns err unchanged.
func FailJSON(cmd *cobra.Command, err error) {
	_ = render.JSONEnvelope(cmd.OutOrStderr(), render.Envelope{Data: nil, Error: ptrAny(err.Error())})
}

func ptrAny(s string) *any { var v any = s; return &v }

// Printf is a short helper to write to the command's stdout.
func Printf(cmd *cobra.Command, format string, a ...any) {
	fmt.Fprintf(cmd.OutOrStdout(), format, a...)
}
