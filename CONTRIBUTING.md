# Contributing to GrowLab

Thanks for considering a contribution.

GrowLab is a local-first homelab project. Contributions should preserve that boundary: predictable LAN/VPN operation, explicit configuration, no hidden cloud dependency and no automatic physical actions without a reviewed design.

## Development Setup

Prerequisites:

- Go
- Node.js
- pnpm
- Docker with the Compose plugin
- PostgreSQL/TimescaleDB for database-backed work
- goose
- sqlc

Install frontend dependencies:

```bash
pnpm install
```

Generate code:

```bash
make sqlc
make openapi-generate
```

Validate local configuration:

```bash
make docker-config
make security-check
```

## Lightweight Checks

Use targeted checks while developing:

```bash
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
pnpm --filter @growlab/web exec eslint .
GOCACHE=/tmp/growlab-go-build go list ./apps/api/... ./workers/growlab-worker/...
git diff --check
```

Heavy commands such as `go test ./...`, `go build ./...` and `pnpm build` can be useful before releases, but they are intentionally not wired as automatic default commands.

## Guardrails

Do not enable these without an explicit design and review:

- authentication changes;
- irrigation automation;
- pump or relay commands;
- AI workflows;
- rules engine execution;
- internet exposure assumptions;
- cloud-only dependencies.

Irrigation must stay disabled unless a future safety design changes that. AI/Ollama must stay advisory and disabled by default.

## Pull Requests

Good pull requests include:

- a concise description of the change;
- linked issue or motivation;
- migration notes when the database changes;
- OpenAPI/client regeneration when the contract changes;
- screenshots for frontend UI changes;
- the exact checks you ran.

Keep changes focused. Avoid unrelated refactors in feature PRs.

## Database Changes

Database changes must use goose migrations under `database/migrations`.

When changing query shape:

```bash
make sqlc
```

When changing API payloads:

```bash
make openapi-generate
```

## Documentation

Public documentation must avoid local usernames, private paths, real secrets and environment-specific assumptions. Use generic placeholders such as:

- `app-host`
- `db-host`
- `monitoring-host`
- `homelab-monitoring`
