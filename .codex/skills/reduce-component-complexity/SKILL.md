# Name

reduce-component-complexity

## Purpose

Split or simplify a complex UI component while preserving behavior.

## When to use

- a component is too large or mixes multiple responsibilities
- local UI structure needs cleanup within a scoped task

## When not to use

- full frontend redesign
- cross-feature component system changes
- backend/runtime modules

## Inputs

- component path
- desired simplification boundary

## Steps

1. read the component fully
2. identify safe split points
3. separate local concerns into smaller pieces
4. preserve inputs, outputs, and behavior
5. summarize the simplification briefly

## Output format

- component path
- extracted local pieces
- preserved boundary notes

## Constraints

- keep behavior stable unless instructed otherwise
- do not create a new design system by default
- keep output concise

## Relation to commands/workflows

This skill supports frontend implementation work.
It does not replace feature design or frontend workflow commands.
