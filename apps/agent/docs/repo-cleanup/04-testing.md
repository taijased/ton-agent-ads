# Testing Strategy

## Required Verification

- Typecheck: root workspace command plus any affected app/package typechecks.
- Lint: root workspace lint after lint scripts/config are introduced.
- Tests: root workspace tests, plus focused tests for any extracted shared orchestration package and touched runtime readers.
- Build: root workspace build after ownership and script changes land.

## Task-Specific Verification

### Env Contract Checks

- Verify every env read has a declared entry in `.env.example`.
- Verify removed env names no longer appear in TypeScript env types or runtime readers.
- Verify bootstrap utility failure messages mention the actual required variable names.

### Ownership Checks

- Verify `apps/api` no longer imports shared logic from `apps/agent`.
- Verify extracted shared package has a clear public entrypoint and builds independently.
- Verify `apps/agent` still builds and either starts meaningfully or no longer advertises a misleading runtime command.

### Docs Checks

- Verify `README.md` startup instructions match executable scripts.
- Verify package/app ownership statements match import reality after the extraction.

## Regression Surface

- API boot and Fastify composition in `apps/api/src/app.ts:26-127`
- API startup defaults in `apps/api/src/index.ts:5-20`
- DB client bootstrap in `packages/db/src/infrastructure/prisma-client.ts:5-20`
- Telegram bootstrap script in `scripts/bootstrap-telegram-session.ts:7-38`

## Exit Criteria

- No missing-script failures for required workspace quality gates.
- No repo code reads undeclared env names.
- No reusable import path points at an app-owned package.
- No major README statement contradicts executable behavior.
