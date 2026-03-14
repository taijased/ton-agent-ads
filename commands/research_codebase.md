# Research Codebase Command

You are an expert software engineer conducting comprehensive codebase research.

## YOUR ONLY JOB
Document and explain the codebase as it exists today.

## CRITICAL CONSTRAINTS
- do not suggest improvements
- do not critique implementation
- do not propose changes
- only describe what exists

## Process

### 1. Initial Response
Respond: "I'm ready to research the codebase. Please provide your research question or area of interest."

### 2. Decompose the Research Question
After receiving the research question:
1. read any directly mentioned files completely
2. analyze and decompose the question into 2-4 independent investigation areas
3. track progress with the local task list

### 3. Spawn Parallel Research Tasks
Use the `codebase-researcher` agent for parallel investigation when the areas are independent.

Routing rules:
- 2-4 parallel tasks for independent investigation areas
- sequential when one area depends on another's findings
- broad background searches are allowed when they do not block synthesis

Each research task must include:
- the specific question to answer
- starting files or paths if known
- required output format
- explicit scope boundaries

### 4. Synthesize Findings
After all tasks complete:
1. merge findings and resolve contradictions
2. build a coherent repo picture with cross-references
3. identify gaps and run at most one follow-up round if needed

### 5. Gather Metadata
Capture:
- date
- current git commit
- current git branch
- original research question

### 6. Generate Research Document
Use this structure:

```markdown
---
date: YYYY-MM-DD
researcher: Claude
commit: <short-sha>
branch: <branch>
research_question: "Original question"
---

# Research: <Topic>

## Summary
[2-3 paragraph executive summary]

## Detailed Findings

### 1. <Component or Area>
- **Location**: `path/to/file.ts:line`
- **Description**: What it does
- **Dependencies**: What it uses
- **Data flow**: Input -> Processing -> Output

## Code References
- `path/to/file.ts:line` - description

## Architecture Insights
- Pattern used: ...
- Data flow: A -> B -> C
- Key dependencies: ...

## Open Questions
- unresolved ambiguity
```

## Output Location

Save long-lived research docs to the owning app:

- app-local research: `apps/<app>/docs/<task>/research.md`
- repo-wide workflow/orchestration research with no better owner: `apps/agent/docs/<task>/research.md`

Do not save long-lived research docs to `.thoughts/` or repo root.

## Stack Context Output

Research must include stack context.

Add to the research document:

## Stack Context

- runtime type
- framework
- build
- test
- shared modules
- relevant prompts

Save this in:

`apps/<app>/docs/<task>/research.md`

Later commands should reuse this instead of re-detecting stack.

## Chat Output

While running research:
- keep chat output minimal
- use short status lines only
- write detailed findings to the research document

Do not repeat full research results in chat.

Use chat only for:
- stage status
- blockers
- final short summary

Docs are the source of truth.

## Critical Rules
1. always include exact `file:line` references
2. read directly referenced files completely
3. use agents for parallel research when helpful
4. keep findings objective and evidence-based
5. preserve exact repository paths

## Chat Output

While running research:
- keep chat output minimal
- use a short status line only
- write detailed findings only to the research document
