# Name

map-shared-ownership

## Purpose

Determine whether a task is owned by an app, `packages/`, `prisma/`, or a combination.

## When to use

- ownership is unclear
- a task may cross app and shared layers
- validating whether app-local docs need shared ownership notes

## When not to use

- full workflow selection on its own
- implementation planning
- broad architectural critique

## Inputs

- task description
- touched paths or candidate paths

## Steps

1. inspect touched paths across `apps/`, `packages/`, and `prisma/`
2. identify the primary runtime owner
3. identify shared ownership boundaries
4. summarize whether the task is app-local, shared, or mixed

## Output format

- primary owner
- shared owners
- evidence paths
- concise ownership note

## Constraints

- do not invent new app boundaries
- do not redesign the repo
- keep output concise

## Relation to commands/workflows

This skill supports app targeting and shared ownership checks.
It does not replace repository research or workflow commands.
