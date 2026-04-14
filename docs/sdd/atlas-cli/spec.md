# Spec: atlas-cli (v1.0)

**Topic key**: `sdd/atlas-cli/spec`
**Project**: home (atlas monorepo)
**Date**: 2026-04-14
**Status**: draft

This is a NEW spec — no prior atlas-cli behavior exists. Requirements use RFC 2119 keywords.

---

## Domain: configuration

### Requirement: Config file path
The CLI MUST resolve config to `~/.config/atlas/config.toml` (XDG-respecting). `atlas config path` MUST print the resolved absolute path to stdout.
- GIVEN no config exists, WHEN user runs `atlas config path`, THEN stdout prints the default path AND exit 0.

### Requirement: Config file mode
On first write the file MUST be created with mode 0600 and parent dirs with 0700.
- GIVEN no config dir, WHEN `atlas config set server URL`, THEN file exists with mode 0600.

### Requirement: Server URL precedence
Server URL MUST resolve in order: `--server` flag > env `ATLAS_SERVER` > config `server` key > default `http://100.71.66.54:4000`.
- GIVEN env `ATLAS_SERVER=http://a` and config `server=http://b`, WHEN `--server http://c` passed, THEN requests target `http://c`.
- GIVEN none set, WHEN any command runs, THEN requests target the default.

### Requirement: Bearer auth header
When config or env `ATLAS_TOKEN` provides a token, every HTTP request MUST include `Authorization: Bearer <token>`. When absent, header MUST be omitted.
- GIVEN token configured, WHEN any command issues a request, THEN header present.
- GIVEN no token, WHEN debug logs emitted, THEN token MUST NOT appear in any log line.

---

## Domain: output

### Requirement: Default table mode
Default output MUST render via lipgloss table with bold header row and column truncation to fit `$COLUMNS` (fallback 100).
- GIVEN a tasks list, WHEN no `--json`, THEN stdout shows table; long titles truncated with ellipsis.

### Requirement: JSON mode
`--json` MUST emit the raw API envelope (`{data, error, meta}`) verbatim, exactly one JSON value per command invocation, no pretty-print, no ANSI.
- GIVEN any command with `--json`, WHEN it succeeds, THEN stdout is a single parseable JSON value usable with `jq`.

### Requirement: No-color
`--no-color` (or env `NO_COLOR`) MUST suppress all ANSI escape codes on stdout and stderr.

### Requirement: Verbose debug
`-v`/`--verbose` MUST emit one debug line per HTTP request to stderr containing method, URL, status, duration_ms. Bearer token MUST NEVER be logged.

---

## Domain: exit-codes

### Requirement: Standard codes
The CLI MUST exit with: 0 success; 1 user input error (bad flag/date/missing required); 2 server 5xx (message MUST include server's `error` field); 3 network error (timeout/DNS/refused); 4 config error (unreadable file or invalid TOML).
- GIVEN bad date string, WHEN `tasks add --due "notadate"`, THEN exit 1 and stderr explains.
- GIVEN API returns 500, WHEN any command runs, THEN exit 2 and stderr includes server `error`.
- GIVEN connection refused, WHEN any command runs, THEN exit 3.
- GIVEN invalid TOML in config, WHEN any command runs, THEN exit 4.

---

## Domain: tasks

### Requirement: List with filters
`atlas tasks list` MUST forward filters `--status`, `--priority`, `--project`, `--search`, `--due-from`, `--due-to`, `--limit`, `--offset` to `GET /tasks` query params. `--all` MUST auto-paginate using `meta.total` until all items fetched.
- GIVEN 73 tasks server-side, WHEN `tasks list --all --limit 50`, THEN CLI issues 2 requests and prints 73 rows.

### Requirement: Add task
`atlas tasks add "title" [flags]` MUST POST `/tasks` with `CreateTaskInput`-parity fields: `--project`, `--parent`, `--description`, `--status`, `--priority`, `--energy`, `--estimated-mins`, `--type`, `--tag` (repeatable → context_tags), `--deep-work`, `--quick-win`, `--recurrence`, `--due`. `--due` MUST accept friendly inputs ("today", "tomorrow 9am") parsed via dateparse and serialized as RFC3339 UTC.
- GIVEN `--due "tomorrow 9am"` in local TZ, WHEN POST issued, THEN `due_at` is RFC3339 UTC equivalent.
- GIVEN unparseable date, WHEN add runs, THEN exit 1 with explanatory message.

### Requirement: Done
`atlas tasks done <id>` MUST PUT `/tasks/<id>` with body `{"status":"done","completed_at":<RFC3339-UTC-now>}`.

### Requirement: Start
`atlas tasks start <id>` MUST first PUT `/tasks/<id>` with `{"status":"in_progress"}`, then POST `/tasks/<id>/timer/start`. If either fails, the CLI MUST exit non-zero and stderr MUST report which step failed.

### Requirement: Remove
`atlas tasks rm <id>` MUST prompt `Delete task <id>? [y/N]` on stdin. `--yes` MUST skip prompt. Confirmation other than `y`/`Y` MUST cancel with exit 0 and no API call.

### Requirement: Print modified resource
All mutating commands (add, edit, done, start, rm without `--yes` declined excluded) MUST print the modified/created resource on success in the active output mode.

---

## Domain: time

### Requirement: Start timer
`atlas time start <task>` MUST POST `/tasks/<id>/timer/start` and print returned time entry.

### Requirement: Stop active timer
`atlas time stop` MUST GET `/time-entries?active=true`, then POST `/tasks/<task_id>/timer/stop` on the active entry. If none active, exit 1 with message "no active timer".

### Requirement: List today
`atlas time list --today` MUST filter to entries with `started_at >= local-midnight` (computed client-side, sent as RFC3339 UTC `from` query param).

---

## Domain: projects

### Requirement: List
`atlas projects list` MUST render a table with columns `id`, `name`, `status`.

### Requirement: Archive
`atlas projects archive <id>` MUST PUT `/projects/<id>` with `{"status":"archived"}` and print updated project.

---

## Domain: habits

### Requirement: Check habit
`atlas habits check <id>` MUST POST a habit event. Optional `--value <N>` MUST be included for numeric habits; omitted for boolean.

### Requirement: Streak (client-side)
`atlas habits streak <id>` MUST fetch habit events and compute current streak in CLI (consecutive days with at least one event up to today, local TZ). Output MUST include `current_streak` and `longest_streak`.

---

## Domain: global

### Requirement: Network timeout
HTTP client MUST default to 10s total timeout per request, configurable via `--timeout <duration>` (Go duration syntax, e.g., `30s`).
- GIVEN slow server, WHEN deadline exceeded, THEN exit 3 with "timeout" message.

### Requirement: No automatic retries
The CLI MUST NOT retry failed requests automatically in v1.

---

## Domain: packaging

### Requirement: Cross-compile matrix
GoReleaser MUST produce 6 binaries: `{linux,darwin,windows} × {amd64,arm64}`, packaged as tarballs (zip for windows) plus a `checksums.txt` (sha256).

### Requirement: Tag namespace
Releases MUST use tag namespace `cli/vX.Y.Z` if the repo already has a top-level `vX.Y.Z` release stream; otherwise top-level `vX.Y.Z`. The active scheme MUST be verified by inspecting existing repo tags before first release and locked in design.

---

## Open verification items
- Confirm timer endpoints `POST /tasks/{id}/timer/{start,stop}` and `GET /time-entries?active=true` exist (not visible in `task_handler.go`); if absent, design phase MUST adjust.
- Confirm habit event endpoint shape.
- Confirm existing repo tag scheme to lock the packaging requirement.
