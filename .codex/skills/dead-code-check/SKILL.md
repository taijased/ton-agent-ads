# Name

dead-code-check

## Purpose

Check for obviously unused or orphaned code in the scoped change area.

## When to use

- after refactor work
- before handoff
- when reviewing whether intermediate code was left behind

## When not to use

- full repository cleanup
- speculative deletion work
- replacing build or test verification

## Inputs

- changed file list
- optional feature or bug scope

## Steps

1. inspect changed paths for orphaned exports, branches, or unused helpers
2. check nearby references where relevant
3. summarize obvious dead-code candidates briefly

## Output format

- checked scope
- dead-code findings
- confidence notes

## Constraints

- do not perform broad cleanup by default
- keep findings concise and scoped

## Relation to commands/workflows

This skill supports final review and handoff quality checks.
It does not replace full build/test validation.
