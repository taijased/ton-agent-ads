# Phase 3: Workspace Quality Gates

## Objective

Make root and workspace quality gates executable and deterministic so repository workflow requirements match reality.

## Dependencies

- Phase 2 complete if package extraction changes workspace build/test surfaces
- Root `package.json` and affected workspace manifests available for script updates

## Ordered Tasks

1. Audit current root and workspace scripts against required gates: `lint`, `typecheck`, `test`, and `build`.
2. Add missing root-level gate scripts and workspace coverage so `pnpm` commands resolve without missing-script failures.
3. Standardize test execution paths, including executable placeholder behavior only where real tests do not yet exist.
4. Confirm `build`, `dev`, and `start` script names remain honest about actual behavior after extraction.
5. Re-run workspace gates until the required root commands execute end to end.

## Scope Boundaries

- Do not weaken workflow requirements to match current gaps.
- Do not claim lint/test coverage that is not executable.
- Do not change runtime behavior unless needed to keep scripts honest.

## Verification

- Verify `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all execute from the repo root.
- Verify no workspace package required by the root gate chain fails due to missing scripts.
- Verify placeholder test behavior, if used, is deterministic and documented for the final docs pass.

## Stop / Rollback Conditions

- Stop if a required gate can only pass by silently skipping affected packages.
- Roll back script aliases that misrepresent watch-only or partial commands as full runtime/start commands.
