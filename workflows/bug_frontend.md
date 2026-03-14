# Frontend Bug Workflow

Purpose:
Fix a frontend/UI bug only after reproduction, root cause, approved bugfix design, and approved phased plan are established.

## Use When

Use this workflow when:
- the primary failure is user-facing UI behavior
- the bug affects pages, components, state flow, rendering, UX behavior, or frontend integration

Typical target apps:
- `apps/miniapp`
- `apps/landing`

## Command Sequence

### Step 1 — Optional Standalone Research
Run `research_codebase` only when the frontend structure or ownership needs broader investigation before bug design.

Use it when:
- the bug spans multiple screens or modules
- ownership is unclear
- current UX/state/data patterns need mapping first

### Step 2 — Bug Design
Run:

`design_bugfix <bug-name> <app-path> <bug-description-or-ticket>`

This command is expected to perform:
- scoped research
- reproduction analysis
- root cause investigation
- blast radius analysis
- architecture review
- human approval
- phased bugfix plan

Expected output:
- docs under `apps/<app>/docs/<bug-name>/`
- approved bugfix design package
- approved plan files

### Step 3 — Bugfix Implementation
Run:

`fix_frontend_bug <plan-path>`

Example:
`fix_frontend_bug apps/miniapp/docs/avatar-upload-freeze/plan/README.md`

This command is expected to:
- read the approved bug design package
- implement the minimal approved fix
- run FE quality gates
- verify repro flow and nearby UX flows
- validate loading/error/empty states and accessibility where relevant

## Required Gates

Before implementation:
- reproduction is documented
- root cause is confirmed
- blast radius is documented
- design review passes
- required human approval is given
- phased bugfix plan exists and is approved

During implementation:
- typecheck
- lint
- tests
- build
- original bug repro verification
- adjacent UX regression checks
- a11y checks where relevant

## Output Location

All task docs must be stored in:

`apps/<app>/docs/<bug-name>/`

## Important Rules

1. Do not patch symptoms without proven root cause.
2. Keep the fix minimal and localized.
3. Do not mix bugfix work with unrelated visual cleanup.
4. Preserve existing UX patterns unless the approved design explicitly changes them.
5. If the bug depends on backend behavior, document the dependency explicitly before implementation.