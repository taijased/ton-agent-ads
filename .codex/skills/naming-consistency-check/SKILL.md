# Name

naming-consistency-check

## Purpose

Check whether naming stays consistent with surrounding code and docs.

## When to use

- after a refactor or feature addition
- when adding new modules, types, handlers, or docs

## When not to use

- full style-guide creation
- architecture review
- broad editorial rewriting

## Inputs

- changed file list
- optional surrounding paths for comparison

## Steps

1. inspect names in changed paths
2. compare with neighboring modules and repository conventions
3. note inconsistent or ambiguous naming briefly

## Output format

- checked paths
- naming findings
- concise follow-up note if needed

## Constraints

- keep output concise
- focus on consistency, not preference debates

## Relation to commands/workflows

This skill supports review and cleanup work.
It does not replace code-style guidance or design review.
