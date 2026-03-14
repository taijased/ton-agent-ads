# Commands

This directory contains the primary workflow commands for repository work.

Commands are the main execution entrypoints for research, design, planning, and implementation.

## Purpose

Commands define:
- workflow stages
- required inputs
- expected outputs
- approval gates
- quality gates

Commands may call agents.
Commands may read and write task docs.
Commands may coordinate multi-step execution.

## Relationship Model

- `agents/` = specialized analysis roles
- `commands/` = executable task-stage commands
- `workflows/` = ordered command sequences
- `prompts/` = reusable local engineering guidance

Commands are the source of truth for stage execution.
Workflows sequence commands.
Prompts provide reusable engineering guidance.

## Runtime Configuration

Commands may use `config.toml` to determine:

- chat verbosity
- complexity mode
- docs path
- stack context reuse
- prompt loading
- skill usage

Commands must not hardcode these values
if `config.toml` provides them.

Config overrides defaults when present.

## Command Types

### Research
- `research_codebase.md`

Use when:
- architecture is unclear
- ownership is unclear
- similar implementations need to be found
- a task requires codebase understanding before design

Output:
- research documentation
- exact `file:line` references
- existing patterns and integration points

### Feature Design
- `design_feature.md`
- `design_frontend_feature.md`

Use when:
- building a new feature
- changing behavior across modules
- changing UX or architecture
- adding integrations, contracts, or data flow

Output:
- design package under `apps/<app>/docs/<task>/`
- architecture, behavior, decisions, testing docs
- phased implementation plan after approval

### Bugfix Design
- `design_bugfix.md`

Use when:
- the issue is a bug
- reproduction exists or must be reconstructed
- root cause must be proven before implementation

Output:
- bug design package under `apps/<app>/docs/<task>/`
- reproduction, root cause, fix design, testing, blast radius docs
- phased bugfix plan after approval

### Backend/Runtime Implementation
- `implement_backend.md`
- `fix_backend_bug.md`

Use when:
- an approved backend or runtime design and plan already exist
- work affects API, runtime logic, integrations, services, DB, contracts, or validation

### Frontend Implementation
- `implement_frontend.md`
- `fix_frontend_bug.md`

Use when:
- an approved frontend design and plan already exist
- work affects routes/screens, components, UI flows, state, or frontend integration

## Complexity Modes

Commands may run in different complexity levels.

Default: standard

### trivial mode

Allowed:
- skip research
- skip design docs
- skip plan
- minimal chat output

Use only when scope is clearly local.

### standard mode

Default for most work.

Requires:
- design docs
- plan
- normal gates

### high-risk mode

Required when:
- shared modules touched
- prisma touched
- contracts changed
- multiple apps affected
- architecture unclear

Requires:
- research
- design
- review
- approval
- plan
- verification

Commands should detect risk level automatically when possible.

## Inputs

Most commands expect:
1. task name or slug
2. target app path
3. ticket, description, or plan path

Examples:
- `design_feature avatar-upload apps/api add avatar upload server support`
- `design_bugfix auth-timeout apps/api session expires after refresh`
- `implement_frontend apps/miniapp/docs/avatar-upload/plan/README.md`
- `fix_backend_bug apps/api/docs/token-refresh-bug/plan/README.md`

If required arguments are missing, the command should ask.

## Outputs

Long-lived task docs must be stored inside the owning app:

`apps/<app>/docs/<task>/`

Examples:
- `apps/api/docs/auth-timeout/`
- `apps/miniapp/docs/avatar-upload/`
- `apps/bot/docs/admin-outreach-followup/`

For repo-wide workflow/orchestration research with no better owner, use:

`apps/agent/docs/<task>/`

Do not store long-lived task docs in repo root or `artifacts/`.

## Stack Context Reuse

Commands should not rediscover the project stack on every step.

If stack context exists in:

`apps/<app>/docs/<task>/`

commands must reuse it.

Stack context may be stored in:

- `research.md`
- `stack-context.md`

Stack context should include:

- runtime type
- framework
- test commands
- build commands
- shared ownership
- relevant prompts

Commands should only re-run stack discovery when necessary.

This reduces token usage and keeps behavior consistent.

## Chat vs Docs Rule

Commands must write detailed outputs to docs, not chat.

