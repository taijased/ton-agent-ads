# Name

review-risk-scope

## Purpose

Sanity-check the scope and blast radius of a planned change.

## When to use

- validating whether a change is local or shared
- checking whether touched paths imply higher risk
- reviewing whether the described scope matches the actual impact area

## When not to use

- full bug root-cause work
- architecture design
- implementation execution

## Inputs

- task description or plan path
- touched files or affected paths

## Steps

1. identify touched apps, packages, and prisma paths
2. classify the change boundary
3. map likely adjacent impact areas
4. summarize risk scope briefly

## Output format

- primary ownership boundary
- adjacent impact areas
- risk level cues
- concise notes

## Constraints

- do not redesign the task
- do not expand into a full blast radius report by default
- keep findings concise

## Relation to commands/workflows

This skill is a helper check for scope sanity.
It supports workflows but does not replace bug-tracer or blast-radius-analyzer.
