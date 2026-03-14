# Repository Workflow Rules

This repository uses a staged, command-driven workflow for research, design, and implementation.

## Repository Layout

This is a pnpm monorepo.

Main directories:
- `apps/` — runnable applications and app-local docs
- `packages/` — shared libraries, contracts, and reusable infrastructure
- `prisma/` — shared schema, migrations, and seed data
- `scripts/` — utility scripts
- `docker/` — container and local infrastructure assets
- `agents/` — specialized analysis roles
- `commands/` — executable task-stage commands
- `workflows/` — ordered command sequences
- `prompts/` — reusable local engineering guidance
- `.codex/` — Codex config and reusable skills

Do not assume a single app or a single implementation surface.

## Runtime Config

Behavior may be controlled by `config.toml`.

`config.toml` defines:

- chat verbosity
- complexity defaults
- docs paths
- prompt routing
- stack context reuse
- skill usage
- workflow requirements

Instructions in `AGENTS.md` remain authoritative,
but runtime behavior may follow `config.toml` when present.

Do not duplicate config values in `AGENTS.md`.

Use `config.toml` as runtime policy.

## App Model

Typical apps in this repository:
- `apps/api` — backend/server application
- `apps/agent` — orchestration/runtime application and default home for repo-wide workflow research docs
- `apps/bot` — bot runtime
- `apps/miniapp` — frontend miniapp
- `apps/landing` — frontend landing app if present

Always determine the target app before starting task-driven work.

If work spans multiple apps:
1. identify the primary app
2. document cross-app dependencies explicitly
3. update shared code in `packages/` or `prisma/` where ownership belongs there

## Workflow Model

High-level model:
- `agents/` = specialized analysis roles
- `commands/` = executable task-stage commands
- `workflows/` = ordered command sequences
- `apps/<app>/docs/<task>/` = long-lived task docs
- `apps/agent/docs/<task>/` = default location for repo-wide workflow/orchestration research
- `prompts/` = reusable local engineering guidance

Default feature workflow:
1. `research_codebase` when facts or ownership are unclear
2. `design_feature` or `design_frontend_feature`
3. design review
4. `implement_backend` or `implement_frontend`

Default bug workflow:
1. `research_codebase` when needed
2. `design_bugfix`
3. bug review and blast-radius review
4. `fix_backend_bug` or `fix_frontend_bug`

Never implement before design approval when the command model requires design.

## Task Complexity Levels

Tasks may run in different complexity modes.

### trivial

Use for:
- very small fixes
- local refactors
- minor UI tweaks
- typo fixes
- safe changes with obvious scope

Rules:
- research may be skipped
- design docs not required
- plan not required
- review agents optional
- chat must stay minimal

Allowed flow:
- direct command execution
- minimal docs
- minimal chat output

### standard

Default mode.

Use for:
- normal feature work
- normal bugfixes
- changes inside one app
- changes with clear ownership

Rules:
- design command required
- docs required
- plan required
- review may run
- chat minimal except implementation

Allowed flow:

`design_* -> implement_*`

### high-risk

Use for:
- cross-app changes
- `packages/` or `prisma/` changes
- contract changes
- auth / payments / persistence
- unclear ownership
- architecture changes

Rules:
- research required
- design required
- review required
- plan required
- approval required
- verification matrix required

Allowed flow:

`research_codebase -> design_* -> review -> plan -> implement_*`

Chat must stay minimal except for approval and implementation.

Commands should assume STANDARD unless evidence requires TRIVIAL or HIGH-RISK.

## Commands

Commands are stored in `commands/`.

Available commands:
- `research_codebase`
- `design_feature`
- `design_frontend_feature`
- `design_bugfix`
- `implement_backend`
- `implement_frontend`
- `fix_backend_bug`
- `fix_frontend_bug`

Commands define the execution flow for a task stage.
Do not invent alternative stage flows unless explicitly asked.

## Workflows

Workflows are stored in `workflows/`.

Workflows describe which commands run, in what order, and under which gates.
Workflows do not replace commands.

Use workflows when the repository needs a repeatable multi-command delivery path.

## Agents

Agents are stored in `agents/`.

Current agents:
- `codebase-researcher`
- `bug-tracer`
- `blast-radius-analyzer`
- `architect-reviewer`

Agents are analysis-only unless a future instruction explicitly says otherwise.
Agents support commands; they do not own the workflow.

## Skill Usage Policy

Skills are reusable helper actions.

Use skills for:

- small operations
- validation
- review
- refactor
- analysis
- test generation
- quality checks
- summaries

Do not use skills for:

- full feature delivery
- full bugfix workflow
- full design
- full implementation

Commands own workflow.
Agents own specialized analysis.
Skills support commands.

Rules:

- prefer skill for small tasks
- prefer command for task stages
- prefer agent for deep analysis

Commands should call skills when possible.

Avoid duplicating skill logic inside commands.

Examples:

use skill:
- `review-diff`
- `write-regression-tests`
- `trace-dependency-chain`
- `naming-consistency-check`
- `prepare-handoff`

