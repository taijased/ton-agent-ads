---
date: 2026-03-14
researcher: OpenCode (gpt-5.4)
commit: 62a4030
branch: main
research_question: "Audit the entire repository for consistency problems, focusing on configuration, environment variables, shared modules, and mismatches between docs, code, and workflow rules."
---

# Research: Repo Consistency Audit

## Scope and Method

- Scope: full workspace audit across `apps/`, `packages/`, `prisma/`, root config, workflow docs, env files, and deployment/build files.
- Method: read the repository contracts (`AGENTS.md`, `.codex/config.toml`, `README.md`, `.codex/commands/`, `workflows/`), compared `.env.example` against code reads and `.env`, traced workspace package usage, reviewed Prisma schema and repository adapters, and ran `pnpm build` plus `pnpm -r test --if-present`.
- Verification results: `pnpm build` completed successfully on 2026-03-14; `pnpm -r test --if-present` ran only `apps/api` tests and they passed.

## Stack Context

- Runtime type: Node.js backend/runtime apps in `apps/api`, `apps/agent`, `apps/bot`; React/Vite frontend in `apps/miniapp`.
- Framework: Fastify in `apps/api` (`README.md:11`, `apps/api/src/app.ts:1`), grammY in `apps/bot` (`README.md:10`, `apps/bot/src/bot.ts:1`), React + Vite in `apps/miniapp` (`README.md:15`, `apps/miniapp/package.json:17`).
- Build: workspace `pnpm -r build` from root (`package.json:8`); TypeScript compile for backend packages/apps (`apps/api/package.json:8`, `packages/db/package.json:16`), Vite build for miniapp (`apps/miniapp/package.json:8`).
- Test: only `apps/api` declares a `test` script (`apps/api/package.json:11`); no other workspace package declares tests.
- Shared modules: `@repo/types`, `@repo/db`, `@repo/agent`, plus unused/shared packages discussed below.
- Relevant prompts: architecture, domain, style, testing, build paths configured in `.codex/config.toml:39-48`.

## Findings

### Environment Contract Mismatches

#### Confirmed

- Code reads env names that are not in the `.env.example` contract: `TG_API_ID_R` and `TG_API_HASH_R` are read in `scripts/bootstrap-telegram-session.ts:7` and `scripts/bootstrap-telegram-session.ts:8`, but `.env.example` contains neither name (`.env.example:1-14`); `PORT` and `HOST` are read in `apps/api/src/index.ts:7` and `apps/api/src/index.ts:8`, and `NODE_ENV` is read in `packages/db/src/infrastructure/prisma-client.ts:19`, but none of those names appear in `.env.example:1-14`.
- `.env` defines names outside the `.env.example` contract, which violates the repo env policy in `AGENTS.md`: `API_ID`, `API_HASH`, and `TON_RPC` are present in `.env:2`, `.env:3`, and `.env:4` but absent from `.env.example:1-14`; the same names still exist in the shared env type/config layer at `packages/types/src/campaign.ts:283-290` and `packages/config/src/index.ts:3-10`.
- `.env` contains duplicate names: `MTPROTO_SERVER_CONFIG_DEV` is defined twice at `.env:19` and `.env:29`, and `MTPROTO_SERVER_CONFIG_DEV_R` is defined twice at `.env:44` and `.env:55`.
- `.env.example` defines `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` at `.env.example:3-5`, but application code reads `DATABASE_URL` instead via `prisma.config.ts:15`, `prisma/seed.ts:5`, and `packages/db/src/infrastructure/prisma-client.ts:5`; the `POSTGRES_*` names are only consumed by local Docker defaults in `docker-compose.yml:7-9`.
- `scripts/bootstrap-telegram-session.ts` reads `_R`-suffixed names but throws a non-suffixed error message: reads occur at `scripts/bootstrap-telegram-session.ts:7-8`, while the error text says `TG_API_ID and TG_API_HASH are required` at `scripts/bootstrap-telegram-session.ts:11`.
- `TG_SESSION_STRING_R` is defined in `.env:42` but is not read anywhere in repository code; the bootstrap script only reads `TG_API_ID_R` and `TG_API_HASH_R` at `scripts/bootstrap-telegram-session.ts:7-8`.
- The legacy MTProto key material in `.env` is outside the contract and not read by code: `MTPROTO_SERVER_DEV`, `MTPROTO_SERVER_PROD`, `MTPROTO_SERVER_DEV_R`, and `MTPROTO_SERVER_PROD_R` are defined at `.env:20`, `.env:30`, `.env:46`, and `.env:56`, with no corresponding code reads found outside the env file.

