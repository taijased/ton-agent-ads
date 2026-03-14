# Implement Frontend

You are implementing an approved frontend plan.

## Core Principle
No phase is done until behavior, quality, and design compliance all pass.

## Phase 0: Read the Plan

Read `$ARGUMENTS[0]` as the plan path.

Before coding:
1. read the full plan
2. read the full design package referenced by the plan
3. identify completed phases and skip them
4. identify key UX flows and critical error states

Read the prompt files in `prompts/` that match the task and actual stack, especially:
- `prompts/architecture/`
- `prompts/style/`
- `prompts/testing/`
- `prompts/build/`

## Phase 1: Implement by Phase

For each phase:
1. mark it in progress
2. read all listed files fully
3. implement only what the phase requires
4. run quality gates
5. run the review loop
6. mark the phase complete only after all reviews pass

Do not parallelize dependent phases.

## Phase 2: Frontend Quality Gates

Run the required project checks for the affected app and any touched shared modules:
- typecheck
- lint
- tests
- build

Then run feature-specific checks from the design and testing docs, including where relevant:
- core user flows
- loading, error, and empty states
- form validation and submission errors
- responsive behavior
- accessibility checks

## Phase 3: Review Loop

Per phase, run these review perspectives:
1. build/test/lint/build verification
2. frontend architecture and state/data flow review
3. security and accessibility review where relevant
4. plan completeness and design compliance

Phase approval requires all review perspectives to pass.

## Phase 4: Final Cross-Phase Review

After all phases are complete:
1. rerun full project frontend quality gates
2. validate acceptance criteria from the design package
3. validate cross-phase consistency
4. validate shared dependencies and API usage if other apps or `packages/` were involved

## Phase 5: Handoff

Produce a final report with:
- phases completed
- files changed and why
- tests added or updated
- quality-gate outcomes
- unresolved assumptions

If a commit is requested, create a local commit only unless push is explicitly requested.

## Chat Output

During implementation:
- concise progress narration is allowed
- report only:
  - current phase
  - changed area
  - gate results
  - blockers if any

Do not duplicate full plan, design, or research artifacts in chat.

Use docs for full detail.
Use chat for progress only.

Docs remain the source of truth.

## Rules
1. the approved plan is the implementation scope
2. design decisions are implementation constraints
3. preserve existing app conventions unless the design changes them
4. keep changes small, safe, and reversible
5. no phase progresses with failing gates
6. document backend or shared-module dependencies explicitly when present

## Chat Output

During implementation:
- concise progress narration is allowed
- report only:
  - current phase
  - changed area
  - gate results
  - blocker if any

Do not duplicate full implementation details already stored in docs.
