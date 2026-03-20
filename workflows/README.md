# Workflows

This directory contains repository-level execution flows.

Workflows orchestrate commands.

## Relationship

- `.opencode/agents/` = executable analysis agents
- `.opencode/commands/` = executable workflow commands
- `workflows/` = ordered command sequences for common delivery scenarios
- `prompts/` = reusable local engineering guidance

A workflow is not a replacement for commands.
A workflow defines which commands run, in what order, and under which gates.

## Policy Integration

Workflows may use `.codex/config.toml` to control:

- default complexity level
- required stages
- stack context reuse
- doc locations
- chat verbosity

Workflows should not duplicate config rules.

Use `.codex/config.toml` as the repository workflow policy source.

## Important Model

In this repository, design commands already include multiple internal phases.

For example, a `design_*` command may already include:

- research
- design
- review
- human approval
- phased implementation plan

Because of this, workflows should not duplicate those internal phases as separate commands.

Use:

- optional standalone `research_codebase`
- one `design_*` command
- one implementation command

## Typical Workflow Shape

### Feature workflow

1. optional `research_codebase`
2. `design_feature` or `design_frontend_feature`
3. `implement_backend` or `implement_frontend`

### Bug workflow

1. optional `research_codebase`
2. `design_bugfix`
3. `fix_backend_bug` or `fix_frontend_bug`

## Workflow Complexity

Workflows may run in different complexity levels.

### trivial

Example:

`implement_frontend`

`fix_backend_bug`

### standard

Example:

`design_feature`
`-> implement_backend`

`design_frontend_feature`
`-> implement_frontend`

### high-risk

Example:

`research_codebase`
`-> design_feature`
`-> review`
`-> implement_backend`

Use high-risk when shared code or contracts are involved.

## When to Use Standalone Research

Use `research_codebase` before design when:

- repository structure is unclear
- app ownership is unclear
- shared code ownership is unclear
- architecture boundaries must be mapped first
- the task is large enough that design would otherwise start from assumptions

Do not run standalone research by default if the relevant `design_*` command already contains sufficient scoped research.

## Stack Context

Workflows should assume that stack context is stored after research.

Typical flow:

`research_codebase`
`-> stack context saved`
`-> design`
`-> plan`
`-> implement`

Later steps must reuse stored context.

Do not re-run full repo discovery unless task scope changes.

## Prompt Routing in Workflows

Workflows should assume prompt routing.

Do not load all prompts for every step.

Each command should load only what it needs.

Typical pattern:

research -> architecture only
design -> architecture + domain
plan -> minimal prompts
implement frontend -> style + testing
implement backend -> architecture + domain + testing
review -> architecture
bugfix -> testing + architecture

Stack context should guide prompt selection.

Prompt routing must prefer minimal context.

## Output Locations

Long-lived task documentation must be stored in:

`apps/<app>/docs/<task>/`

For repo-wide workflow/orchestration research with no better owner, use:

`apps/agent/docs/<task>/`

Workflows do not change this rule.

## Workflow Selection Guide

### `feature_backend.md`

Use for backend/server/runtime feature work.

### `feature_frontend.md`

Use for frontend/UI feature work.

### `bug_backend.md`

Use for backend/server/runtime bugfix work.

### `bug_frontend.md`

Use for frontend/UI bugfix work.

### `repo_structure_alignment.md`

Use when validating repository structure, app boundaries, shared code ownership, prompt layout, and workflow compatibility.

## Skills in Workflows

Workflows may include skills.

Skills may be used:

- inside commands
- after commands
- for validation
- for checks
- for summaries

Skills should not replace commands.

Example:

`design_feature`
`-> review-design-docs`
`-> implement_backend`
`-> review-diff`
`-> generate-verification-matrix`

Skills should keep workflows lightweight.

## Rules

1. Do not implement without an approved design package and approved plan.
2. Do not split internal phases already handled by a command.
3. Do not invent alternate workflows unless explicitly needed.
4. If the target app is unclear, stop and clarify.
5. Use exact repository paths.
6. Keep workflows short, deterministic, and command-oriented.
