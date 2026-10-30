# TerminallySKILL

Read `docs/hub/status.md` first in every session, then the open items in `docs/hub/decisions.md` and the reminders at the top of `docs/hub/backlog.md`.

- Markdown in `docs/hub/` is the source of truth. Rebuild the hub after every batch of changes: `python3 tools/build_hub.py` (output in `docs/site/index.html`, no server needed).
- Every question or decision raised in chat is logged in `docs/hub/decisions.md` the same turn, with a recommendation.
- **Monthly dependency and security review** is a standing reminder (see the backlog): update packages, run `npm audit`, check Electron advisories.
- Branch flow: feature branches into `staging` (default), `staging` promoted to `main`. Release builds run from the GitHub `Release` workflow.
- Tests: `npm run test:ci`, `npm run test:e2e`, `npm run test:package:mac:arm64`. Resolve lockfile changes with `npx -y npm@11` (npm 10 crashes), then verify with `npm ci`.
- No `Co-Authored-By` or attribution lines in commits.
