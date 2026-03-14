# Name

review-diff

## Purpose

Review a code diff for correctness, scope alignment, and shared impact.

## When to use

- checking a focused code change before handoff
- validating whether a diff matches the intended scope
- checking whether touched shared modules affect multiple surfaces

## When not to use

- full design review
- broad codebase research
- end-to-end workflow execution

## Inputs

- diff or changed file list
- optional task scope or plan path

## Steps

1. read the diff and changed files
2. identify touched ownership boundaries in `apps/`, `packages/`, and `prisma/`
3. check scope alignment against the stated task
4. note correctness or consistency concerns
5. produce a short findings list

## Output format

- scope summary
- touched ownership boundaries
- concise findings
- unresolved questions

## Constraints

- do not rewrite the workflow
- do not restate the full diff
- keep output concise

## Relation to commands/workflows

This is a helper review action.
It supports commands but does not replace design review or implementation workflow.
