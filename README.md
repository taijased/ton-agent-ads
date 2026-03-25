# AdAgent

AdAgent is a Telegram Campaign AI Manager: a user-facing AI agent that automates Telegram advertising campaigns inside the TON ecosystem.

Instead of manually searching for channels, messaging admins, negotiating terms, preparing payments, and tracking posts, the user creates a campaign once and the agent handles the operational workflow end to end.

## Links

- Landing page: `https://ton-agent-ads-landing.vercel.app/`
- Telegram bot: `https://t.me/agentads_bot`

## Product Overview

AdAgent is built around a simple idea: AI agents should do real work, not just answer questions.

In this project, the user creates a campaign in Telegram and the agent takes over the repetitive execution flow:

1. The user creates a campaign.
2. The agent finds Telegram channels that best match the campaign.
3. The agent contacts channel admins automatically.
4. The agent negotiates price and placement terms.
5. The agent prepares the payment flow in TON.
6. The user reviews and confirms the transaction.
7. The agent tracks publication and shows campaign results in a Telegram Mini App.

The project demonstrates how AI agents, TON payments, and Telegram-native interfaces can be combined into a real multi-step autonomous workflow for end users.

## Why This Project Exists

Telegram advertising is still highly manual. Operators usually need to:

- search for relevant channels
- message admins one by one
- negotiate prices and placement details
- send and confirm payments manually
- track whether posts were published
- collect performance data across chats, screenshots, and spreadsheets

AdAgent turns that fragmented process into a structured agent workflow. The user focuses on campaign intent and approval; the system handles the operational labor.

## Core Capabilities

- User-facing AI agent for Telegram campaign operations
- Automatic channel matching based on campaign goals
- AI-assisted negotiation with Telegram channel admins
- Deal lifecycle tracking from outreach to confirmation
- TON payment preparation with user approval
- Telegram Mini App dashboard for campaign visibility and analytics
- Telegram-native UX across bot and Mini App surfaces

## Product Surfaces

### Landing

The landing page presents the product narrative, value proposition, legal pages, and the main CTA that sends users to the Telegram bot.

- Public URL: `https://ton-agent-ads-landing.vercel.app/`
- App path: `apps/landing`

### Telegram Bot

The bot is the main user entry point for campaign creation and operational messaging.

- Bot URL: `https://t.me/agentads_bot`
- App path: `apps/bot`

### Telegram Mini App

The Mini App provides a more structured UI for campaign state, approvals, analytics, and workflow visibility after the campaign is created.

- App path: `apps/miniapp`

### API

The API powers campaign persistence, auth, workflow state, and supporting backend endpoints for the bot and Mini App.

- App path: `apps/api`

### Agent Runtime

The agent runtime owns orchestration responsibilities and repo-wide workflow research/docs where appropriate.

- App path: `apps/agent`

## Monorepo Structure

This repository is a `pnpm` monorepo with app-level ownership and shared packages for reusable infrastructure.

```text
apps/
  agent/     Agent orchestration app and repo-wide workflow docs
  api/       Fastify API and backend workflows
  bot/       Telegram bot runtime
  landing/   Public landing site and legal pages
  miniapp/   Telegram Mini App frontend

packages/
  agent/         Shared agent orchestration primitives
  agent-tools/   Agent-side tooling contracts
  config/        Shared environment configuration
  db/            Database layer and repositories
  mtproto/       Telegram user client wrapper
  ton/           TON wallet and payment primitives
  types/         Shared contracts and DTOs

prisma/          Shared Prisma schema and migrations
scripts/         Repository utility scripts
docker/          Local infrastructure assets
prompts/         Reusable engineering guidance
workflows/       Ordered repo task workflows
.opencode/       Project-local commands and analysis agents
.codex/          Workflow policy and reusable skills
```

## Architecture Notes

- `apps/bot` handles Telegram updates and user-facing bot flows.
- `apps/api` exposes backend endpoints for auth, campaigns, profile, and workspace data.
- `apps/miniapp` is a frontend client and communicates with the API rather than directly with persistence or TON infrastructure.
- `apps/agent` owns orchestration-specific app code and repo-wide workflow research/docs when there is no better app owner.
- Shared logic lives in `packages/` when ownership belongs outside a single app.

Where applicable, backend apps and packages follow clean architecture boundaries such as `domain`, `application`, `infrastructure`, and `interfaces`.

## Technology Stack

- Monorepo: `pnpm` workspaces
- Language: TypeScript
- Backend runtime: Node.js
- API: Fastify
- Bot framework: grammY
- Telegram client integration: gramjs
- TON integration: ton-core
- Database: PostgreSQL + Prisma + `pg`
- Mini App frontend: React + Vite
- Landing frontend: React + Vite

## Local Development

### Prerequisites

- Node.js
- `pnpm`
- PostgreSQL for local backend flows
- A configured `.env` based on `.env.example`

### Install

```bash
pnpm install
cp .env.example .env
pnpm build
```

### Main commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm test
```

### Useful app-specific commands

```bash
pnpm landing
pnpm miniapp
pnpm db:up
pnpm db:down
pnpm prisma:migrate
pnpm prisma:seed
```

Notes:

- `pnpm dev` runs workspace `dev` scripts in parallel.
- `pnpm start` launches the runnable app surfaces after build, including the API, bot, Mini App preview, and landing.
- Environment variables are contract-driven from `.env.example`.

## Repository Workflow

This repository uses a staged workflow model for research, design, and implementation.

- Commands live in `.opencode/commands/`
- Analysis agents live in `.opencode/agents/`
- Workflow policy lives in `.codex/`
- Reusable guidance lives in `prompts/`

For engineering work inside the repo, app-owned docs are stored under:

```text
apps/<app>/docs/<task>/
```

## Project Goal

AdAgent is not just a chatbot wrapper around Telegram workflows. It is a practical demonstration of how AI agents can execute real, multi-step tasks on behalf of users:

- understanding campaign intent
- coordinating external outreach
- negotiating operational details
- preparing payment actions
- tracking execution
- reporting results back in a user-facing interface

The broader goal is to show what autonomous product workflows can look like when AI agents are embedded inside Telegram-native experiences and paired with TON-based payment flows.
