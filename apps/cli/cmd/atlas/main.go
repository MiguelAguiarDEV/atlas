// Package main is the entrypoint for the atlas CLI.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/MiguelAguiarDEV/atlas/apps/cli/internal/cmd"
	clierr "github.com/MiguelAguiarDEV/atlas/apps/cli/internal/errors"
)

// version is overridden at build time via -ldflags.
var version = "dev"

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	root := cmd.NewRootCmd(version)
	root.SetContext(ctx)

	if err := root.ExecuteContext(ctx); err != nil {
		// SilenceErrors is set, so cobra did not print; we do.
		code := clierr.Code(err)
		if code != clierr.ExitOK {
			// For --json mode we also emit a structured error on stderr.
			if jsonFlag, ferr := root.PersistentFlags().GetBool("json"); ferr == nil && jsonFlag {
				_, _ = fmt.Fprintf(os.Stderr, `{"data":null,"error":%q}`+"\n", err.Error())
			} else {
				_, _ = fmt.Fprintln(os.Stderr, "error:", err.Error())
			}
		}
		// Ensure cancelled contexts don't emit a noisy "context canceled".
		if errors.Is(err, context.Canceled) {
			os.Exit(clierr.ExitNetErr)
		}
		os.Exit(code)
	}
}
