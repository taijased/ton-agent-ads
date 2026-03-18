# CLAUDE.md — ton-adagent

AI agent that buys Telegram ads automatically using TON.

## Quick Start

```bash
# 0. Corepack fix — Node 23 has a known key-verification bug with corepack.
#    Prefix ALL pnpm commands with these env vars (or export them in your shell):
export COREPACK_ENABLE_STRICT=0 COREPACK_INTEGRITY_KEYS=0

# 1. Copy .env.example → .env and fill in values (skip if .env already exists)
cp .env.example .env

# 2. Install dependencies + approve build scripts (Prisma, esbuild, etc.)
pnpm install
pnpm approve-builds          # interactive — select all, press Enter

# 3. Start Docker, then Postgres
open -a Docker               # wait for Docker Desktop to be ready
pnpm db:up

# 4. Generate Prisma client + run migrations
pnpm prisma:generate
pnpm prisma:migrate

# 5. Build all workspaces (required before first run)
pnpm build

# 6. Run everything
pnpm dev                     # bot (tsx watch) + tsc watch for all packages
pnpm --filter @repo/api start  # API server (separate terminal — pnpm dev only watches, doesn't start it)
```

### Minimal run (bot test mode only, no Docker/Postgres needed)

```bash
export COREPACK_ENABLE_STRICT=0 COREPACK_INTEGRITY_KEYS=0
pnpm install && pnpm build
pnpm --filter @repo/bot start
# Then use /test in Telegram — runs with in-memory data, no DB or API required
```

## Monorepo Layout

```
apps/
  api/        Fastify REST API — deals, campaigns, channels, negotiation
  bot/        Grammy Telegram bot — user commands, test mode
  agent/      Orchestration app (workflow docs home)
  miniapp/    React + Vite frontend (minimal)

packages/
  types/      Shared TypeScript types and contracts
  db/         Repository interfaces + Prisma/in-memory implementations
  agent/      AgentService — campaign→channel evaluation
  config/     Environment configuration factory
  mtproto/    Telegram MTProto user client wrapper
  ton/        TON blockchain utilities (ton-core)
  agent-tools/ Agent-side port contracts
```

## Tech Stack

- **Language:** TypeScript (strict mode, ES2022, NodeNext modules)
- **Package manager:** pnpm 10.6.0
- **Bot:** grammY
- **API:** Fastify + Swagger UI
- **Database:** PostgreSQL 16 + Prisma ORM
- **Telegram:** telegram (gramjs) for MTProto user client
- **LLM:** OpenAI API (gpt-4o-mini default)
- **Frontend:** React 19 + Vite
- **Formatting:** Prettier (no ESLint)

## Key Commands

```bash
pnpm dev                        # Watch-compile all packages + run bot (tsx watch)
pnpm --filter @repo/api start   # Start API server (must run separately!)
pnpm --filter @repo/bot start   # Start bot standalone (without watch)
pnpm build                      # Build all workspaces
pnpm typecheck                  # tsc --noEmit across all workspaces
pnpm lint                       # Prettier check
pnpm test                       # Build then run tests

pnpm db:up                      # Start Postgres via Docker
pnpm db:down                    # Stop Postgres
pnpm prisma:generate            # Generate Prisma client
pnpm prisma:migrate             # Run migrations
pnpm prisma:studio              # Open Prisma Studio

pnpm tg:session                 # Bootstrap Telegram session string
```

> **Note:** `pnpm dev` does NOT start the API server — it only runs `tsc -w` for `apps/api`.
> You must run `pnpm --filter @repo/api start` in a separate terminal for the full stack.

## Environment Variables (.env)

```
BOT_TOKEN=             # Telegram bot token (from @BotFather)
API_BASE_URL=          # API URL for bot→api communication
HOST=0.0.0.0
PORT=3000

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ton_adagent
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/ton_adagent

TG_API_ID=             # Telegram API ID (for MTProto)
TG_API_HASH=           # Telegram API hash
TG_SESSION_STRING=     # Telegram session (via pnpm tg:session)

OPEN_AI_TOKEN=         # OpenAI API key
OPEN_AI_MODEL=gpt-4o-mini
```

## Architecture

### Clean Architecture Layers (apps/api, packages/db)

```
Domain          → Repository interfaces, business entities
Application     → Services (CampaignService, DealService, DealNegotiationService, etc.)
Infrastructure  → Prisma repos, in-memory repos, Telegram clients
Interfaces      → HTTP route handlers (Fastify)
```

### Core Flow

1. **Bot** — user creates campaign via `/new` command
2. **Agent** — evaluates channels by budget, creates deals
3. **API** — DealService sends outreach to channel admin via MTProto
4. **Listener** — TelegramNegotiationListener monitors incoming replies
5. **LLM** — NegotiationLlmService (OpenAI) decides: reply / request_user_approval / decline / handoff / wait
6. **Bot** — shows approval card to user (approve / reject / counter)

### Test Mode (`/test`)

Interactive simulation in the bot. User plays the admin role, system runs real LLM negotiation with in-memory data. No MTProto or database needed.

- `/test [1-5]` — start with one of 5 predefined scenarios
- `/stop` — exit test mode

## Database Models (Prisma)

| Model | Purpose |
|-------|---------|
| Campaign | Ad campaigns (budget, text, theme, language, goal) |
| Channel | Telegram channels with pricing and view metrics |
| ChannelContact | Admin contact info (username or link) |
| Deal | Campaign × Channel pair with status tracking |
| DealMessage | Chat history (inbound/outbound/internal) |
| DealApprovalRequest | Terms presented to user for approval |
| DealExternalThread | Telegram chatId → Deal mapping |

## Dependency Graph

```
apps/bot     → @repo/api, @repo/db, @repo/types
apps/api     → @repo/agent, @repo/db, @repo/types, @ton-adagent/config
apps/miniapp → @repo/types

@repo/agent  → @repo/db, @repo/types
@repo/db     → @repo/types
@repo/types  → (no workspace deps)
```

## Conventions

- All packages use `"type": "module"` (ESM)
- Imports use `.js` extension (NodeNext resolution)
- No ESLint — TypeScript strict mode + Prettier
- Repository pattern: interfaces in `domain/`, implementations in `infrastructure/`
- In-memory repos available for all entities (used in tests and test mode)
- Tests use Node.js built-in test runner (`node --test`)
- API tests require test database: `DATABASE_URL=...test node --test dist/application/*.test.js`

## Project Structure Reference

```
prompts/       → Coding guidelines (architecture, style, testing, domain)
commands/      → Workflow command definitions (research, design, implement, fix)
workflows/     → Multi-step workflow patterns (feature, bug)
agents/        → Analysis subagent definitions (researcher, tracer, reviewer)
docs/          → Feature design documents
scripts/       → Utility scripts (Telegram session bootstrap)
.codex/        → Runtime config + 20+ reusable skills
```
