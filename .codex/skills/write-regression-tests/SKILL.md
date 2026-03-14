# Name

write-regression-tests

## Purpose

Add regression tests for a confirmed bug path or protected behavior.

## When to use

- bugfix work with known reproduction steps
- protecting an already identified failure path

## When not to use

- broad test strategy design
- feature design
- exploratory test creation without a clear target behavior

## Inputs

- bug description or repro
- affected paths
- current test location or pattern

## Steps

1. identify the failing or protected scenario
2. locate the closest existing test pattern
3. add focused regression coverage
4. keep assertions tied to the target behavior
5. summarize added coverage briefly

## Output format

- covered scenario
- test location
- assertions summary

## Constraints

- do not create a full test plan
- keep tests scoped to the known regression path
- keep output concise

## Relation to commands/workflows

This skill supports bugfix implementation and verification.
It does not replace testing design or bug workflow stages.
