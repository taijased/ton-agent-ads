# Name

trace-dependency-chain

## Purpose

Trace callers, callees, and dependency direction for a module or code path.

## When to use

- understanding impact of a local change
- mapping inbound and outbound dependencies
- preparing for review or refactor

## When not to use

- full repository research
- bug root-cause analysis by itself
- full blast-radius documentation by default

## Inputs

- entry file or symbol
- optional boundary scope

## Steps

1. identify the entry module or symbol
2. trace direct callers and callees
3. note any app-to-package or package-to-prisma edges
4. summarize the dependency chain

## Output format

- entry point
- callers
- callees
- boundary notes

## Constraints

- stay within the requested chain
- keep output concise
- include exact file references when possible

## Relation to commands/workflows

This skill supports research, review, and scoped implementation tasks.
It does not replace full architecture research.
