# Backend Bug Workflow

Purpose:
Fix a backend/server bug only after root cause, blast radius, approved bugfix design, and approved phased plan are established.

## Use When

Use this workflow when:
- the primary failure is backend/server-side
- the bug affects API behavior, auth, validation, persistence, services, contracts, or server workflows

Typical target apps:
- `apps/api`
- `apps/agent`
- `apps/bot`

## Command Sequence

### Step 1 — Optional Standalone Research
Run `research_codebase` only when broad context is needed before bug design.

Use it when:
- bug ownership is unclear
- app boundary or shared code ownership is unclear
- the failure spans multiple modules and needs mapping first

### Step 2 — Bug Design
Run:

`design_bugfix <bug-name> <app-path> <bug-description-or-ticket>`

This command is expected to perform:
- scoped bug research
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

`fix_backend_bug <plan-path>`

Example:
`fix_backend_bug apps/api/docs/token-refresh-race/plan/README.md`

This command is expected to:
- read full bug design docs
- implement only within approved minimal fix boundary
- run backend quality gates
- run regression checks from bug docs
- stop if root cause or safe fix boundary no longer holds

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
- reproduction verification
- regression verification
- bug-specific safety checks

## Output Location

All task docs must be stored in:

`apps/<app>/docs/<bug-name>/`

## Important Rules

1. Do not fix symptoms without causal proof.
2. Do not skip blast radius analysis for risky bugs.
3. Keep the fix boundary minimal and explicit.
4. Do not introduce unrelated refactors during bugfix implementation.
5. If the bug is actually owned by shared code, document that explicitly before coding.