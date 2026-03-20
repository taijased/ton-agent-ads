---
date: 2026-03-14
researcher: OpenCode (gpt-5.4)
feature: repo-cleanup
primary_source: apps/agent/docs/repo-consistency-audit/research.md
---

# Research: Repo Cleanup

## Summary

- This cleanup is a high-risk repo alignment task because it spans root config, multiple apps, shared packages, and repository workflow contracts.
- The strongest confirmed problems are contract drift, not feature bugs: env names drift from `.env.example`, app/package boundaries drift from `README.md`, and workflow quality gates drift from actual package scripts.
- Existing evidence in `apps/agent/docs/repo-consistency-audit/research.md:28` through `apps/agent/docs/repo-consistency-audit/research.md:104` is sufficient to design the fix without re-running broad discovery.

## Discovered Architecture

- The workspace root drives execution through `pnpm -r` scripts in `package.json:6-15`.
- `apps/api` is the main runtime surface today; it bootstraps Fastify, Telegram clients, repositories, and the imported `AgentService` in `apps/api/src/app.ts:1-127`.
- `apps/agent` is packaged like a reusable module with `name: "@repo/agent"` and export metadata in `apps/agent/package.json:2-18`, but its code surface is only a barrel export in `apps/agent/src/index.ts:1`.
- Shared configuration and infrastructure are partially modeled in `packages/`, but several packages are bypassed or unused: `packages/config/src/index.ts:1-11`, `packages/mtproto/src/index.ts:1-18`, and `packages/ton/src/index.ts:1-7`.

## Existing Patterns To Reuse

- The repo already treats `.env.example` as the declared contract in `AGENTS.md:28-51`; the cleanup should preserve that single-source-of-truth model rather than introducing app-specific env contracts.
- Shared ownership is already expected to live in `packages/` according to `README.md:26-32` and `prompts/architecture/repo-model.md:13-16`.
- Build and verification are already centralized at the root in `package.json:6-15`, which can be extended for lint/typecheck/test consistency instead of inventing one-off app scripts.

## Integration Points

- Env cleanup touches root env files and all runtime readers, especially `apps/api/src/index.ts:7-8`, `packages/db/src/infrastructure/prisma-client.ts:5-20`, `scripts/bootstrap-telegram-session.ts:7-11`, and `apps/bot/src/api.ts:15`.
- Ownership cleanup touches `apps/api/package.json:16-19`, `apps/api/src/app.ts:4-97`, `apps/agent/package.json:2-22`, and whichever shared package becomes the real owner of reusable orchestration code.
- Quality-gate cleanup touches root and workspace package scripts because commands and workflows require `lint`, `tests`, and `build` at `.codex/commands/implement_backend.md:48-54` and `workflows/feature_backend.md:75-80`.
- Documentation cleanup touches `README.md:17-76` and any repo guide that currently describes outdated app boundaries or startup commands.

## Shared Ownership Notes

- Reusable orchestration code must not stay owned by `apps/agent` if `apps/api` imports it as a library; this violates the repository app/package boundary described in `README.md:17-32`.
- The existing `packages/agent-tools` package is a plausible landing zone only if its responsibility expands intentionally; otherwise a new shared package is cleaner than overloading a narrow package contract.
- The cleanup should prefer moving shared code into `packages/` over weakening the docs to normalize cross-app imports.

## Key Files

- `AGENTS.md:28`
- `README.md:22`
- `README.md:64`
- `package.json:6`
- `apps/api/package.json:16`
- `apps/api/src/app.ts:4`
- `apps/api/src/index.ts:7`
- `apps/agent/package.json:2`
- `apps/agent/package.json:17`
- `apps/agent/src/index.ts:1`
- `apps/bot/src/api.ts:15`
- `packages/config/src/index.ts:3`
- `packages/db/src/infrastructure/prisma-client.ts:5`
- `packages/mtproto/src/index.ts:10`
- `packages/ton/src/index.ts:3`
- `scripts/bootstrap-telegram-session.ts:7`
- `.codex/commands/implement_backend.md:48`
- `workflows/feature_backend.md:75`
