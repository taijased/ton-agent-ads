# Codex Policy Layer

This directory contains repository workflow policy and reusable support material.

Use `.codex/` for:

- `config.toml` - repository workflow policy and defaults
- `skills/` - reusable helper skills
- `agents/README.md` - documentation for agent roles
- `commands/README.md` - documentation for command stages

Do not expect OpenCode to auto-discover executable agents or commands from `.codex/`.

Executable OpenCode runtime files live in `.opencode/`:

- `.opencode/agents/`
- `.opencode/commands/`
