# Repo Cleanup Implementation Plan

- Status: ready for implementation
- Primary owner: `apps/agent`
- Based on approved design package in `apps/agent/docs/repo-cleanup/`

## Phase Order

1. `01-env-contract-alignment.md`
2. `02-shared-ownership-extraction.md`
3. `03-workspace-quality-gates.md`
4. `04-docs-and-runtime-corrections.md`

## Scope Boundaries

- In scope only: env contract alignment, shared ownership extraction out of `apps/agent`, executable workspace quality gates, and README/runtime script corrections.
- Out of scope: Prisma schema changes, product-flow behavior changes, and new external integrations or deployment manifests.
- Documentation changes must trail code and script truth; do not use docs edits to mask unfinished runtime or script work.

## Global Dependencies

- Phase 1 establishes the final env namespace used by later phases.
- Phase 2 may add or move shared package build/test requirements consumed by Phase 3.
- Phase 3 must be real before Phase 4 updates workflow-facing docs and startup guidance.

## Global Validation Gates

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Global Stop Conditions

- Stop if implementation requires adding new env names that are outside the approved contract direction in `apps/agent/docs/repo-cleanup/06-contracts.md`.
- Stop if shared orchestration extraction would pull app-local runtime wiring into `packages/` instead of introducing a clean package boundary.
- Stop if root quality gates cannot be made executable without changing the documented cleanup scope.
