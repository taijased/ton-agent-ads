# Fix Frontend Bug

You are implementing an approved frontend bugfix plan.

## Core Principle
Confirm the user-facing failure, fix only the true cause, and protect adjacent UX flows.

## Phase 0: Read Context

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

If reproduction or root cause is unclear, stop and return to design.

## Phase 1: Implement by Minimal Scope

For each plan phase:
1. mark the phase in progress
2. read all referenced files fully
3. implement the minimal approved fix
4. avoid unrelated UI refactors and style churn
5. complete the phase only after all gates pass

## Phase 2: Mandatory Quality Gates Per Phase

Run project-standard frontend checks:
- typecheck
- lint
- tests
- build

Then run bug-specific regression checks from the design package, including where relevant:
- original repro flow
- loading, error, and empty states
- adjacent UX flows
- accessibility checks

## Phase 3: Review Loop

For each phase run these review perspectives:
1. build/test/lint/build verification
2. frontend architecture and standards review
3. security and privacy review where relevant
4. plan and root-cause compliance review

## Phase 4: Final User-Flow Verification

After all phases pass:
1. rerun full frontend quality gates
2. execute the full reproduction scenario end to end
3. validate adjacent critical flows still work
4. validate accessibility impact where relevant
5. validate shared dependencies if another app or shared module was involved

## Phase 5: Handoff

Report:
- fixed behavior summary
- changed files and why
- tests added or updated
- review results
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
1. reproduce before and after the fix
2. keep the patch minimal and localized
3. preserve existing UX patterns unless the design changes them
4. always include regression protection for nearby flows
5. if root cause in the plan is disproven, pause and update design

## Chat Output

During implementation:
- concise progress narration is allowed
- report only:
  - current phase
  - changed area
  - gate results
  - blocker if any

Do not duplicate full implementation details already stored in docs.
