# Phase 4: Docs and Runtime Corrections

## Objective

Align README and runtime-facing docs with the corrected env contract, package ownership, and executable workspace commands.

## Dependencies

- Phase 1 complete for env contract wording
- Phase 2 complete for ownership wording
- Phase 3 complete for startup and quality-gate wording

## Ordered Tasks

1. Update `README.md` app-role descriptions to reflect the post-extraction app/package boundary.
2. Correct startup guidance so documented commands match actual `dev` and `start` behavior.
3. Update `apps/agent` runtime documentation or package scripts to remove any ambiguous runtime-entrypoint claims.
4. Align any nearby repo docs that still mention outdated ownership or startup behavior.
5. Do a final consistency pass across docs, scripts, and package metadata before handoff.

## Scope Boundaries

- Do not use docs edits to compensate for incomplete code or script changes.
- Do not broaden this phase into new onboarding or product documentation.

## Verification

- Verify `README.md` statements match executable scripts and current package ownership.
- Verify `apps/agent` no longer advertises a misleading runtime command or ambiguous entrypoint.
- Verify the final documented bootstrap path matches actual workspace behavior.
- Re-run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` after doc-adjacent script changes.

## Stop / Rollback Conditions

- Stop if any doc statement still depends on behavior not yet made true in code or scripts.
- Roll back wording that describes intended future architecture rather than the implemented state.
