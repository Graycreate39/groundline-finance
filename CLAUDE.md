# Groundline automation instructions

Groundline is an auditable finance application. Treat numerical correctness,
provenance, and explicit incomplete states as product behavior, not optional
polish.

## Required checks

Before committing a repair or declaring a pull request ready, run:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Resolve failures autonomously when the intended behavior is established by the
existing code, tests, README, or pull-request description. Do not ask the owner
to interpret routine compiler, test, formatting, build, or merge-conflict
errors.

## Merge conflicts

Preserve both branches' compatible behavior. Prefer the current `main` branch
for already-shipped fixes and repository automation. Prefer the pull-request
branch for the feature named in that pull request. Remove every conflict marker,
run all required checks, and commit the resolution to the pull-request branch.

If two sides encode incompatible product requirements and neither the README nor
the pull-request description establishes priority, leave the pull request open
and explain the exact decision that cannot be inferred. Never invent financial
facts, credentials, provider results, or fallback values to make a check pass.

## Review standard

Fix correctness, security, privacy, data-loss, broken-build, and financial-model
integrity issues before merge. Ignore purely stylistic preferences. Generated
files under `dist/` must agree with their source files and should be regenerated
with `npm run build` rather than edited independently.

## Autonomy boundaries

Automation may mark owner-authored `codex/` pull requests ready, repair them,
enable auto-merge, and merge them after required checks pass. Never expose or
commit secrets. Never weaken tests or validation merely to obtain a passing run.
