---
name: design-frontend-feature
description: Design a frontend feature with UX flow, component architecture, state/data flow, testing, review, and a phased implementation plan.
argument-hint: [feature-name] [frontend-path] [description or ticket link]
---

# Design Frontend Feature

You are an expert frontend architect designing a feature with human-in-the-loop approval.

## Core Principle
Define user behavior, UI contracts, and state flow before coding.

## Phase 0: Understand the Mission

### Parse Arguments
- `$ARGUMENTS[0]` - feature name slug
- `$ARGUMENTS[1]` - frontend app path
- `$ARGUMENTS[2+]` - feature description, requirements, or ticket link

If arguments are missing, ask for:
1. feature name
2. frontend path
3. feature description or ticket link

### Read Local Guidance
Read the prompt files in `prompts/` that match the task and stack, especially:
- `prompts/architecture/`
- `prompts/style/`
- `prompts/testing/`
- `prompts/build/`

Discover the real frontend architecture of the target app:
- entrypoints and route/screen structure
- component boundaries
- state and data flow
- API integration pattern
- styling/theming pattern
- loading, error, and empty states

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
Create conditional docs when needed:

| Condition | Conditional Document |
| --- | --- |
| feature adds or changes API usage | `06-api-integration.md` |
| feature introduces significant UX states | `07-ux-states.md` |
| feature adds analytics or instrumentation | `08-analytics.md` |

## Phase 1: Research

Spawn 2-3 parallel tasks using `codebase-researcher` to cover:
1. UI architecture and reusable components
2. data/state flow patterns
3. similar feature implementations and test patterns

Save synthesis to:

`{frontend-path}/docs/{feature-name}/research.md`

## Phase 2: Design Package

Create:

```text
{frontend-path}/docs/{feature-name}/
├── README.md
├── 01-ui-architecture.md
├── 02-user-flows.md
├── 03-state-data-flow.md
├── 04-decisions.md
├── 05-testing.md
├── 06-api-integration.md   # conditional
├── 07-ux-states.md         # conditional
├── 08-analytics.md         # conditional
├── research.md
└── plan/
    ├── README.md
    ├── phase-01.md
    └── phase-NN.md
```

Design docs must cover:
- business context and acceptance criteria
- route/screen entrypoints
- component tree and boundaries
- user flows, including error and edge states
- state/data flow and side effects
- decisions, risks, and testing strategy

## Phase 3: Architect Review

Run `architect-reviewer` against the design package.

Review focus:
1. component boundaries and dependency direction
2. user-flow completeness
3. state/data flow correctness
4. API contract alignment
5. testability and regression coverage

## Phase 4: Human Approval

Present the user-facing outcome, key design decisions, risk controls, and docs path.

Wait for explicit approval before creating the implementation plan.

## Phase 5: Code Plan

Create a phased implementation plan in:

`{frontend-path}/docs/{feature-name}/plan/`

`plan/README.md` must include:
- strategy and rationale
- phase checklist with dependencies
- file map
- verification gates: typecheck, lint, tests, build, and task-specific UX checks

Each `phase-NN.md` must include:
- goal
- files to create or modify
- UI behavior details
- data/state behavior details
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
1. design from user outcome backward
2. reuse existing frontend patterns when they exist
3. include loading, error, empty, and edge states by default
4. every reference to existing code uses exact `file:line`
5. design approval and plan approval are separate gates
6. document backend dependencies explicitly when the frontend depends on another app or shared module

## Chat Output

While designing:
- do not narrate the full design in chat
- write detailed design output to docs
- use chat only for:
  - short progress status
  - approval request
  - blocking questions
