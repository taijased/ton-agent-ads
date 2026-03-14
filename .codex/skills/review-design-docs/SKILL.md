# Name

review-design-docs

## Purpose

Review a design package for completeness, consistency, and doc coverage.

## When to use

- checking a design package before approval
- verifying that required docs exist and align
- checking whether shared ownership is documented

## When not to use

- root-cause investigation
- code diff review
- implementation planning from scratch

## Inputs

- design docs path
- optional task scope

## Steps

1. read the design package docs
2. verify expected sections exist
3. check consistency across architecture, behavior, decisions, testing, and plan references
4. note missing or unclear areas
5. return a concise review summary

## Output format

- reviewed docs
- completeness findings
- consistency findings
- explicit gaps or questions

## Constraints

- do not rewrite the docs
- do not dump document contents
- keep output short and evidence-based

## Relation to commands/workflows

This skill supports design stages and approval checks.
It does not replace architect-reviewer or command-owned review gates.