use command:
- `design_feature`
- `implement_backend`
- `fix_frontend_bug`
- `research_codebase`

use agent:
- `codebase-researcher`
- `bug-tracer`
- `architect-reviewer`
- `blast-radius-analyzer`

## Choosing Between Skill / Command / Agent

Use skill when:
- task is small
- task is local
- task is repeatable
- task is helper action

Use command when:
- task has stages
- task needs docs
- task needs plan
- task needs approval

Use agent when:
- deep analysis needed
- investigation needed
- architecture review needed
- root cause unclear

Prefer the smallest tool that fits.

## Prompts

Reusable local engineering guidance lives in `prompts/`.

Use `prompts/` for stack-agnostic architecture, domain, style, testing, and build guidance.
Read the prompt files that match the task and the actual stack in the target app.

Do not assume framework-specific prompts unless the app actually uses that framework.

## Prompt Routing

Commands must load only relevant prompt guides.

Do not load all files from `prompts/`.

Prompt loading must depend on:

- task type
- target app
- runtime type
- complexity level

Available prompt categories:

- `prompts/architecture/`
- `prompts/domain/`
- `prompts/style/`
- `prompts/testing/`
- `prompts/build/`

Rules:

- load only the categories required for the task
- avoid loading unrelated guides
- prefer minimal context

Examples:

frontend task:
- style
- testing
- architecture (if needed)

backend/runtime task:
- architecture
- domain
- testing

bugfix:
- testing
- architecture (if needed)

refactor:
- style
- architecture

review:
- architecture
- domain (if needed)

Use stack context when available to choose prompts.

Docs remain source of truth.

## Stack Context Caching

For each task, stack and runtime information should be detected once
and stored in the task docs.

Use:

`apps/<app>/docs/<task>/research.md`

or

`apps/<app>/docs/<task>/stack-context.md`

Stack context may include:

- runtime type (frontend / backend / runtime / bot / worker)
- framework
- build system
- test setup
- shared modules involved
- relevant prompt guides

Commands should reuse existing stack context when available.

Do not re-detect stack unless:
- context missing
- context outdated
- task scope changed

Docs are the source of truth.

## Docs and Design Artifacts

All long-lived research, design, plan, and implementation docs must live inside the owning app:

`apps/<app>/docs/<task>/`

Examples:
- `apps/api/docs/auth-token-refresh-bug/`
- `apps/miniapp/docs/avatar-upload/`
- `apps/bot/docs/admin-outreach-followup/`

For repo-wide workflow/orchestration research with no better app owner, use:

`apps/agent/docs/<task>/`

Do not store long-lived task docs in:
- repo root
- `artifacts/`
- `commands/`
- `agents/`

## Design Gate

Implementation is blocked until design is ready.

Design is considered ready only when:
- design docs exist
- required research exists
- `architect-reviewer` returns `READY`
- human approval is given if the command requires it

If review verdict is not `READY`, return to design.

## Bug Safety Gate

Bugfixes must establish:
- reproduction
- confirmed root cause
- blast radius
- regression requirements

Do not fix symptoms without causal proof.

## Implementation Rules

Implementation commands must:
- read approved docs fully
- follow the documented phase plan
- stay within the approved scope
- run all required quality gates
- stop if code reality conflicts with the approved design

No silent scope changes.

## Quality Gates

Always run:
- typecheck
- lint
- tests
- build

Also run command-specific checks from the design/testing docs.

A failing gate blocks progress.

## Shared Code Rule

Before changing app-local code, check whether ownership belongs in:
- `packages/`
- `prisma/`

Do not duplicate shared logic across apps when the shared layer is the real owner.

## Chat Output Policy

Use docs as the primary place for detailed outputs.

During:
- research
- design
- planning

chat updates must stay minimal.

Chat should include only:
- current stage
- short action title
- blocker or question if needed

Do not duplicate detailed research, design, or plan contents in chat if they are written to docs.

During implementation, chat updates may be slightly more detailed, but must stay concise.

Implementation chat updates may include:
- current phase
- changed area
- gate results
- blocker if any

Always prefer referencing doc paths instead of repeating artifact contents.

Docs are the source of truth.
Chat is only for lightweight progress updates.

## Verbosity Rules

trivial:
- very short chat

standard:
- minimal chat for research/design/plan
- concise chat for implementation

high-risk:
- minimal chat except
  - approval
  - review results
  - implementation progress

Docs remain the source of truth.

## General Rules

- Evidence over opinion
- Follow repository structure as it exists today
- Keep boundaries explicit when work spans apps and shared code
- Use exact paths as they exist in the repo
- If ownership or structure is unclear, stop and clarify


## Chat Output Policy

Use docs as the primary place for detailed outputs.

During:
- research
- design
- planning

chat updates must stay minimal.

Chat should include only:
- current stage
- short action title
- blocker/question if needed

Do not duplicate detailed research, design, or plan contents in chat if they are written to docs.

During implementation, chat updates may be slightly more detailed, but must still stay concise.

Implementation chat updates may include:
- current phase
- changed area
- gate results
- blocker if any

Use docs for full detail.
Use chat for lightweight progress only.
