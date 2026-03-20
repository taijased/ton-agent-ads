# Apps

This directory contains all runnable applications in the monorepo.

Each app is an independently runnable surface with its own purpose, ownership boundaries, and docs.

## Purpose

Use `apps/` to locate the target application before starting research, design, or implementation.

Do not assume a single frontend or a single backend.
Always determine the correct target app first.

## App Path Rule

All task-driven work must target a specific app.

Use exact paths such as:

- `apps/api`
- `apps/agent`
- `apps/bot`
- `apps/miniapp`
- `apps/landing` if present

If the task touches a specific surface, use that app path explicitly in commands.

If the target app is unclear, stop and ask.

## App Responsibilities

### `apps/api`

Primary backend/server application.

Typical responsibilities:

- API endpoints
- server-side business logic
- validation
- persistence and service integration
- webhooks, jobs, or server workflows if implemented here

Typical command family:

- `design_feature`
- `design_bugfix`
- `implement_backend`
- `fix_backend_bug`

### `apps/agent`

Orchestration/runtime application.

Typical responsibilities:

- app-local orchestration/runtime composition
- automation flows
- negotiation/runtime coordination
- repo-wide workflow/orchestration research docs when no better owner exists

Shared reusable orchestration services must live under `packages/`, not `apps/agent`.

Typical command family:

- `research_codebase`
- `design_feature`
- `design_bugfix`
- `implement_backend`

### `apps/bot`

Bot-facing runtime.

Typical responsibilities:

- bot handlers
- messaging workflows
- command routing
- conversational entrypoints
- bot-side integrations

Typical command family:

- `research_codebase`
- `design_feature`
- `design_bugfix`
- `implement_backend`

### `apps/miniapp`

User-facing frontend mini application.

Typical responsibilities:

- routes/screens/pages
- UI flows
- components
- frontend state
- frontend API integration
- loading/error/empty states

Typical command family:

- `design_frontend_feature`
- `design_bugfix`
- `implement_frontend`
- `fix_frontend_bug`

### `apps/landing`

Landing or marketing frontend if present.

Typical responsibilities:

- marketing pages
- acquisition flows
- content-driven pages
- public-facing forms
- analytics-sensitive public UI

Typical command family:

- `design_frontend_feature`
- `design_bugfix`
- `implement_frontend`
- `fix_frontend_bug`

## Docs Location Rule

All long-lived task docs must live inside the target app.

Use:

`apps/<app>/docs/<task>/`

Examples:

- `apps/api/docs/auth-timeout/`
- `apps/miniapp/docs/avatar-upload/`
- `apps/bot/docs/admin-outreach-followup/`

For repo-wide workflow/orchestration research with no better owner, use:

`apps/agent/docs/<task>/`

Do not store task docs in:

- repo root
- `artifacts/`
- `.opencode/commands/`
- `.opencode/agents/`

## Choosing the Right App

### Use `apps/api` when:

- the main change is server-side
- contracts, handlers, services, or DB logic change
- backend behavior is the source of truth

### Use `apps/miniapp` when:

- the main change is a product UI flow
- pages, components, frontend state, or UX behavior change

### Use `apps/landing` when:

- the change is public-facing marketing UI
- content, CTA, SEO, or acquisition behavior is affected

### Use `apps/bot` when:

- the primary surface is bot interaction or messaging flow

### Use `apps/agent` when:

- the task changes orchestration, automation, or agent runtime behavior
- the task is repo-wide workflow/orchestration research with no better app owner

If multiple apps are affected:

1. identify the primary app first
2. design from the primary app’s perspective
3. document cross-app dependencies explicitly
4. update shared code in `packages/` or `prisma/` when duplication would otherwise occur

## Shared Code Rule

Not all changes belong directly inside an app.

Before adding duplicated logic, check:

- `packages/`
- `prisma/`

Use shared modules when logic is reused across multiple apps.

## Frontend vs Backend Rule

Do not assume all apps are frontend apps.
Do not assume all apps are backend apps.

In this repository:

- `apps/api` is backend-first
- `apps/agent` is runtime/backend-first
- `apps/bot` is runtime/backend-first
- `apps/miniapp` is frontend-first
- `apps/landing` is frontend-first if present

Choose the command accordingly.

## Important Rules

1. Always identify the target app before starting.
2. Always store docs inside the owning app.
3. Do not assume shared logic belongs in app-local code.
4. If a task spans multiple apps, make cross-app boundaries explicit.
5. Keep app responsibilities clear.
6. Use exact paths as they exist in the repository.
