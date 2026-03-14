# Phase 2: Shared Ownership Extraction

## Objective

Move reusable orchestration behavior out of `apps/agent` into `packages/` and retarget consuming imports so apps are runnable surfaces, not shared libraries.

## Dependencies

- Phase 1 complete if extracted code relies on env typing or config helpers
- Final package destination chosen within `packages/`

## Ordered Tasks

1. Identify the reusable orchestration surface currently consumed by `apps/api` from `@repo/agent`.
2. Create or repurpose the package-owned shared module under `packages/` with a clear public entrypoint and package metadata.
3. Move only reusable orchestration primitives into the package; keep app-local runtime composition and entrypoints in `apps/agent`.
4. Update `apps/api` imports and dependencies to the shared package owner.
5. Remove `apps/agent` package metadata or exports that advertise app-owned code as reusable if they are no longer valid.

## Scope Boundaries

- Do not move app-local wiring, process startup, or runtime-only composition into `packages/`.
- Do not normalize cross-app imports by documentation-only changes.
- Do not expand extraction into unrelated shared code cleanup.

## Verification

- Verify `apps/api` no longer depends on `apps/agent` for reusable orchestration behavior.
- Verify the extracted package builds independently and exposes a stable entrypoint.
- Verify `apps/agent` still has a truthful runtime/app surface after extraction.
- Run focused tests for extracted logic, then `pnpm typecheck` and `pnpm build`.

## Stop / Rollback Conditions

- Stop if extraction crosses into app-local infrastructure and requires broader architecture changes.
- Roll back any move that leaves circular dependencies between `apps/agent`, `apps/api`, and the new shared package.
