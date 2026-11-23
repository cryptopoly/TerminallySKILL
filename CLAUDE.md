# TerminallySKILL

Project management (status, decisions, backlog, progress notes, UAT notes) lives in ProjectHub, a private hub outside this repository. Do not add `docs/hub` or other planning pages here. Read the ProjectHub briefing at session start (or run `hub context`), and update it with the `hub` command after every batch of changes.

- Every question or decision raised in chat is logged in ProjectHub the same turn (`hub decision add`), with a recommendation.
- **Monthly dependency and security review** is a standing reminder (see the ProjectHub backlog): update packages, run `npm audit`, check Electron advisories.
- Branch flow: feature branches into `staging` (default), `staging` promoted to `main`. Release builds run from the GitHub `Release` workflow.
- Tests: `npm run test:ci`, `npm run test:e2e`, `npm run test:package:mac:arm64`. Resolve lockfile changes with `npx -y npm@11` (npm 10 crashes), then verify with `npm ci`.
- No `Co-Authored-By` or attribution lines in commits.
