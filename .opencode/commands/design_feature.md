---
name: design-feature
description: Design a backend, runtime, integration, or cross-system feature with research, review, human approval, and a phased implementation plan.
argument-hint: [feature-name] [app-path] [description or ticket link]
---

# Design Feature

You are an expert software architect designing a feature with human-in-the-loop approval.

## Core Principle
Design what and why before how. No implementation planning until the design is approved.

## Phase 0: Understand the Mission

### Parse Arguments
- `$ARGUMENTS[0]` - feature name slug
- `$ARGUMENTS[1]` - owning app path
- `$ARGUMENTS[2+]` - feature description, requirements, or ticket link

If arguments are missing, ask for:
1. feature name
2. app path
3. feature description or ticket link

### Read Local Guidance
Read the prompt files in `prompts/` that match the task and stack, especially where relevant:
- `prompts/architecture/`
- `prompts/domain/`
- `prompts/style/`
- `prompts/testing/`
- `prompts/build/`

Discover the real architecture of the target app and any shared ownership in `packages/` or `prisma/`.

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

### Determine Conditional Docs
Create conditional docs only when needed:

| Condition | Conditional Document |
| --- | --- |
| feature changes DB schema/data model | `05-data-model.md` |
| feature adds or changes API/contracts | `06-contracts.md` |
| feature changes security/permissions | `07-security.md` |
| feature adds external integrations | `08-integrations.md` |

## Phase 1: Research

Research is mandatory.

Spawn 2-3 parallel tasks using `codebase-researcher` to cover:
1. target app architecture and entrypoints
2. similar feature patterns and existing implementations
3. integration points, shared ownership, and contracts

Save synthesis to:

`{app-path}/docs/{feature-name}/research.md`

Required sections:
- summary
- discovered architecture
- existing patterns to reuse
- integration points
- shared ownership notes
- key files with exact `file:line` references

## Phase 2: Design Package

Create:

```text
{app-path}/docs/{feature-name}/
├── README.md
├── 01-architecture.md
├── 02-behavior.md
├── 03-decisions.md
├── 04-testing.md
├── 05-data-model.md        # conditional
├── 06-contracts.md         # conditional
├── 07-security.md          # conditional
├── 08-integrations.md      # conditional
├── research.md
└── plan/
    ├── README.md
    ├── phase-01.md
    └── phase-NN.md
```

Design docs must cover:
- architecture and boundaries
- behavior and data flow
- decisions and alternatives
- testing strategy
- shared code and cross-app dependencies when relevant

## Phase 3: Architect Review

Run `architect-reviewer` against the design package.

The review must verify:
1. clear module boundaries and dependency direction
2. consistency with the researched codebase
3. behavior completeness
4. contract consistency
5. testability and risk coverage

If the verdict is not `READY`, update the affected docs and re-run review.

## Phase 4: Human Approval

Present the design summary, key decisions, risk controls, and docs path.

Wait for explicit approval before creating the implementation plan.

## Phase 5: Code Plan

After design approval, create a phased implementation plan in:

`{app-path}/docs/{feature-name}/plan/`

`plan/README.md` must include:
- chosen implementation strategy
- phase checklist and dependencies
- file map
- shared-code touchpoints
- verification gates: typecheck, lint, tests, build, and task-specific checks

Each `phase-NN.md` must include:
- phase goal
- files to create or modify
- behavior and contract constraints
- verification checklist

Wait for explicit user approval before implementation.

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
1. design before implementation
2. use facts from research, not assumptions
3. separate design views into focused docs
4. every reference to existing code must include exact `file:line`
5. make shared ownership explicit when `packages/` or `prisma/` are involved
6. include happy path, error path, and edge cases by default
7. design approval and plan approval are separate gates

## Chat Output

While designing:
- do not narrate the full design in chat
- write detailed design output to docs
- use chat only for:
  - short progress status
  - approval request
  - blocking questions
