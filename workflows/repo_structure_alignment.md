# Repository Structure Alignment Workflow

Purpose:
Verify that repository structure, app boundaries, shared code ownership, and workflow assumptions match the actual codebase.

## Use When

Use this workflow when:
- defining or refining `AGENTS.md`
- introducing or updating `commands/`
- introducing or updating `agents/`
- introducing or updating `workflows/`
- introducing or updating `prompts/`
- validating docs path conventions
- checking whether app-local workflow assumptions fit the monorepo

## Command Sequence

### Step 1 — Repository Research
Run:

`research_codebase`

Use a research question focused on:
- top-level repository structure
- app boundaries
- shared code ownership
- workflow compatibility with actual code layout
- prompt layout and guidance ownership

Expected output:
- repository compatibility research
- evidence-backed map of apps, packages, prisma, and ownership boundaries

Recommended output location:
`apps/agent/docs/repo-workflow-compatibility/research.md`

### Step 2 — Review Workflow Assumptions
Based on the research output, review whether these assumptions hold:
- commands are app-scoped
- task docs belong under `apps/<app>/docs/<task>/`
- frontend and backend app categories are accurate
- shared code ownership is correctly modeled
- existing command names match real repository ownership

### Step 3 — Update Repository Instructions
Only after research is complete:
- update `AGENTS.md`
- update `apps/README.md`
- update `commands/README.md`
- update `agents/README.md`
- update `workflows/README.md` if needed
- update `prompts/` if needed

## Required Output

The research should explicitly produce:
- top-level structure map
- per-app role map
- shared code dependency map
- workflow compatibility matrix
- structural conflicts
- recommended command-to-app mapping

## Important Rules

1. Facts first, recommendations second.
2. Do not assume the monorepo is app-local if shared code is the real ownership boundary.
3. Do not update repo rules before structure is understood.
4. Keep evidence tied to exact paths and references.
5. Use this workflow whenever workflow architecture changes materially.
