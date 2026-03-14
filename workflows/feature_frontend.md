# Frontend Feature Workflow

Purpose:
Deliver a frontend feature through optional research, approved frontend design, approved phased plan, and controlled implementation.

## Use When

Use this workflow when:
- the main work is frontend/UI
- the task affects pages, components, routes, frontend state, UX flows, or frontend API integration

Typical target apps:
- `apps/miniapp`
- `apps/landing`

## Command Sequence

### Step 1 — Optional Repository or Area Research
Run `research_codebase` only if needed.

Use it when:
- current frontend architecture is unclear
- component ownership is unclear
- state/data flow patterns are unclear
- similar feature patterns need to be mapped before design

Expected output:
- factual research notes
- file/path references
- known frontend patterns and integration boundaries

### Step 2 — Frontend Design and Planning
Run:

`design_frontend_feature <feature-name> <app-path> <description-or-ticket>`

This command is expected to perform:
- scoped research
- frontend UX and component design
- state/data flow design
- architecture review
- human approval
- phased implementation plan

Expected output:
- docs under `apps/<app>/docs/<task>/`
- approved frontend design package
- approved plan files under `plan/`

### Step 3 — Frontend Implementation
Run:

`implement_frontend <plan-path>`

Example:
`implement_frontend apps/landing/docs/homepage-redesign/plan/README.md`

This command is expected to:
- read the full approved design package
- implement by phase
- run FE quality gates
- validate UX flows, loading/error/empty states, and accessibility
- stop if design or plan no longer matches reality

## Required Gates

Before implementation:
- design must exist
- design review must pass
- required human approval must be given
- phased plan must exist and be approved

During implementation:
- typecheck
- lint
- tests
- build
- UX and state validation
- a11y checks where relevant

## Output Location

All task docs must be stored in:

`apps/<app>/docs/<task>/`

## Important Rules

1. Do not implement before frontend design is approved.
2. Do not skip plan approval.
3. Preserve existing frontend conventions unless design explicitly changes them.
4. If the task also depends on backend work, document the dependency explicitly during design.
5. Keep frontend changes aligned with real app ownership and route structure.