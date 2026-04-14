# Tasks: atlas-cli

Auto-applied end-to-end by sdd-apply. Each Task Group = one commit. Work them linearly.

## Commit Sequence (linear)

1. `feat(cli): scaffold cobra root` (Group 1)
2. `feat(cli): config loader + HTTP client with envelope handling` (Group 2)
3. `feat(cli): rendering (lipgloss tables, JSON, friendly dates)` (Group 3)
4. `feat(cli): tasks commands + quick-capture alias` (Group 4)
5. `feat(cli): time/projects/habits/config/status commands` (Group 5)
6. `ci(cli): release-please + goreleaser for atlas-cli` (Group 6)
7. `docs(cli): README + install guide` (Group 7)
8. PR + merge + release-please tag (Group 8)

All commits land on branch `feat/atlas-cli`.

---

## Phase 1 — Scaffold (commit 1)

- [ ] 1.1 `mkdir -p /home/mx/Repos/atlas/apps/cli/{cmd/atlas,internal}` and create dir tree
- [ ] 1.2 `cd apps/cli && go mod init github.com/MiguelAguiarDEV/atlas/apps/cli`
- [ ] 1.3 Add deps: `go get github.com/spf13/cobra@latest github.com/spf13/viper@latest github.com/charmbracelet/lipgloss@latest github.com/araddon/dateparse@latest`
- [ ] 1.4 Create `apps/cli/cmd/atlas/main.go` — minimal cobra root prints "atlas CLI"
- [ ] 1.5 Verify `go build ./... && ./atlas --help`
- [ ] 1.6 Commit: `feat(cli): scaffold cobra root`

## Phase 2 — Config + HTTP client (commit 2)

- [ ] 2.1 `apps/cli/internal/config/config.go` — viper wrapper: load TOML from `~/.config/atlas/config.toml`, flag/env/file precedence, ensure mode 0600 on write
- [ ] 2.2 `apps/cli/internal/model/{task,project,time_entry,habit}.go` — mirror API models
- [ ] 2.3 `apps/cli/internal/errors/codes.go` — exit code constants 0..4 (success/usage/network/server/auth)
- [ ] 2.4 `apps/cli/internal/client/client.go` — HTTP wrapper with response envelope unwrap, Bearer auth, context timeout, verbose logging
- [ ] 2.5 `apps/cli/internal/client/{tasks,time,projects,habits}.go` — typed methods per resource
- [ ] 2.6 Unit tests with `httptest` for client methods (envelope unwrap, auth header, error mapping)
- [ ] 2.7 Commit: `feat(cli): config loader + HTTP client with envelope handling`

## Phase 3 — Rendering (commit 3)

- [ ] 3.1 `apps/cli/internal/render/output.go` — JSON vs table switch from `--output` flag
- [ ] 3.2 `apps/cli/internal/render/table.go` — lipgloss table with auto-fit + truncate
- [ ] 3.3 `apps/cli/internal/render/datefmt.go` — `araddon/dateparse` input + local-time display
- [ ] 3.4 Golden-file tests for table rendering (`testdata/*.golden`)
- [ ] 3.5 Commit: `feat(cli): rendering (lipgloss tables, JSON, friendly dates)`

## Phase 4 — Task commands (commit 4)

- [ ] 4.1 `apps/cli/internal/cmd/root.go` — root cobra cmd with persistent flags (`--output`, `--config`, `--verbose`, `--api-url`)
- [ ] 4.2 `apps/cli/internal/cmd/task.go` — subcommands: list, add, get, edit, done, start, rm, events
- [ ] 4.3 `apps/cli/internal/cmd/new.go` — top-level `atlas new "title"` quick-capture alias
- [ ] 4.4 Wire root in `apps/cli/cmd/atlas/main.go`
- [ ] 4.5 Build binary and run `--help` for each subcommand to smoke-test
- [ ] 4.6 Commit: `feat(cli): tasks commands + quick-capture alias`

## Phase 5 — Time / Projects / Habits / Config / Status (commit 5)

- [ ] 5.1 `apps/cli/internal/cmd/time.go` — time subcommands hitting timer endpoints
- [ ] 5.2 `apps/cli/internal/cmd/project.go` — project subcommands + archive
- [ ] 5.3 `apps/cli/internal/cmd/habit.go` — habit subcommands + client-side streak compute from events
- [ ] 5.4 `apps/cli/internal/cmd/config.go` — `config get/set/path`
- [ ] 5.5 `apps/cli/internal/cmd/status.go` — server health check
- [ ] 5.6 Commit: `feat(cli): time/projects/habits/config/status commands`

## Phase 6 — CI + release (commit 6)

- [ ] 6.1 `/home/mx/Repos/atlas/.github/workflows/ci.yml` — `go vet`, `go test`, `go build` on PR + push
- [ ] 6.2 `/home/mx/Repos/atlas/.github/workflows/release-please.yml` — monorepo config, component `cli`
- [ ] 6.3 `/home/mx/Repos/atlas/release-please-config.json` — packages.`apps/cli` (release-type=go, component=cli, tag-prefix=`cli-v`)
- [ ] 6.4 `/home/mx/Repos/atlas/.release-please-manifest.json` — `{"apps/cli": "0.0.0"}`
- [ ] 6.5 `/home/mx/Repos/atlas/apps/cli/.goreleaser.yaml` — cross-compile 6 targets (linux/darwin/windows × amd64/arm64)
- [ ] 6.6 Add `cli-goreleaser` job to release-please.yml that fires when `release_created==true` for path `apps/cli`
- [ ] 6.7 Commit: `ci(cli): release-please + goreleaser for atlas-cli`

## Phase 7 — Docs (commit 7)

- [ ] 7.1 `/home/mx/Repos/atlas/apps/cli/README.md` — install, first-run walkthrough, examples
- [ ] 7.2 Update `/home/mx/Repos/atlas/README.md` with CLI install section + link
- [ ] 7.3 Commit: `docs(cli): README + install guide`

## Phase 8 — PR + merge + release

- [ ] 8.1 Push branch `feat/atlas-cli`
- [ ] 8.2 Open PR with `gh pr create --fill`
- [ ] 8.3 Wait CI green
- [ ] 8.4 Merge with squash
- [ ] 8.5 Watch release-please open release PR for `cli-v0.1.0`
- [ ] 8.6 Merge release PR
- [ ] 8.7 Verify `cli-v0.1.0` tag created + binaries published in GitHub release

---

## Deferred to v0.2 (tracking — NOT this change)

- TUI mode
- Offline mode
- `/habits/{id}/streak` server endpoint
- Shared `packages/go-types` extraction
- Bearer-token middleware coordination
