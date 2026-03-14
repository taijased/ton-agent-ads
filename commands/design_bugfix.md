---
name: design-bugfix
description: Design a bugfix using evidence-first workflow: reproduce, trace root cause, analyze blast radius, review, approve, then create a phased bugfix plan.
argument-hint: [bug-name] [app-path] [bug description or ticket link]
---

# Design Bugfix

You are a senior engineer designing a bugfix with strict quality gates.

## Core Principle
For bugs, causality before coding. No implementation plan until root cause and blast radius are reviewed.

## Phase 0: Understand the Bug

### Parse Arguments
- `$ARGUMENTS[0]` - bug name slug
- `$ARGUMENTS[1]` - owning app path
- `$ARGUMENTS[2+]` - bug description, ticket link, logs, or traces

If arguments are missing, ask for:
1. bug name
2. app path
3. bug description or ticket link with expected vs actual behavior

### Read Local Guidance
Read the prompt files in `prompts/` that match the task and stack, especially:
- `prompts/architecture/`
- `prompts/style/`
- `prompts/testing/`
- `prompts/build/`

Discover the real structure of the target app and any shared ownership in `packages/` or `prisma/`.

## Stack Context

Before detecting stack:

Check existing docs:

`apps/<app>/docs/<task>/`

If stack context already exists,
reuse it.

Do not repeat full stack discovery unless needed.

Only update context if:

- new modules involved
- new app involved
- shared packages involved

Docs remain the source of truth.

## Phase 1: Bug Research

Spawn these focused agents:
- `bug-tracer` for root-cause investigation
- `codebase-researcher` for similar patterns and existing checks
- `blast-radius-analyzer` for impact and regression scope

Save synthesis to:

`{app-path}/docs/{bug-name}/research.md`

Required sections:
- bug summary
- reproduction conditions
- failure trace
- confirmed root cause
- similar existing patterns
- blast radius summary
- key files with exact `file:line` references

## Phase 2: Bugfix Design Package

Create:

```text
{app-path}/docs/{bug-name}/
├── README.md
├── 01-reproduction.md
├── 02-root-cause.md
├── 03-fix-design.md
├── 04-testing.md
├── 05-blast-radius.md
├── research.md
└── plan/
    ├── README.md
    ├── phase-01.md
    └── phase-NN.md
```

The design package must cover:
- deterministic reproduction
- causal root cause
- minimal safe fix boundary
- regression strategy
- blast radius and guardrails

## Phase 3: Architect Review

Run `architect-reviewer` against the bugfix design package.

Review focus:
1. root cause is causally proven
2. fix strategy is minimal and safe
3. blast radius controls are adequate
4. regression plan covers the failure path and adjacent risks
5. docs are internally consistent

## Phase 4: Human Approval

Present the root cause, minimal fix strategy, blast radius summary, and docs path.

Wait for explicit approval before creating the implementation plan.

## Phase 5: Bugfix Plan

Create a phased bugfix plan in:

`{app-path}/docs/{bug-name}/plan/`

`plan/README.md` must include:
- accepted fix boundary
- phase checklist
- file map
- risk controls
- verification gates

Each `phase-NN.md` must include:
- goal
- files to change
- exact behavior changes
- verification checklist

Wait for explicit approval before implementation.

## Chat Output

While designing:
- do not narrate the full design in chat
- write all detailed output to docs
- use chat only for:
  - short progress status
  - approval request
  - blocking questions

Do not paste full design documents into chat.

Reference doc paths instead.

Docs are the source of truth.

## Rules
1. no root cause proof, no bugfix plan
2. minimal safe boundary is mandatory
3. every claim references exact `file:line`
4. design approval and plan approval are separate gates
5. shared ownership in `packages/` or `prisma/` must be made explicit when relevant

## Chat Output

While designing:
- do not narrate the full design in chat
- write detailed design output to docs
- use chat only for:
  - short progress status
  - approval request
  - blocking questions
