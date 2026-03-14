# Name

refactor-module

## Purpose

Apply a safe, local refactor within one module while preserving behavior.

## When to use

- simplifying a focused module
- renaming or restructuring internals without changing ownership
- reducing duplication inside one module

## When not to use

- cross-app extraction
- feature redesign
- large-scale architecture changes

## Inputs

- module path
- refactor goal
- constraints from surrounding code or docs

## Steps

1. read the module fully
2. identify local refactor boundary
3. preserve public behavior and surrounding contracts
4. make the focused refactor
5. summarize the local changes briefly

## Output format

- module path
- refactor boundary
- changed internals summary
- verification notes

## Constraints

- keep behavior stable unless explicitly instructed otherwise
- avoid unrelated refactors
- keep output concise

## Relation to commands/workflows

This skill supports implementation work.
It does not replace design, planning, or full delivery commands.
