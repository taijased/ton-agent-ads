# Repo Cleanup Design

- Status: ready for human approval
- Primary owner: `apps/agent`
- Scope: repo-wide consistency cleanup driven by `apps/agent/docs/repo-consistency-audit/research.md`

## Goal

Bring repository contracts back into alignment by fixing the confirmed inconsistencies in environment-variable policy, shared ownership boundaries, runnable app expectations, and workspace quality-gate scripts.

## Design Package

- Research: `apps/agent/docs/repo-cleanup/research.md`
- Architecture: `apps/agent/docs/repo-cleanup/01-architecture.md`
- Behavior: `apps/agent/docs/repo-cleanup/02-behavior.md`
- Decisions: `apps/agent/docs/repo-cleanup/03-decisions.md`
- Testing: `apps/agent/docs/repo-cleanup/04-testing.md`
- Contracts: `apps/agent/docs/repo-cleanup/06-contracts.md`

## In Scope

- Align `.env.example`, runtime env reads, bootstrap scripts, and env typing with the repo env contract documented in `AGENTS.md:28`.
- Realign shared orchestration ownership so app code is not imported as a reusable library from another app (`apps/api/src/app.ts:4`, `apps/api/package.json:16`).
- Make workspace quality gates real and executable instead of documented-only requirements (`commands/implement_backend.md:48`, `workflows/feature_backend.md:75`, `package.json:6`).
- Correct repo and app docs so runnable surfaces and startup commands match the actual workspace behavior (`README.md:22`, `README.md:64`, `apps/agent/package.json:17`, `apps/agent/src/index.ts:1`).

## Out of Scope

- Prisma schema changes; the audit found no confirmed schema mismatch.
- Product behavior changes in campaign, deal, or negotiation flows.
- New external integrations or deployment manifests beyond consistency fixes.

## Architect Review

- Boundary check: shared runtime logic moves out of app-local ownership; `apps/agent` remains an app, reusable code lives in `packages/`.
- Contract check: env names, package scripts, and docs become consistent with the repository contracts already declared in `AGENTS.md:28`, `commands/implement_backend.md:48`, and `workflows/feature_backend.md:75`.
- Risk check: no DB/schema change; cleanup is staged around contracts, scripts, and packaging boundaries.
- Verdict: `READY`

## Approval Request

If approved, the implementation plan will be created next in `apps/agent/docs/repo-cleanup/plan/`.
