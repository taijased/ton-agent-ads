# Name

expand-test-matrix

## Purpose

Expand an existing verification matrix with adjacent cases and regression coverage.

## When to use

- a task already has baseline verification coverage
- additional edge, failure, or adjacent checks are needed

## When not to use

- creating the primary workflow plan
- inventing a full design package
- writing all tests from scratch without a scoped target

## Inputs

- existing test matrix or verification notes
- changed areas

## Steps

1. read the current verification scope
2. identify missing adjacent checks
3. expand the matrix with concise cases
4. group by behavior area

## Output format

- updated matrix entries
- newly covered areas
- remaining gaps if any

## Constraints

- do not create large narrative docs by default
- keep the matrix concise and actionable

## Relation to commands/workflows

This skill supports testing and handoff steps.
It does not replace testing sections in design or plan docs.
