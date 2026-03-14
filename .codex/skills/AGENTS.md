# Skills Directory Rules

This directory contains reusable Codex skills for the repository.

## What Skills Are

Skills are reusable helper actions.

They are:
- narrow
- reusable
- deterministic
- stack-agnostic by default
- safe to use inside commands

Skills may:
- read code
- read docs
- read prompts
- produce small outputs

Skills should prefer short, structured outputs.

## Role of Skills

Skills are small reusable actions.

Skills should:

- be narrow
- be deterministic
- be reusable
- avoid large outputs

Skills should not:

- run full workflows
- generate large docs by default
- replace commands
- replace agents

Skills may:

- read code
- read docs
- read prompts
- produce short results

Commands should call skills instead of duplicating logic.

## When to Use Skills

Use a skill when the task is a repeatable helper action such as:
- reviewing a diff
- checking contracts
- tracing dependencies
- preparing a concise handoff
- expanding a test matrix

Use skills inside commands or implementation work when they help with one bounded action.

## How Skills Differ from Commands

Commands own workflow.

Commands:
- define task stages
- define approval gates
- decide output locations
- coordinate end-to-end delivery

Skills do not replace commands.
Skills must not implement full workflows.

## How Skills Differ from Agents

Agents own analysis roles.

Agents:
- are specialized analytical roles
- usually support command stages
- may do deeper investigation or review

Skills are smaller helper actions.
They do not own a role or a workflow.

## Repository Model

Commands -> own workflow
Agents -> own analysis roles
Skills -> reusable helper actions

## Prompt References

Skills may read guidance only from:
- `prompts/architecture/`
- `prompts/domain/`
- `prompts/style/`
- `prompts/testing/`
- `prompts/build/`

Only read prompt guides when relevant.

Do not reference:
- `promts/`
- Go-specific guidance
- Next.js defaults
- framework assumptions unless the target app actually uses them

## Monorepo Awareness

Skills must work across:
- `apps/`
- `packages/`
- `prisma/`

When ownership is unclear, skills should make app-local versus shared ownership explicit.

## Chat Policy

Skills must keep output short.

Do not:
- narrate at length
- duplicate full docs
- dump large artifacts into chat

Docs remain the source of truth.

## Naming

Use kebab-case for skill directories.

Each skill lives at:

`.codex/skills/<skill-name>/SKILL.md`
