# Repository automation

Groundline CI runs the test, lint, typecheck, and build commands for every pull request and every change to `main`.

After CI succeeds, the merge workflow independently verifies that a pull request:

- is open and belongs to this repository;
- was authored by the repository owner;
- uses a `codex/` branch;
- still points to the exact commit CI tested; and
- is cleanly mergeable.

Eligible pull requests are marked ready and squash-merged automatically. The paid AI repair workflow is disabled unless the repository variable `GROUNDLINE_AUTOPILOT_ENABLED` is explicitly set to `true`.
