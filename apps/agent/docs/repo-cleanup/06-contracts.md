# Contracts

## Environment Contract

- Source of truth remains `.env.example:1-14`.
- Required action: either document `HOST`, `PORT`, and `NODE_ENV` there or explicitly remove them as supported repo-level configuration inputs.
- Required action: remove or rename legacy `API_ID`, `API_HASH`, `TON_RPC`, `TG_API_ID_R`, and `TG_API_HASH_R` usage unless those names are intentionally added to `.env.example`.
- Required action: align `EnvConfig` in `packages/types/src/campaign.ts:283-290` and `createEnv` in `packages/config/src/index.ts:3-10` with the final declared env namespace.

## Package Ownership Contract

- Apps are runnable surfaces; packages are reusable surfaces.
- Required action: stop publishing reusable orchestration behavior from `apps/agent/package.json:2-18` if that code is consumed by other apps.
- Required action: publish shared orchestration behavior from a package under `packages/` and update imports accordingly.

## Workspace Script Contract

- Root scripts must expose the required quality gates in a way that matches workflow docs.
- Required action: add root and workspace `lint` coverage and standardize test execution paths.
- Required action: keep `build` and `start` commands honest about what they do; if `pnpm dev` remains watch-only, docs must say so.

## Documentation Contract

- `README.md` and related repo docs must describe current ownership and startup behavior only.
- Required action: update app role descriptions after package extraction and runtime-entrypoint cleanup.
