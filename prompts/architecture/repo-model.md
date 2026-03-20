# Repo Model

Use this prompt when choosing ownership and output locations.

Repository model:

- `.opencode/agents/` = executable analysis agents
- `.opencode/commands/` = executable task-stage commands
- `workflows/` = ordered command sequences
- `apps/<app>/docs/<task>/` = long-lived task docs
- `apps/agent/docs/<task>/` = default location for repo-wide workflow/orchestration research
- `prompts/` = reusable local engineering guidance

Ownership rules:

- choose a primary app first
- make cross-app dependencies explicit
- use `packages/` and `prisma/` when shared ownership is the real boundary
- do not treat every task as app-local if shared modules are materially involved
