# Name

extract-shared-logic

## Purpose

Identify and perform a focused extraction of reusable logic into shared ownership when the task already requires it.

## When to use

- a task already established that logic belongs in `packages/` or `prisma/`
- multiple apps depend on the same behavior
- shared ownership is explicit in the design or plan

## When not to use

- speculative abstraction
- replacing command-owned architecture decisions
- extracting code when ownership is still unclear

## Inputs

- source paths
- target shared location
- existing design or ownership evidence

## Steps

1. confirm shared ownership boundary
2. identify the minimal reusable unit
3. extract into the target shared module
4. update callers that are part of the scoped task
5. summarize the extraction briefly

## Output format

- source paths
- target shared path
- extracted responsibility
- affected callers

## Constraints

- do not invent new ownership without evidence
- keep extraction minimal
- do not perform a broad refactor by default

## Relation to commands/workflows

This skill supports tasks that already require shared ownership work.
It does not decide workflow or ownership by itself.
