# Backend Feature Workflow

Purpose:
Deliver a backend/server feature through optional repo research, approved design, approved phased plan, and controlled implementation.

## Use When

Use this workflow when:
- the main work is backend/server-side
- the target app is backend-first
- the task affects API handlers, runtime logic, services, contracts, auth, validation, integrations, or data access

Typical target apps:
- `apps/api`
- `apps/agent`
- `apps/bot`

## Command Sequence

### Step 1 — Optional Repository or Area Research
Run `research_codebase` only if needed.

Use it when:
- system boundaries are unclear
- ownership between app code and shared code is unclear
- integration points need mapping before design
- similar implementations must be identified first

Expected output:
- factual research notes
- exact `file:line` references
- structural clarity for the design step

### Step 2 — Design and Planning
Run:

`design_feature <feature-name> <app-path> <description-or-ticket>`

This command is expected to perform:
- scoped research
- architecture design
- behavior design
- architecture review
- human approval
- phased implementation plan

Expected output:
- docs under `apps/<app>/docs/<task>/`
- approved design package
- approved `plan/README.md` and `plan/phase-*.md`

### Step 3 — Implementation
Run:

`implement_backend <plan-path>`

Example:
`implement_backend apps/api/docs/auth-token-rotation/plan/README.md`

This command is expected to:
- read the approved design package
- execute phase by phase
- run quality gates
- run review gates
- stop on design or plan mismatch

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
- command-specific verification

## Output Location

All task docs must be stored in:

`apps/<app>/docs/<task>/`

## Important Rules

1. Do not skip design.
2. Do not skip plan approval.
3. Do not implement from chat-only instructions when a plan is required.
4. If shared code in `packages/` or `prisma/` is the real ownership boundary, document it explicitly during design.
5. Keep backend changes minimal, safe, and reversible.
