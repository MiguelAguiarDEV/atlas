# atlas CLI

Fast command-line access to the atlas API.

## Install

### From a release (recommended)

Grab the latest `atlas-cli_<version>_<os>_<arch>` archive from the
[GitHub Releases](https://github.com/MiguelAguiarDEV/atlas/releases) page,
extract it, and put the `atlas` binary somewhere on your `PATH`.

```bash
# Linux amd64 example
curl -L -o atlas.tar.gz \
  "https://github.com/MiguelAguiarDEV/atlas/releases/latest/download/atlas-cli_$(curl -s https://api.github.com/repos/MiguelAguiarDEV/atlas/releases/latest | jq -r .tag_name | sed 's/^cli-v//')_linux_amd64.tar.gz"
tar xzf atlas.tar.gz
install -m 0755 atlas ~/.local/bin/atlas
```

### From source

```bash
git clone https://github.com/MiguelAguiarDEV/atlas
cd atlas/apps/cli
go build -o atlas ./cmd/atlas
```

Binaries are shipped for linux / darwin / windows x amd64 / arm64.

## First run

The CLI reads config from `~/.config/atlas/config.toml` (or
`$XDG_CONFIG_HOME/atlas/config.toml`). Create it via:

```bash
atlas config set server http://100.71.66.54:4000
atlas config set token "your-token-if-auth-is-on"
atlas config path    # prints the resolved path
atlas status         # health-check the API
```

Precedence, highest to lowest: `--flag` > env (`ATLAS_SERVER`, `ATLAS_TOKEN`, ...) > config file > built-in defaults.

The config file is created with mode `0600` and its parent dir with `0700`.

## Examples

```bash
# Quick-capture a task
atlas new "fix prod alert"

# List open tasks sorted by due date
atlas tasks list --status open

# Add a task with flags
atlas tasks add "write design doc" --project 1 --priority high --due "tomorrow 9am"

# Mark done
atlas tasks done 42

# Start the timer for a task
atlas tasks start 42

# Stop the active timer
atlas time stop

# List today's time entries
atlas time list --today

# Projects
atlas projects list
atlas projects archive 7

# Habits
atlas habits list
atlas habits check 3
atlas habits streak 3   # computed client-side

# JSON output — pipe to jq
atlas tasks list --json | jq '.data[].title'
```

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | user input error (bad flag, validation, 4xx) |
| 2 | server 5xx |
| 3 | network error (dial / timeout / refused) |
| 4 | config error (invalid TOML, unreadable file) |

## Verbose logging

`-V` (repeatable) logs one line per HTTP request to stderr:

```
[atlas] GET http://100.71.66.54:4000/api/v1/tasks -> 200 (15ms)
```

The `Authorization` header is never logged.

## Development

```bash
cd apps/cli
go test ./...
go build ./...
```

CI runs `go vet`, `go test`, and `go build` for both `apps/api` and
`apps/cli`.

## Releases

- Conventional commits drive `release-please` (`feat:`, `fix:`, `ci:`, `docs:` ...).
- Merging the release PR produces a `cli-vX.Y.Z` tag.
- GoReleaser builds the 6-target binary matrix + `checksums.txt`.
