# OpenCode Runtime Layer

This directory contains project-local OpenCode runtime files.

Use `.opencode/` for executable OpenCode entities only:

- `agents/` - project-local OpenCode agents discovered by the CLI
- `commands/` - project-local OpenCode slash commands discovered by the CLI

Do not store repository policy, long-lived task docs, or reusable process guidance here.

Those belong in:

- `.codex/` for repository workflow policy, config, and skills
- `apps/<app>/docs/<task>/` for long-lived task artifacts
- `workflows/` for repo workflow sequencing docs

If a file must be visible to `opencode agent list` or slash-command discovery, it belongs in `.opencode/`.
