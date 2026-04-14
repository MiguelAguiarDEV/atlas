# Proposal: atlas-cli (v1.0)

**Status**: proposed
**Phase**: sdd-propose
**Topic key**: `sdd/atlas-cli/proposal`
**Project**: home (atlas monorepo)
**Date**: 2026-04-14

---

## What
Build `atlas`, a cross-platform single-binary CLI for the Atlas API (Go + chi at `100.71.66.54:4000`), covering 90% of daily task / time-entry / habit interactions from the terminal. Ships under `apps/cli/` in the existing atlas monorepo.

## Why
Daily interactions with Atlas (creating tasks, starting timers, checking habits) are friction-heavy through the web UI. A keyboard-first CLI cuts the loop to one command. A single binary avoids runtime dependencies, works over Tailscale/NetBird, and integrates with shell pipelines (`--json | jq`).

## Where
- `/home/mx/Repos/atlas/apps/cli/` — new Go module (cobra + viper + lipgloss + stdlib `net/http`)
- `~/.config/atlas/config.toml` (mode 0600) — user config
- `/home/mx/Repos/atlas/.goreleaser.yaml` — release pipeline
- `/home/mx/Repos/atlas/docs/sdd/atlas-cli/` — SDD artifacts

## Learned / decisions locked
- **Binary name**: `atlas` (rename to `atl` in v0.2 only if conflict reported).
- **Habit streaks v1**: client-side compute from `/habits/{id}` completions; server endpoint deferred to v0.2 to keep API untouched.
- **Auth in v1**: ship without; HTTP client always sends `Authorization: Bearer <t>` if present in config so v0.2 server middleware lights up with zero CLI changes.
- **Stack**: cobra (commands) + viper (config/env) + lipgloss (rendering) + stdlib `net/http` (no client dep).
- **Date parsing**: `araddon/dateparse` for friendly inputs ("tomorrow 9am", "monday").
- **Output modes**: pretty table default; `--json` raw API response; `-v` debug to stderr.
- **Config precedence**: flag > env (`ATLAS_SERVER`, `ATLAS_TOKEN`) > config file > defaults.
- **Date display**: local time; sent as RFC3339 UTC.
- **Errors → exit codes**: 0 ok, 1 user error, 2 server error, 3 network.

---

## Goal
Cross-platform single-binary CLI covering 90% of daily Atlas interactions; zero runtime dependencies; pipeline-friendly JSON mode.

## In scope (v1.0)

### Commands
- `atlas new "title" [-p PROJECT] [-d DUE] [--prio P] [--energy E] [-t TAG,TAG] [--type TYPE]` — alias of `tasks add`
- `atlas tasks {list|add|get|edit|done|start|rm|events}` (all server filters supported on `list`)
- `atlas time {start <task>|stop|list|add|rm}` via timer endpoints
- `atlas projects {list|add|get|edit|archive|rm}`
- `atlas habits {list|add|check <id> [--value N]|streak <id>|rm}` (streak client-computed)
- `atlas config {get|set|path}`
- `atlas status` — server health check

### Cross-cutting
- Global flags: `--server URL`, `--json`, `--no-color`, `-v` (debug)
- Pagination: `--all` auto-fetches using `meta.total`
- Bearer-token-ready HTTP client (auth off in v1)
- GoReleaser cross-compile: linux/darwin/windows × amd64/arm64
- CI: lint + test + build wired into existing atlas monorepo CI (verify or add)

## Out of scope (deferred)
- TUI mode (`atlas tui` via bubbletea) — v0.2
- Offline mode + local SQLite cache + sync queue — v0.3
- Shared `packages/go-types` extraction (duplicate types in v1) — v0.2
- Server-side `/habits/{id}/streak` endpoint — v0.2 (coordinated)
- Recurrence UX beyond raw string pass-through — v0.2
- Bearer-token enforcement (coordinated with API middleware) — v0.2

## Approach (phased)
1. **Scaffold**: `apps/cli/` go.mod, cobra root, config (viper), HTTP client w/ envelope decoding.
2. **Tasks**: implement `tasks` group + `new` alias; smoke-test against local dev API.
3. **Time / Projects / Habits**: implement remaining groups.
4. **Polish**: lipgloss tables, colors, `--json` parity for every command.
5. **Release**: GoReleaser config, README install + first-run, tag v0.1.0.

## Options considered
- **Cobra+Viper vs urfave/cli**: cobra chosen for nested command ergonomics + autocomplete generation matching expected size.
- **Lipgloss vs tablewriter**: lipgloss aligns with future bubbletea TUI; consistent styling.
- **Resty vs stdlib net/http**: stdlib chosen — one less dep, full control over envelope unmarshaling.
- **Monorepo vs separate repo**: monorepo (locked in exploration) — shared CI, easier type sync later.

## Risks
- **API drift**: types duplicated in CLI may diverge from server. *Mitigation*: contract tests hitting real API in CI; extract shared `packages/go-types` in v0.2.
- **Auth retrofitting**: shipping without auth normalizes unauthenticated traffic. *Mitigation*: client always sends bearer if present; v0.2 enables enforcement server-side.
- **Date parsing ambiguity**: `araddon/dateparse` prefers US format. *Mitigation*: document examples; allow ISO override.
- **Binary name collision**: low probability on user's box. *Mitigation*: cobra-cli rename to `atl` if reported.

## Rollback
v1 is additive — new directory under `apps/cli/`. Rollback = remove directory + revert GoReleaser config; no API/DB impact.

## Verification plan
- Unit tests for config precedence + envelope decoding + date parsing.
- Integration tests against ephemeral API (docker-compose) for each command.
- Manual smoke test on linux/amd64 + darwin/arm64 before tag.
- `atlas tasks list --json | jq '.data[0]'` must succeed.

## Done criteria (binary)
- [ ] Binary compiles for linux/darwin/windows × amd64/arm64
- [ ] All 5 command groups functional against real Atlas API
- [ ] `atlas tasks list --json` parses cleanly with `jq`
- [ ] README with install + first-run walkthrough
- [ ] v0.1.0 published via GoReleaser in atlas repo

## Specialist invocations
- `@code-reviewer` after Phase 3 (all command groups landed).
- `@code-reviewer` again before tagging v0.1.0.

## Open unknowns (non-blocking)
- Existing atlas monorepo CI shape (GitHub Actions vs other) — verify in sdd-spec.
- Whether `apps/cli/` should share `go.mod` with any existing Go module under `apps/` — verify in sdd-spec.