#### Potential Risk

- The Prisma and API runtime paths depend on env names that are not documented in `.env.example` (`PORT`, `HOST`, `NODE_ENV`), so runtime behavior can vary by undeclared process-level configuration even when the repo contract is followed (`apps/api/src/index.ts:7-8`, `packages/db/src/infrastructure/prisma-client.ts:19`).

### Shared Modules, Packages, and Ownership

#### Confirmed

- `apps/api` depends on `@repo/agent` as if `apps/agent` were a reusable package: dependency declaration is in `apps/api/package.json:16`, and `AgentService` is imported in `apps/api/src/app.ts:4` and `apps/api/src/interfaces/http/agent-routes.ts:2`. The implementation itself lives in `apps/agent/src/agent-service.ts:13`, so reusable orchestration code is currently owned by another app rather than a package.
- `@ton-adagent/config` appears unused. The dependency is declared in `apps/api/package.json:19`, the package exports `createEnv` in `packages/config/src/index.ts:3`, and repository search found no code imports beyond those declaration sites.
- `@ton-adagent/agent-tools` appears unused. The package exists at `packages/agent-tools/package.json:2` and exports `NegotiationTool` at `packages/agent-tools/src/index.ts:3`, and repository search found no other references.
- `@ton-adagent/mtproto` appears unused. The package exists at `packages/mtproto/package.json:2` and exports `createMtprotoClient` at `packages/mtproto/src/index.ts:10`, but API-side MTProto wiring is implemented directly in `apps/api/src/infrastructure/telegram-user-client.ts:1-28` and `apps/api/src/infrastructure/telegram-admin-client.ts:1-20`.
- `@ton-adagent/ton` appears unused. The package exists at `packages/ton/package.json:2` and exports `TonWallet` / `createWalletAddress` at `packages/ton/src/index.ts:3-7`, and repository search found no consumers.

#### Potential Risk

- The documented package ownership in `README.md:27-32` does not match current runtime imports for MTProto/config/orchestration code, which increases the chance of app-local duplication and cross-app coupling. This is visible in `apps/api/src/app.ts:4-5`, `apps/api/src/infrastructure/telegram-user-client.ts:1-28`, and `packages/config/src/index.ts:3-10`.

### Unused Exports and Contract Drift

#### Confirmed

- These exports appear unused based on repository search evidence: `createEnv` (`packages/config/src/index.ts:3`), `NegotiationTool` (`packages/agent-tools/src/index.ts:3`), `createMtprotoClient` (`packages/mtproto/src/index.ts:10`), `TonWallet` (`packages/ton/src/index.ts:3`), and `createWalletAddress` (`packages/ton/src/index.ts:7`).
- `campaignStatuses` appears unused outside its own type declaration file: it is defined at `packages/types/src/campaign.ts:1` and only referenced again for type derivation at `packages/types/src/campaign.ts:51`; no runtime consumer was found.
- Campaign status values `paused` and `done` appear unused: they are declared at `packages/types/src/campaign.ts:5-6`, and no repository usage was found outside that type file.
- Deal status value `published` appears unused in runtime flows: it is declared at `packages/types/src/campaign.ts:24` and listed as a terminal state in `apps/api/src/application/deal-service.ts:97`, but no repository code writes `published` to a deal.
- Campaign status value `draft` is used only in placeholder/frontend type contexts, not in campaign persistence. It is declared in `packages/types/src/campaign.ts:2`, used for placeholder data in `apps/miniapp/src/App.tsx:18`, while new campaigns are persisted as `active` in `packages/db/src/infrastructure/prisma-campaign-repository.ts:74`.

#### Potential Risk

- Because campaign and deal statuses are stored as plain `String` fields in Prisma (`prisma/schema.prisma:24`, `prisma/schema.prisma:59`) while the TypeScript union includes values with no observed runtime path (`packages/types/src/campaign.ts:1-26`), type-level state catalogs can drift from persisted/runtime behavior without a schema gate.

### Docs and Workflow Mismatches

#### Confirmed

