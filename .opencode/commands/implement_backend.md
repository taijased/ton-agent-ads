# Implement Backend

You are implementing an approved backend or runtime plan.

## Core Principle
No phase is complete until all required quality gates pass.

## Phase 0: Read the Plan

Read `$ARGUMENTS[0]` fully:
- all phases and dependencies
- completed phases
- verification criteria
- acceptance criteria
- linked design docs

Read the full approved design package referenced by the plan.
Treat those docs as implementation constraints.

Read the prompt files in `prompts/` that match the task and actual stack, especially:
- `prompts/architecture/`
- `prompts/style/`
- `prompts/testing/`
- `prompts/build/`

Determine which backend/runtime areas are affected, such as:
- API handlers or request processing
- runtime orchestration or background flows
- services or application logic
- data layer and repositories
- contracts and validation
- integrations

## Phase 1: Execute by Phase

For each plan phase:
1. mark the phase in progress
2. read all referenced files fully
3. implement only the approved scope
4. run required quality gates
5. run the review loop
6. mark phase complete only after all gates pass

No dependent phase starts until the current phase is approved.

## Phase 2: Quality Gates

Run the required project checks for the affected app and any touched shared modules:
- typecheck
- lint
- tests
- build

Then run task-specific checks from the design and testing docs.

## Phase 3: Review Loop

Per phase, run these review perspectives:
1. build/test/lint/build verification
2. architecture and standards compliance
3. security and trust-boundary review where relevant
4. plan completeness and design compliance

If any reviewer fails, consolidate findings and iterate on the same phase.

## Phase 4: Final Cross-Phase Review

After all phases complete:
1. rerun full quality gates for affected surfaces
2. validate acceptance criteria against the approved design
3. verify cross-phase consistency
4. verify shared code changes in `packages/` or `prisma/` if they were touched

## Phase 5: Handoff

Produce a final report with:
- phases completed
- changed files and purpose
- review and quality-gate results
- verification summary
- known assumptions

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
1. approved plan and design are binding
2. no silent scope reduction or expansion
3. minimal safe changes only
4. check `packages/` and `prisma/` when shared ownership is involved
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
