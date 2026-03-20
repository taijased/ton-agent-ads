# Architecture

## Problem Framing

The repository has one main consistency failure mode: declared contracts say one thing while runtime code and workspace scripts do another. The cleanup architecture therefore focuses on contract restoration, not feature expansion.

## Target State

### 1. Environment Contract Layer

- `.env.example` becomes the only declared env namespace.
- Every runtime reader uses names declared there.
- Deprecated env names are removed from typed config and scripts.
- Runtime-only defaults remain explicit in code only when they are intentionally optional.

Affected boundaries:

- root env contract: `.env.example:1-14`
- API runtime entry: `apps/api/src/index.ts:5-10`
- DB bootstrap: `packages/db/src/infrastructure/prisma-client.ts:5-20`
- Telegram bootstrap utility: `scripts/bootstrap-telegram-session.ts:7-11`

### 2. Shared Ownership Layer

- `apps/agent` becomes app-owned runtime/orchestration code only.
- Reusable orchestration primitives currently imported by `apps/api` move into `packages/`.
- `apps/api` depends on the shared package instead of importing an app package.

Affected boundaries:

- current cross-app coupling: `apps/api/src/app.ts:4-97`
- current app-as-package metadata: `apps/agent/package.json:2-18`
- existing package ownership contract: `README.md:26-32`

### 3. Workspace Verification Layer

- Root and workspace scripts expose real `lint`, `typecheck`, `test`, and `build` commands.
- Commands/workflows keep their current gate expectations; the codebase becomes compliant with them.
- Verification remains centralized at the workspace root.

Affected boundaries:

- required gates: `.codex/commands/implement_backend.md:48-54`, `workflows/feature_backend.md:75-80`
- current root scripts: `package.json:6-15`

### 4. Docs and Runtime Surface Layer

- `README.md` describes the actual startup model and app boundaries.
- `apps/agent` either gains a real runtime entrypoint or is documented as a runtime package/app split after extraction; the implementation must choose one approved path and remove the current ambiguous state.

Affected boundaries:

- misleading app description: `README.md:22-24`
- misleading getting-started flow: `README.md:64-68`
- ambiguous agent start path: `apps/agent/package.json:17`, `apps/agent/src/index.ts:1`

## Proposed Workstreams

1. Contract cleanup: env names, bootstrap script messages, typed env surface, and docs.
2. Ownership cleanup: extract reusable agent logic into `packages/`, then retarget imports.
3. Quality-gate cleanup: add executable lint/test/typecheck scripts across the workspace.
4. Documentation cleanup: update repo docs to match the corrected ownership and runtime commands.

## Boundary Rules

- No app may be the reusable owner of code imported by another app.
- No env variable may be read from code unless it exists in `.env.example`.
- No workflow doc may claim a standard gate that the workspace cannot execute.
- Docs must describe the actual runtime entrypoints, not planned ones.