Docs are the source of truth for:
- research
- design
- plan
- verification details

Chat is only for:
- short progress markers
- approval requests
- blockers
- concise summaries

Do not restate full artifact contents in chat.

Prefer referencing:
`apps/<app>/docs/<task>/`

instead of copying document contents.

Implementation commands may produce slightly richer chat updates,
but must remain concise.

## Relationship to Agents

Commands may spawn agents from `agents/`.

Typical patterns:
- `research_codebase` -> `codebase-researcher`
- `design_bugfix` -> `bug-tracer`, `blast-radius-analyzer`, `architect-reviewer`
- `design_feature` -> `codebase-researcher`, `architect-reviewer`

Agents provide analysis.
Commands coordinate execution.

## Relationship to Prompts

Use `prompts/` for reusable local guidance such as:
- architecture layers and repo model
- domain guidance
- style and TypeScript guidance
- testing guidance
- build guidance

Commands should read the prompt files that match the task and the actual stack in the target app.
Do not assume framework-specific prompts unless the app actually uses that framework.

## Prompt Routing

Commands must not load all prompts by default.

Commands should select prompts based on task type.

Guidelines:

frontend:
- `prompts/style/`
- `prompts/testing/`
- `prompts/architecture/` (optional)

backend/runtime:
- `prompts/architecture/`
- `prompts/domain/`
- `prompts/testing/`

bugfix:
- `prompts/testing/`
- `prompts/architecture/` (optional)

refactor:
- `prompts/style/`
- `prompts/architecture/`

analysis:
- `prompts/architecture/`
- `prompts/domain/`

delivery:
- no prompts unless needed

Use stack context to decide.

If stack context exists in docs, reuse it.

Avoid loading unused prompt categories.

This reduces token usage.

## Relationship to Skills

Use `commands/` for:
- stage-based workflows
- task-specific delivery
- design/implementation pipelines
- approval-driven flows

Use `/.codex/skills/` for:
- reusable helper actions
- small repeatable checks
- reusable audits or refactors
- narrow utility workflows

## Using Skills

Commands should use skills for small reusable operations.

Do not inline logic that already exists as a skill.

Examples:

Instead of writing custom review logic,
use `review-diff`.

Instead of custom ownership analysis,
use `map-shared-ownership`.

Instead of custom test generation,
use `write-regression-tests`.

Instead of custom summary,
use `summarize-changes`.

Benefits:

- smaller commands
- less token usage
- consistent behavior
- easier maintenance

Commands should still own the main flow.

Skills should not control workflow.

## Command Selection Guide

### Use `research_codebase`
When the task is unclear and you need facts only.

### Use `design_feature`
When the feature spans backend, runtime, contracts, integrations, or system behavior.

### Use `design_frontend_feature`
When the task is mostly frontend UX, component architecture, and state/data flow.

### Use `design_bugfix`
When the issue is a bug and root cause must be proven.

### Use `implement_backend`
When an approved backend/runtime feature plan exists.

### Use `implement_frontend`
When an approved frontend feature plan exists.

### Use `fix_backend_bug`
When an approved backend/runtime bugfix plan exists.

### Use `fix_frontend_bug`
When an approved frontend bugfix plan exists.

## Mandatory Rules

1. Do not implement before design is approved.
2. Do not fix bugs without root cause.
3. Do not skip review gates defined by the command.
4. Do not silently reduce scope.
5. Do not keep task state only in chat.
6. Always use exact paths as they exist in the repository.
7. Always determine the target app before starting.
8. Check `packages/` and `prisma/` when shared ownership is possible.

## Naming Convention

Command filenames use snake_case.

Examples:
- `design_feature.md`
- `design_bugfix.md`
- `implement_frontend.md`

## Maintenance Rules

When editing a command:
- preserve stage boundaries
- preserve approval gates
- preserve expected outputs
- keep prompts explicit and deterministic
- avoid turning one command into a generic catch-all

Prefer adding a new command over overloading an unrelated one.

## Chat vs Docs Rule

Commands must write detailed outputs to docs, not chat.

Docs are the source of truth for:
- research
- design
- plan
- verification details

Chat is only for:
- short progress markers
- approval requests
- blockers
- concise final summaries

Do not restate full artifact contents in chat.
