# Name

generate-verification-matrix

## Purpose

Generate a concise verification checklist or matrix for the scoped task.

## When to use

- preparing final verification notes
- summarizing required checks for a task
- turning scattered checks into a short matrix

## When not to use

- creating a full test plan from scratch
- replacing design testing docs
- broad QA planning for the whole repo

## Inputs

- task scope
- required checks
- completed gate results if available

## Steps

1. gather required checks from task context
2. group them by area
3. format them into a concise matrix or checklist

## Output format

- table or checklist
- area
- check
- result or status

## Constraints

- keep it concise
- do not expand into a long narrative report

## Relation to commands/workflows

This skill supports review, verification, and handoff steps.
It does not replace testing sections in design or bug docs.
