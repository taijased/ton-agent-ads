# Architecture Layers

Use this prompt when mapping or designing code across repository layers.

Focus on these layer types as they appear in the codebase:
- interfaces and transport entrypoints
- application services and orchestration
- domain models, policies, and invariants
- infrastructure integrations and persistence adapters

When documenting or designing a task:
- identify the entry layer first
- trace dependency direction explicitly
- keep shared code ownership explicit when logic lives in `packages/` or `prisma/`
- distinguish app-local runtime behavior from shared modules
