## Summary

-

## Type

- [ ] Feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactor
- [ ] Infrastructure

## Checks

- [ ] `make sqlc`
- [ ] `make openapi-generate`
- [ ] `make docker-config`
- [ ] `make security-check`
- [ ] `pnpm --filter @growlab/web exec tsc --noEmit --pretty false`
- [ ] `pnpm --filter @growlab/web exec eslint .`
- [ ] `GOCACHE=/tmp/growlab-go-build go list ./apps/api/... ./workers/growlab-worker/...`
- [ ] `git diff --check`

## Safety

- [ ] Does not enable irrigation.
- [ ] Does not enable AI actions.
- [ ] Does not expose services publicly.
- [ ] Does not commit secrets or private paths.

## Notes

-
