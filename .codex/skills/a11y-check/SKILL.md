# Name

a11y-check

## Purpose

Run a focused accessibility check on a changed UI surface.

## When to use

- frontend work that changes interactive UI
- verifying labels, semantics, focus, and keyboard behavior

## When not to use

- backend/runtime tasks
- full accessibility audit of the entire product
- visual redesign work without a changed interactive surface

## Inputs

- changed UI path
- optional test or screen scope

## Steps

1. identify the changed UI surface
2. check semantics, labels, focus behavior, and keyboard access
3. note accessibility risks or confirmations briefly

## Output format

- checked surface
- accessibility findings
- unresolved questions if any

## Constraints

- keep output concise
- do not generate a large audit by default

## Relation to commands/workflows

This skill supports frontend implementation and review.
It does not replace frontend design or QA workflows.
