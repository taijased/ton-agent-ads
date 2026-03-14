# Behavior

## User-Visible Outcome

- A developer can bootstrap the repo using documented commands that actually start the intended surfaces.
- A developer can trust `.env.example` as the complete env contract.
- Shared runtime logic has a clear owner in `packages/`, so imports follow repository boundaries.
- Quality gates described by the workflow docs can be run exactly as documented.

## Functional Behavior

### Env Alignment

- Replace undeclared env reads with declared names or add the missing names to `.env.example` when they are truly required.
- Remove stale names from shared env typing when they are no longer consumed.
- Fix bootstrap utility validation so the checked names and the error message match the same contract.

Success condition: the env names read in `apps/api/src/index.ts:7-8`, `packages/db/src/infrastructure/prisma-client.ts:5-20`, `apps/bot/src/api.ts:15`, and `scripts/bootstrap-telegram-session.ts:7-11` are all represented consistently in `.env.example` and any shared env types.

### Ownership Alignment

- Extract the reusable orchestration service currently imported from `@repo/agent` into a shared package.
- Keep `apps/agent` focused on runnable orchestration composition and app-local entrypoints.
- Update API imports and package dependencies to point at the shared owner.

Success condition: `apps/api` no longer depends on an app package for reusable orchestration behavior.

### Verification Alignment

- Introduce executable lint coverage for the workspace.
- Add explicit test script policy for apps/packages without tests yet: either real tests or a documented, executable placeholder strategy that keeps root commands deterministic.
- Keep build behavior unchanged unless required by the ownership extraction.

Success condition: the repository can run documented quality gates without missing-script failures.

### Docs Alignment

- Update repo docs so they describe the corrected ownership and startup model.
- Remove claims that `pnpm dev` starts runtimes if it only starts compilers/watchers, unless implementation changes the scripts to make the claim true.

Success condition: `README.md` and related docs no longer contradict actual workspace behavior.

## Edge Cases

- Optional env defaults such as `HOST`, `PORT`, or `API_BASE_URL` may stay optional, but if code relies on them as configurable inputs they still need documented treatment in `.env.example` or an explicit policy note.
- If the extracted shared agent code pulls in app-local infrastructure, the extraction must stop at the correct boundary and introduce interfaces rather than moving app runtime concerns into `packages/`.
- If a full lint rollout is too large for one phase, root docs must not be updated until the scripts are real.
