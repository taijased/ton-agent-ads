# ton-adagent

Monorepo scaffold for a hackathon project: an AI agent that buys Telegram ads automatically using TON.

## Stack

- Monorepo: pnpm workspaces
- Language: TypeScript everywhere
- Backend runtime: Node.js
- Bot: grammY
- API: Fastify
- MTProto: gramjs
- TON: ton-core
- DB: PostgreSQL (`pg`)
- Miniapp: React + Vite

## Workspace layout

```
apps/
  bot/      # Telegram update handling only
  api/      # Campaign + database API only
  agent/    # Orchestration app/docs ownership; not a shared library
  miniapp/  # Frontend, calls API only

packages/
  agent/      # Shared agent orchestration primitives
  db/         # Postgres access layer
  types/      # Shared contracts/DTOs
  mtproto/    # Telegram user client wrapper
  ton/        # TON wallet/payment primitives
  agent-tools/# Agent-side ports/tooling contracts
  config/     # Shared environment config

prompts/      # Reusable local engineering guidance
workflows/    # Ordered command sequences
.opencode/    # Project-local OpenCode runtime agents and commands
.codex/       # Repo workflow policy, defaults, and reusable skills
```

## Clean architecture boundaries

- `apps/bot`: accepts Telegram updates, delegates only through application ports.
- `apps/api`: exposes HTTP endpoints for campaigns and persistence workflows.
- `apps/agent`: owns orchestration app-local code and repo-wide workflow docs; reusable agent services live in `packages/agent`.
- `packages/agent`: shared agent orchestration primitives consumed across apps.
- `packages/mtproto`: Telegram user account client operations.
- `packages/ton`: wallet/payment abstractions.
- `packages/db`: PostgreSQL infrastructure.
- `apps/miniapp`: UI client; communicates with API, not DB/TON/MTProto directly.

Each backend app/package is split into clean architecture folders (`domain`, `application`, `infrastructure`, `interfaces`) where applicable.

## Current demo flow

- Create a campaign from the Telegram bot with guided prompts for text, budget, theme, language, and goal
- Save the campaign through the Fastify API into PostgreSQL
- Submit a target Telegram channel from the bot
- Parse the channel and extract candidate contacts from Telegram about/description
- Approve or reject the created deal from Telegram

Note: the old internal recommendation flow is now legacy/deprecated and is no longer the primary product path.

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm build
pnpm start
```

`pnpm dev` runs each workspace `dev` script in parallel. Today that means watch/build loops for the API and shared packages, plus live dev servers for the bot and miniapp; it is not a full API runtime bootstrap.

## OpenCode Team Setup

- Team OpenCode onboarding lives in `docs/opencode-setup.md`
- Human workflow and feature/bug pipelines also live in `docs/opencode-setup.md`
- Check the expected CLI version with `pnpm opencode:check-version`
- Start OpenCode from the repo root with `opencode`
- Shared runtime files live in `.opencode/`; shared workflow policy lives in `.codex/`

## Root scripts

- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm start`
- `pnpm opencode:check-version`

- `pnpm start` launches the runnable app surfaces after build: API, bot, and miniapp preview.

This repository now includes the current MVP bot, API, agent orchestration, and approval flow.
