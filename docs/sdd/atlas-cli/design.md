# Design: atlas-cli (v1.0)

**Status**: design
**Phase**: sdd-design
**Topic key**: `sdd/atlas-cli/design`
**Date**: 2026-04-14

---

## Technical Approach

Single-binary Go CLI shipped as a new module under `apps/cli/` in the existing atlas monorepo. Cobra owns command tree and flag parsing; viper resolves config (flag > env > file > default); a thin `internal/client` wraps `net/http` and unwraps the API's `{data, error, meta}` envelope (`apps/api/internal/handler/response.go`); lipgloss renders tables with auto-truncate and ANSI status colors. Models are duplicated from `apps/api/internal/model` in v1 (extraction to `packages/go-types` deferred to v0.2 per proposal). Per-app `go.mod` (atlas API uses `github.com/MiguelAguiarDEV/atlas/apps/api`), so CLI gets `github.com/MiguelAguiarDEV/atlas/apps/cli`. API base path is `/api/v1`; resources are `/tasks`, `/projects`, `/time-entries`, `/habits`, plus `/tasks/{id}/timer/{start,stop}`.

## Architecture Decisions

| # | Decision | Choice | Rejected | Rationale |
|---|----------|--------|----------|-----------|
| 1 | Module layout | Per-app `go.mod` at `apps/cli/go.mod` | Root go.mod / shared workspace | API already uses per-app; matches monorepo convention; lets CLI pick its own deps without bloating API |
| 2 | HTTP client | stdlib `net/http` + custom `Do(...)` | resty / req | Zero deps, full control over envelope unmarshal, easy to test with `httptest` |
| 3 | Models duplication | Copy `Task/Project/TimeEntry/Habit` into `internal/model` | Import `apps/api/internal/model` | API package is `internal/`; cross-module import forbidden. Extraction to `packages/go-types` is v0.2 per proposal |
| 4 | Config lib | viper (TOML) | koanf / hand-rolled | Cobra+viper is canonical; precedence handling already implemented; TOML matches `~/.config/atlas/config.toml` proposal |
| 5 | Date parsing | `araddon/dateparse` + ISO fallback | `tj/go-naturaldate` | dateparse handles RFC3339 + many natural formats; both lack Spanish; ship dateparse + document ISO override (proposal-locked) |
| 6 | Render lib | `charmbracelet/lipgloss` + `lipgloss/table` | tablewriter / text/tabwriter | Aligns with future bubbletea TUI (v0.2); supports truncation and ANSI |
| 7 | Cobra `Run` style | `RunE` returning typed errors | `Run` + os.Exit | Lets `main.go` map error → exit code uniformly via `errors.Code()` |
| 8 | Auth in v1 | Always send `Authorization: Bearer <t>` if token set; never error if absent | Skip header entirely | When v0.2 server middleware lights up, zero CLI changes needed (proposal-locked) |
| 9 | Pagination | Default page; `--all` loops `offset += limit` until `meta.total` reached | Cursor / streaming | API returns `meta.total/limit/offset`; simple loop is sufficient for personal-scale data |
| 10 | Release | GoReleaser + release-please; tag format `cli-vX.Y.Z` | Separate repo | Component-prefixed tags isolate CLI releases inside monorepo; GitHub Action `cd apps/cli && goreleaser release --config .goreleaser.yaml` |
| 11 | Habit streaks | Client-side compute from `/habits/{id}` completions | Server endpoint | Proposal-locked; defer server endpoint to v0.2 |

## Data Flow

```
user shell
   │  $ atlas tasks list --status open --json
   ▼
cmd/atlas/main.go ── cmd.NewRootCmd() ── Cobra dispatch
   │
   ▼
internal/cmd/task.go (RunE)
   │  parse flags → build TaskFilter
   ▼
internal/client/tasks.go ── List(ctx, filter)
   │  build URL + query → c.Do(GET, "/api/v1/tasks?status=open")
   ▼
internal/client/client.go ── Do()
   │  add Bearer header (if token), context timeout, verbose log to stderr
   ▼
Atlas API (chi @ 100.71.66.54:4000)
   │  {"data":[...],"meta":{"total":N,"limit":50,"offset":0}}
   ▼
client.Do() unwraps envelope → returns ([]Task, Meta, err)
   │
   ▼
internal/render/output.go ── if --json: print raw .data; else render.Tasks(tasks)
   │
   ▼
stdout (table or JSON)   stderr (verbose, errors)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/cli/go.mod` | Create | Module `github.com/MiguelAguiarDEV/atlas/apps/cli`, Go 1.22 (match API) |
| `apps/cli/cmd/atlas/main.go` | Create | Builds root cmd, executes, maps error → exit code |
| `apps/cli/internal/cmd/root.go` | Create | Cobra root + persistent flags (`--server`, `--token`, `--json`, `--no-color`, `-v`, `--timeout`, `--all`); viper bind |
| `apps/cli/internal/cmd/task.go` | Create | `tasks {list,add,get,edit,done,start,rm,events}` + `new` alias |
| `apps/cli/internal/cmd/time.go` | Create | `time {start,stop,list,add,rm}` |
| `apps/cli/internal/cmd/project.go` | Create | `projects {list,add,get,edit,archive,rm}` |
| `apps/cli/internal/cmd/habit.go` | Create | `habits {list,add,check,streak,rm}` |
| `apps/cli/internal/cmd/config.go` | Create | `config {get,set,path}` |
| `apps/cli/internal/cmd/status.go` | Create | GET `/api/v1/status` |
| `apps/cli/internal/client/client.go` | Create | `Client` struct + `Do()` envelope unwrap, Bearer, context, verbose |
| `apps/cli/internal/client/{tasks,time,projects,habits}.go` | Create | Typed methods (List/Get/Create/Update/Delete + StartTimer/StopTimer) |
| `apps/cli/internal/model/{task,project,time_entry,habit}.go` | Create | Duplicated structs (v1) — JSON tags must match API exactly |
| `apps/cli/internal/config/config.go` | Create | viper wrapper, precedence, `~/.config/atlas/config.toml` (mode 0600) |
| `apps/cli/internal/render/{table,output,datefmt}.go` | Create | lipgloss tables, JSON/table switch, friendly date I/O |
| `apps/cli/internal/errors/codes.go` | Create | Exit code constants (`ExitOK=0, ExitUserErr=1, ExitServerErr=2, ExitNetErr=3`) + typed errors |
| `apps/cli/.goreleaser.yaml` | Create | linux/darwin/windows × amd64/arm64; tar.gz (zip win); no Homebrew |
| `apps/cli/README.md` | Create | Install + first-run + commands |
| `.github/workflows/cli-release.yml` | Create | release-please + goreleaser job (cd `apps/cli`); tag prefix `cli-v` |
| `release-please-config.json` | Create | release-type=go, path=`apps/cli/`, component `cli` |
| `release-please-manifest.json` | Create | Initial `apps/cli` version |

