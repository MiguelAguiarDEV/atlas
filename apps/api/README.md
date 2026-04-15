# atlas API

Go + chi HTTP API for atlas. Persists tasks, projects, time entries, and habits in Postgres.

## Run

```sh
# required
export DATABASE_URL="postgres://user:pass@host:5432/atlas?sslmode=disable"

# optional
export PORT=4000
export ATLAS_API_TOKEN=""  # see Auth below

go run ./cmd/atlas
```

## Auth — opt-in bearer token

The API ships **unauthenticated by default** and relies on network-level
access control (Tailscale, private VPC, etc.). A static bearer-token
middleware can be enabled by setting an env var — no code changes, no
redeploy required beyond restarting the process.

### Enable

Generate a token and export it before starting the API:

```sh
export ATLAS_API_TOKEN=$(openssl rand -hex 32)
go run ./cmd/atlas
# log line: "bearer auth enabled"
```

When `ATLAS_API_TOKEN` is unset (or empty), the middleware is not
registered and every request is accepted — log line:
`bearer auth DISABLED — set ATLAS_API_TOKEN to enable`.

Endpoints bypassed from auth (liveness probes):

- `GET /health`
- `GET /api/v1/status`

All other routes require `Authorization: Bearer <token>`. Invalid or
missing credentials return HTTP 401 with the standard envelope:

```json
{ "data": null, "error": "missing bearer token" }
```

### Pass the token from atlas-cli

The CLI is bearer-ready — it sends `Authorization: Bearer <token>` when
its config has a `token` entry:

```sh
# one-time: store the token in the CLI's config (yaml)
atlas config set token "$ATLAS_API_TOKEN"

# or re-use the server's env var transparently in a shell:
atlas config set token "$ATLAS_API_TOKEN"
```

If the CLI doesn't have a token set and the API requires one, every
call returns `401 missing bearer token`.

### Rotate

The token is a shared secret. To rotate:

1. Generate a new token: `NEW=$(openssl rand -hex 32)`
2. Restart the API with `ATLAS_API_TOKEN=$NEW`
3. Update every client: `atlas config set token "$NEW"`

There is no multi-token support — one active token at a time. For
zero-downtime rotation, run two API instances behind a load balancer
while clients are re-keyed.

### Security notes

- The comparison uses `crypto/subtle.ConstantTimeCompare` to avoid
  timing side channels.
- Tokens are **not** logged. Do not `GET /api/v1/tasks?token=...` —
  query strings are logged. Always use the `Authorization` header.
- This is a coarse authN layer — every valid token is fully
  authorized for every endpoint. It is designed to complement, not
  replace, network-level controls.
- Do **not** commit tokens to source control. Use your secret manager
  (1Password, Vault, `.env.local`) or the host's env-var injection.

## Tests

```sh
go test ./...
```
