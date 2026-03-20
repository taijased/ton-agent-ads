# Fix Backend Bug

You are implementing an approved backend or runtime bugfix plan.

## Core Principle
Reproduce first, prove root cause, apply the minimal safe fix, then verify adjacent behavior.

## Phase 0: Read Inputs

Input: `$ARGUMENTS[0]` is the bugfix plan path.

Before coding, read the approved bug design package fully:
- `README.md`
- `01-reproduction.md`
- `02-root-cause.md`
- `03-fix-design.md`
- `04-testing.md`
- `05-blast-radius.md`

Read the prompt files in `prompts/` that match the task and stack, especially:
- `prompts/architecture/`
- `prompts/style/`
- `prompts/testing/`
- `prompts/build/`

If root cause or fix boundary is unclear, stop and return to design.

## Phase 1: Execute Per Phase

For each phase:
1. set the phase in progress
2. read referenced files fully
3. implement only within the approved minimal boundary
4. run quality gates
5. run bug-specific regression checks
6. run the review loop
7. mark the phase complete only after all gates pass

## Phase 2: Mandatory Quality Gates

Run project-standard backend/runtime checks:
- typecheck
- lint
- tests
- build

Then run bug-specific checks from the testing and blast-radius docs.

## Phase 3: Review Loop

Per phase, run these review perspectives:
1. build/test/lint/build verification
2. architecture and standards review
3. security review where relevant
4. plan and root-cause compliance review

Root-cause compliance must verify:
- the fix addresses the confirmed root cause
- no scope creep beyond the approved boundary
- blast-radius guardrails are respected
- required regression tests are present and passing

## Phase 4: Final Verification

After all phases pass:
1. rerun full quality gates for affected surfaces
2. rerun the full bug regression set
3. re-execute the original reproduction flow
4. verify no new errors for affected paths
5. verify shared code changes if `packages/` or `prisma/` were touched

## Phase 5: Handoff

Report:
- root cause fixed
- changed files and purpose
- tests added or updated
- reviewer outcomes
- remaining assumptions

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
1. no root cause proof, no fix
2. minimal safe change is mandatory
3. no unrelated refactors during bugfix work
4. every phase requires passing quality and review gates
5. if plan and code reality diverge, stop and escalate with evidence

## Chat Output

During implementation:
- concise progress narration is allowed
- report only:
  - current phase
  - changed area
  - gate results
  - blocker if any

Do not duplicate full implementation details already stored in docs.
