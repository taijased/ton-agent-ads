# Clean Architecture

Use this prompt when a task touches layered application code.

Apply these principles as local guidance:
- keep responsibilities explicit by layer
- make integration boundaries visible
- prefer dependency direction from outer layers toward inner abstractions
- isolate persistence and external services behind clear boundaries where the repository already does so
- document when behavior is app-local versus shared in `packages/` or `prisma/`

This guidance is stack-agnostic and should be interpreted in the context of the actual target app.
