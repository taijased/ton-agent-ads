# Phase 1: Env Contract Alignment

## Objective

Make `.env.example` the single active env contract and align all runtime readers, bootstrap scripts, and shared env typing to that namespace.

## Dependencies

- Approved design package in `apps/agent/docs/repo-cleanup/`
- No dependency on later phases

## Ordered Tasks

1. Inventory every active env read in the confirmed scope: `apps/api`, `apps/bot`, `packages/config`, `packages/db`, and `scripts/bootstrap-telegram-session.ts`.
2. Decide the final supported names by following the approved contract direction: document `HOST`/`PORT`/`NODE_ENV` if intentionally supported, otherwise remove them as repo inputs.
3. Remove or rename legacy env reads that are not allowed by `.env.example`, including stale Telegram and TON names unless intentionally adopted into the contract.
4. Update shared env typing and config helpers so typed config matches the final namespace exactly.
5. Fix bootstrap validation and failure text so required-variable checks and error messages reference the same names.

## Scope Boundaries

- Do not introduce app-specific env contracts outside `.env.example`.
- Do not add unrelated runtime defaults or config refactors.
- Do not change product behavior beyond env-name alignment.

## Verification

- Verify every env read in the scoped files is declared in `.env.example`.
- Verify removed env names no longer appear in runtime code or shared env types.
- Verify bootstrap script validation fails with the final supported variable names only.
- Run focused checks for touched packages/apps, then `pnpm typecheck`.

## Stop / Rollback Conditions

- Stop if a required runtime variable cannot be mapped cleanly to the approved contract without expanding scope.
- Roll back partial aliasing that leaves both legacy and final names active unless the approved contract is updated first.