- `README.md` describes `apps/api` as `Campaign + database API only` at `README.md:22`, but the API app also instantiates Telegram clients (`apps/api/src/app.ts:55-58`) and starts the Telegram negotiation listener on app readiness (`apps/api/src/app.ts:106-118`).
- `README.md` recommends `pnpm dev` for getting started at `README.md:64-68`, but root `pnpm dev` fans out to workspace `dev` scripts via `package.json:7`; `apps/api` and `apps/agent` define `dev` as `tsc -w` only at `apps/api/package.json:7` and `apps/agent/package.json:15`, so the API server and agent runtime are not started by that command.
- Workflow/command docs require lint as a standard gate (`.codex/commands/implement_backend.md:48-52`, `.codex/commands/implement_frontend.md:38-42`, `workflows/feature_backend.md:75-80`, `workflows/feature_frontend.md:73-79`), but no workspace `package.json` defines a `lint` script: root `package.json:6-16`, `apps/api/package.json:6-12`, `apps/agent/package.json:14-18`, `apps/bot/package.json:6-10`, `apps/miniapp/package.json:6-10`, `packages/db/package.json:14-18`, `packages/types/package.json:14-18`, `packages/config/package.json:14-18`, `packages/agent-tools/package.json:14-18`, `packages/mtproto/package.json:14-18`, and `packages/ton/package.json:14-18` all omit `lint`.
- Workflow/command docs require tests as a standard gate for frontend and backend work (`.codex/commands/implement_backend.md:48-52`, `.codex/commands/implement_frontend.md:38-42`, `workflows/bug_backend.md:71-78`, `workflows/bug_frontend.md:70-77`), but only `apps/api` defines a `test` script at `apps/api/package.json:11`; root `package.json:6-16`, `apps/agent/package.json:14-18`, `apps/bot/package.json:6-10`, `apps/miniapp/package.json:6-10`, and all package `package.json` script blocks omit tests.
- `README.md` says `apps/agent` is a runnable negotiation/orchestration app at `README.md:23` and `apps/README.md:47-55`, but its entrypoint only re-exports a class (`apps/agent/src/index.ts:1`), while its start script still runs `node dist/index.js` (`apps/agent/package.json:17`).

### Prisma, Packages, and App Alignment

#### Confirmed

- No field-level Prisma/schema mismatch was confirmed between `prisma/schema.prisma:9-116` and the Prisma repositories in `packages/db/src/infrastructure/*.ts`; repository adapters map the current models and `pnpm build` succeeded.
- No app/package import mismatch was confirmed for `@repo/types` and `@repo/db`; both are actively consumed across apps (`apps/api/src/app.ts:5`, `apps/agent/src/agent-service.ts:1-11`, `apps/bot/src/bot.ts:2-10`, `apps/miniapp/src/App.tsx:1`).

#### Potential Risk

- The repo documents `packages/mtproto` and `packages/config` as shared ownership points (`README.md:29`, `README.md:32`), but live runtime code bypasses them (`apps/api/src/infrastructure/telegram-user-client.ts:1-28`, `apps/api/src/index.ts:1-10`, `apps/bot/src/api.ts:15`). That increases the chance that package-level contracts and app behavior diverge further.

### Runtime, Build, and Deployment Risks

#### Confirmed

- `pnpm build` succeeds for the current workspace state.
- `pnpm -r test --if-present` only exercises `apps/api`; no other workspace surface currently participates in automated tests because no other `test` script exists (`apps/api/package.json:11`; other package script blocks cited above omit tests).

#### Potential Risk

- API startup depends on Telegram credentials and MTProto connectivity because the app starts the negotiation listener in `onReady` (`apps/api/src/app.ts:106-118`), and listener startup requires `TG_API_ID`, `TG_API_HASH`, and `TG_SESSION_STRING` (`apps/api/src/infrastructure/telegram-user-client.ts:12-25`). Missing or invalid Telegram config can therefore block API readiness, not just negotiation features.
- The API test script points at `postgresql://postgres:postgres@localhost:5432/test` in `apps/api/package.json:11`, while the local Docker Postgres port published by `docker-compose.yml` is `5433` (`docker-compose.yml:5`). Current tests passed because they did not require the database, so the port mismatch is present but not exercised.
- Deployment/container coverage appears incomplete: `docker-compose.yml:1-14` only provisions Postgres, and `docker/README.md:3` says app containerization assets "will live here," which indicates the deployment surface is still placeholder documentation rather than versioned app manifests.

## Open Questions

- No confirmed production deployment manifests were found beyond local Postgres compose, so deployment expectations are not fully represented in the repository.
- No confirmed Prisma mismatch was found, but status contract drift remains possible because status fields are persisted as plain strings.
