# Domain Model

Use this prompt when a task touches business entities, contracts, or workflow state.

When documenting or designing domain behavior:
- identify the main entities and state transitions
- distinguish transport DTOs from shared contracts where relevant
- identify which app owns runtime behavior
- identify whether shared contracts live in `packages/types` and whether persistence shape lives in `prisma/`
- make invariants, lifecycle states, and cross-surface dependencies explicit
