# Decisions

## Chosen Decisions

### 1. Fix code to match the declared env contract

- Chosen because `AGENTS.md:28-51` already defines `.env.example` as the contract.
- Result: cleanup updates code, shared env typing, and docs toward that contract instead of expanding ad hoc env usage.

### 2. Move reusable orchestration ownership into `packages/`

- Chosen because cross-app imports from `apps/agent` violate the documented repo model in `README.md:17-32` and `prompts/architecture/repo-model.md:13-16`.
- Result: `apps/agent` remains an app; reusable services become package-owned.

### 3. Make quality gates executable instead of weakening the workflow contract

- Chosen because commands and workflows already require `lint`, `tests`, and `build` at `.codex/commands/implement_backend.md:48-54` and `workflows/feature_backend.md:75-80`.
- Result: implementation adds or standardizes scripts rather than downgrading the workflow rules.

### 4. Prefer docs changes only after runtime/script truth is fixed

- Chosen because the audit found several docs that drifted ahead of reality (`README.md:22-24`, `README.md:64-68`).
- Result: documentation cleanup is the final alignment pass, not the substitute for code cleanup.

## Alternatives Considered

### Normalize cross-app imports in docs

- Rejected because it would codify app/package boundary drift instead of fixing it.

### Relax workflow gates to "when available"

- Rejected because it conflicts with the stronger repository rule that quality gates are required.

### Keep legacy env names and list both old and new names in `.env.example`

- Rejected because it preserves duplicate contracts and extends cleanup debt.
