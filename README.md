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
  agent/    # Negotiation orchestration only
  miniapp/  # Frontend, calls API only

packages/
  db/         # Postgres access layer
  types/      # Shared contracts/DTOs
  mtproto/    # Telegram user client wrapper
  ton/        # TON wallet/payment primitives
  agent-tools/# Agent-side ports/tooling contracts
  config/     # Shared environment config
```

## Clean architecture boundaries

- `apps/bot`: accepts Telegram updates, delegates only through application ports.
- `apps/api`: exposes HTTP endpoints for campaigns and persistence workflows.
- `apps/agent`: runs negotiation/ad-buying orchestration logic.
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
pnpm dev
```

## Root scripts

- `pnpm dev`
- `pnpm build`
- `pnpm start`

This repository now includes the current MVP bot, API, agent orchestration, and approval flow.