## Interfaces / Contracts

```go
// internal/client/client.go
type Client struct {
    base    string        // e.g. "http://100.71.66.54:4000"
    token   string        // optional
    http    *http.Client
    verbose bool
}

type Envelope struct {
    Data   json.RawMessage `json:"data"`
    Error  *string         `json:"error"`
    Meta   *Meta           `json:"meta,omitempty"`
}
type Meta struct{ Total, Limit, Offset int }

// Do issues req, parses envelope, returns raw data + meta. err is typed (*UserErr | *ServerErr | *NetErr).
func (c *Client) Do(ctx context.Context, method, path string, body any) (json.RawMessage, *Meta, error)
```

```go
// internal/cmd/root.go (sketch)
func NewRootCmd() *cobra.Command {
    root := &cobra.Command{Use: "atlas", SilenceUsage: true, SilenceErrors: true}
    root.PersistentFlags().String("server", "", "API base URL")
    root.PersistentFlags().String("token", "", "Bearer token")
    root.PersistentFlags().Bool("json", false, "raw JSON output")
    root.PersistentFlags().Bool("no-color", false, "disable ANSI")
    root.PersistentFlags().CountP("verbose", "v", "debug to stderr")
    root.PersistentFlags().Duration("timeout", 10*time.Second, "request timeout")
    viper.BindPFlags(root.PersistentFlags())
    root.AddCommand(newTaskCmd(), newTimeCmd(), newProjectCmd(), newHabitCmd(),
                    newConfigCmd(), newStatusCmd(), newAlias("new"))
    return root
}
```

```go
// internal/errors/codes.go
const (
    ExitOK        = 0
    ExitUserErr   = 1  // bad flag, validation, 4xx
    ExitServerErr = 2  // 5xx
    ExitNetErr    = 3  // dial / timeout
)
type UserErr struct{ Msg string; Status int }
type ServerErr struct{ Msg string; Status int }
type NetErr struct{ Err error }
func Code(err error) int { /* type switch → ExitOK/User/Server/Net */ }
```

```toml
# ~/.config/atlas/config.toml (mode 0600)
server = "http://100.71.66.54:4000"
token = ""
timeout_seconds = 10
default_project_id = 0
date_format = "friendly"  # friendly | rfc3339
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `client.Do` envelope unwrap, error mapping, Bearer header | `httptest.NewServer` per scenario; table-driven |
| Unit | `config` precedence (flag > env > file > default) | viper test with `os.Setenv` + temp TOML |
| Unit | `render.Tasks` table formatting + truncation | golden files (`testdata/*.golden`); `-update` flag pattern |
| Unit | `datefmt.Parse` natural input → RFC3339 UTC | table-driven incl. timezone fixed via `time.FixedZone` |
| Unit | `errors.Code` mapping | table-driven |
| Integration | full command against real API | `make dev-up` from monorepo `docker-compose.yml`; build+invoke binary; assert exit code + stdout shape |
| Smoke | linux/amd64 + darwin/arm64 binary | manual pre-tag |

## Migration / Rollout

No data migration. Additive: new directory `apps/cli/`. First release `cli-v0.1.0` via release-please PR → GoReleaser GitHub Action. Rollback = revert merge + delete tag + delete GitHub Release.

## Open Questions

- [ ] Confirm Go 1.22 vs upgrading to 1.23 — API uses 1.22.0; CLI matches unless reason to bump.
- [ ] Confirm `cli-vX.Y.Z` tag format vs simple `vX.Y.Z` — chosen because monorepo will get other components (web) needing isolated tag streams.
- [ ] Confirm `make dev-up` target exists in monorepo or use `docker compose up` directly — verify in sdd-tasks; root has `docker-compose.yml`.

---

## Persistence

- **mnemo**: `mem_save(title="Design: atlas-cli", topic_key="sdd/atlas-cli/design", type=architecture, project=home)`
- **file**: `/home/mx/Repos/atlas/docs/sdd/atlas-cli/design.md`
