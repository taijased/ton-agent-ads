# Name

contract-check

## Purpose

Check interface and contract safety across touched modules.

## When to use

- a task changes shared types, DTOs, schemas, or repository interfaces
- validating cross-module contract safety

## When not to use

- purely visual frontend tweaks
- broad architecture review
- general code cleanup

## Inputs

- changed contract paths
- optional diff or task scope

## Steps

1. identify contract sources
2. trace impacted consumers
3. check for usage consistency across modules
4. summarize contract impact briefly

## Output format

- contract paths
- affected consumers
- concise findings

## Constraints

- focus on interface safety
- do not rewrite contracts by default
- keep output concise

## Relation to commands/workflows

This skill supports shared-module and integration checks.
It does not replace design review or implementation workflow.
