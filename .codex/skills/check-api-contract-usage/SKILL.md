# Name

check-api-contract-usage

## Purpose

Check how DTOs, payloads, schemas, and shared contracts are used across modules.

## When to use

- a task touches request or response shapes
- checking whether shared contract changes affect multiple consumers
- validating cross-module contract usage

## When not to use

- general code review
- full API redesign
- persistence-only tasks with no contract surface

## Inputs

- contract, DTO, schema, or endpoint path
- optional target apps or modules

## Steps

1. identify the contract source
2. trace where it is imported or mirrored
3. note cross-module and cross-app usage
4. summarize consistency or mismatch findings briefly

## Output format

- contract source
- usage locations
- affected surfaces
- concise findings

## Constraints

- do not dump full schemas
- keep output short
- focus on usage, not redesign

## Relation to commands/workflows

This skill supports design review, shared-ownership checks, and implementation validation.
It does not replace full API research.
