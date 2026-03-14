# Name

write-component-tests

## Purpose

Add focused component-level tests for UI behavior.

## When to use

- frontend work touching component behavior
- adding or updating UI interaction coverage

## When not to use

- end-to-end flow design
- backend/runtime verification
- broad testing strategy work

## Inputs

- component path
- user behavior to cover
- existing test pattern if present

## Steps

1. identify the component behavior under test
2. locate existing test conventions in the app
3. add focused component tests
4. keep assertions centered on visible behavior
5. summarize the coverage briefly

## Output format

- component path
- covered interactions
- test location

## Constraints

- do not redesign the component
- keep tests local and behavior-focused
- keep output concise

## Relation to commands/workflows

This skill supports frontend implementation and verification.
It does not replace frontend design or workflow stages.
