# Agents

This directory contains specialized analysis subagents used by commands.

Agents are not the main workflow.
Agents are focused helpers with narrow responsibilities.

## Purpose

Agents exist to improve:
- accuracy
- separation of concerns
- review quality
- evidence gathering
- risk visibility

Each agent should have:
- one clear responsibility
- a strict output format
- narrow scope
- explicit constraints

## Current Agents

### `codebase-researcher.md`
Role:
- investigate the codebase as it exists today
- trace code paths
- map dependencies
- document facts with exact `file:line` references

### `bug-tracer.md`
Role:
- reproduce and trace bugs
- reconstruct execution path to failure
- identify root cause
- define minimal safe fix boundary

### `blast-radius-analyzer.md`
Role:
- estimate impact of a planned change
- trace callers, callees, contracts, and affected flows
- identify must-not-break constraints and regression needs

### `architect-reviewer.md`
Role:
- review design docs before implementation
- verify completeness, consistency, standards fit, and testability
- determine whether design is implementation-ready

## How Agents Are Used

Agents are usually invoked by commands.

Typical examples:
- `research_codebase` -> `codebase-researcher`
- `design_feature` -> `codebase-researcher`, `architect-reviewer`
- `design_bugfix` -> `bug-tracer`, `blast-radius-analyzer`, `architect-reviewer`

Agents may be run in parallel when their scopes are independent.

## Agent Boundaries

Agents are analysis-first.

By default, agents should:
- read
- inspect
- compare
- trace
- review
- report

By default, agents should not:
- edit code
- rewrite design docs
- implement fixes
- perform unrelated refactors

If an agent is marked read-only, treat that as strict.

## Output Requirements

Every agent output should be:
- concise
- structured
- evidence-based
- directly usable by the calling command

Where applicable, outputs must include:
- exact `file:line` references
- clear distinction between facts and assumptions
- explicit unknowns
- bounded conclusions

## Relationship to Commands, Workflows, and Prompts

- `commands/` own task stages and execution flow
- `workflows/` sequence commands for repeatable delivery paths
- `prompts/` provide reusable local engineering guidance
- `agents/` provide analysis and review only

Agents support workflow; they do not own workflow orchestration.

## Relationship to Skills

Agents:
- specialized analytical roles
- narrow responsibility
- usually called by commands

Skills:
- reusable helper workflows
- utility actions
- not the primary project workflow

If the behavior is role-based analysis, use an agent.
If the behavior is a reusable utility procedure, use a skill.

## Naming Convention

Agent filenames use kebab-case.

Examples:
- `codebase-researcher.md`
- `bug-tracer.md`
- `blast-radius-analyzer.md`
- `architect-reviewer.md`

## Maintenance Rules

When editing an agent:
- preserve role boundaries
- keep prompts specific
- do not add implementation behavior unless intentional
- do not blur analysis and orchestration
- keep output format stable unless all calling commands are updated
