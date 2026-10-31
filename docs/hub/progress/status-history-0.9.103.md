---
title: Status history for 0.9.103
order: 99
summary: The day-by-day status updates from building 0.9.103, kept for reference.
---

# Status and handover

> **Read first.** TerminallySKILL is an Electron + React terminal workspace. v0.9.102 is released (2026-10-28). Now: **v0.9.103**, a dependency-security update plus three new features (attention alerts, scheduled workflows, Privacy tab) and, added late, Electron 45, lazy-loaded locales and one more headline feature (in progress). Then read [decisions](decisions.md) and [backlog](backlog.md).

Branch flow: feature branches go into `staging` (default branch), `staging` is promoted to `main`, tags are cut from the release commit. Release builds run from the GitHub `Release` workflow (macOS jobs are pinned to `macos-15`).

## Update 2026-10-31 (0.9.104 work)

First-run welcome tour built on `feat/first-run-tour`, PR open into `staging` (not merged). Shows only on a brand-new data folder; upgraders never see it. See [progress](progress/first-run-tour.md) and [decisions](decisions.md) item 10 for points to confirm.

## Update 2026-10-29, night (final scope built)

All four extra features are merged on `feat/0.9.103-attention-schedule-privacy` and verified there: `test:ci` 427 unit tests, e2e 15 passed (6 skipped by design), local OpenSSH e2e 4 passed, packaged mac arm64 smoke test passed (Electron 45.1.0). **Left:** Dan starts the Docker daemon so the Docker SSH test can run; Claude then does the version bump to 0.9.103, `docs/releases/v0.9.103.md` (lead with "No telemetry. No analytics. No account."), one PR into `staging`; Dan hand-tests the [UAT list](uat-0.9.103.md) in a packaged build (secrets after update, real Claude Code dots), merges, promotes, releases, tweets. Housekeeping awaiting Dan's OK: delete old agent worktrees and merged branches.

## Update 2026-10-29, night (later)

Electron 45, lazy locales and the local SSH test are merged and verified (test:ci 271 unit tests, e2e 11 passed, packaged mac arm64 smoke test passed). The main folder now sits on that merged code (run `npm ci` done). Dan chose four extra features: ideas 6, 7, 14, 15; three agents are building them from `origin/integ/0.9.103`. After they report: merge, full tests, packaged smoke test, UAT list update, version bump, notes, PR.

## Update 2026-10-29, night

**Scope of 0.9.103 grew (Dan):** Electron 45, lazy-loaded locales and one more headline feature join the release. Four agents are working in separate worktrees: `feat/electron-45`, `feat/lazy-locales`, `test/local-ssh-e2e`, `docs/ideas-expansion`. Merged into `integ/0.9.103` (verified: test:ci 271 unit tests, e2e 11 passed 2 skipped): lazy locales, ideas expansion. Waiting: Electron 45, local SSH e2e. NOTE: agent worktrees branched from older commits (main or earlier), so merge into `integ/0.9.103` and re-test. Next: Dan picks the extra feature from the expanded [ideas](ideas.md); then build, merge, full test run, packaged smoke test, version bump, notes, PR.

## Update 2026-10-29, late

**Done since the earlier update:** schedule icon in the Scripts list; Opus translation review merged (77 strings); four Mid themes and a three-column Theme tab with live previews; settings card renamed "Notifications"; fix for the command-finish dot (typed commands) and for ghost "running" runs. `npm run test:ci` passes on the branch.

**Left before release**

1. Dan: re-test the green/red dot with `sleep 40` (still unexplained on his machine), then the [UAT checklist](uat-0.9.103.md) in a packaged build.
2. Claude, on request: run `npm run test:package:mac:arm64`, bump to 0.9.103, write `docs/releases/v0.9.103.md` (lead with "No telemetry. No analytics. No account."), open one PR (the feature branch already contains the dependency commit).
3. Dan: merge into `staging`, promote to `main`, run the `Release` workflow, post the tweet.
4. Optional: busy badge for any running terminal command ([decisions](decisions.md) item 9).

**Note:** Dan's dev app shares its data folder with the outer app, so run records can cross over.

## Update 2026-10-29

**Done** (branch `feat/0.9.103-attention-schedule-privacy`, on top of `chore/deps-and-hub-0.9.103`, commit `4f0fb3c2`)

- **Attention layer.** Tab dot (green finished, red failed, pulsing amber approval), dock badge, desktop notification (click opens that terminal). Settings → General: switch plus threshold. See [progress](progress/features-0.9.103.md).
- **Scheduled workflows.** Clock icon in the workflow header opens one dialog (interval or daily, weekday chips). Main process timer, runs in a background tab.
- **Privacy tab.** Statement, what can leave the computer, host-only request list for this session.
- Translations for all 18 locales (machine-assisted, not native-reviewed). 263 unit tests, type-check, i18n check, build and 6 Electron E2E tests pass, including new ones for a scheduled run and the approval alert.
- Ideas bank and the "no-logs" verdict added: [ideas](ideas.md).

**Open for Dan**

- Decide ship timing and merge order ([decisions](decisions.md) items 1 and 2).
- Hand-test in the packaged app: run a 20-second command in another tab and switch away (expect dot and notification); add a schedule and wait for it. macOS may ask to allow notifications the first time.
- Everything from the 2026-10-28 list below still stands.

**Known limits**

- A tab dot only shows for terminals in the project you are viewing; notification and dock badge cover other projects. No numeric badge on Windows.
- Schedules do nothing while the app is closed. Only the first open window runs them.
- Version is still 0.9.102; bump and release notes happen at release.

## Update 2026-10-28, evening

**Done**

- v0.9.102 released with 19 languages, Explain & fix, keystroke routing, safer persistence, Electron 42. `main` fast-forwarded to `staging`. Site updated.
- Branch `chore/deps-and-hub-0.9.103` (off `staging`): Electron 42.4.0 → 42.11.18, electron-updater 6.8.3 → 6.8.11, `sharp`, `vite`, `vitest`, `postcss` bumped, overrides for `js-yaml`, `tar` and `undici`. `npm audit`: **0 vulnerabilities** (was 23, 1 critical). Tests, type-check, build, E2E and the packaged macOS smoke test pass.
- This hub created. Competitor research done: [research](research-competitors.md).

**Open for Claude**

- Build the flagship feature once chosen (see [decisions](decisions.md) item 1).
- Add the monthly dependency review workflow (see [backlog](backlog.md)).

**Open for Dan**

- Choose the flagship feature for 0.9.103 ([decisions](decisions.md) item 1).
- Try the packaged v0.9.102 by hand: `python3` typing, Explain & fix, language switch.
- Optional: native-speaker review of translations; Arabic right-to-left check.

**Gotcha for the next agent**

- npm 10.9.4 crashes ("Cannot read properties of null (reading 'edgesOut')") whenever dependencies must be re-resolved, even for the original `package.json`. Resolve with `npx -y npm@11 install`, then confirm `rm -rf node_modules && npm ci` works on npm 10 (CI uses it). See [decisions](decisions.md).
