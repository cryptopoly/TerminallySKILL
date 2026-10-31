---
title: First-run welcome tour
status: review
---
# Progress: first-run welcome tour (0.9.104)

Updated: 2026-10-31. Owner: agent. Branch: `feat/first-run-tour` (from `origin/staging`), PR into `staging`, not merged.

## Goal

On the very first launch of a brand-new install, show a short tour that starts at Create Project and explains each main screen. Never for users upgrading from 0.9.103. Re-openable at any time.

## Done

- **Flag** `hasSeenWelcomeTour` in `src/shared/settings-schema.ts` (default `false`). `backfillSettings` sets it to `true` when an existing `settings.json` lacks it (upgraders). With no `settings.json`, `createInitialSettings(dataDirHasExistingData(dataDir))` in `src/main/settings-manager.ts` shows the tour only when the data folder is empty or missing. Corrupt settings: the file is moved aside, so the folder is not empty, so no tour. Saved as `true` on Finish, Skip, Esc or close.
- **Tour** `src/renderer/src/components/onboarding/WelcomeTour.tsx`, layout maths in `welcome-tour-layout.ts`. Seven steps. Targets are `data-tour` attributes on real elements (empty-state Create Project button, falling back to the project selector; sidebar tabs; New Terminal, Help Guide and Settings buttons). SVG mask dims the app with one hole per target (touching holes are merged). Card placed below, above, beside, else centred, always inside the window. Missing target: card centred, nothing lit.
- **Accessibility**: `role="dialog"`, `aria-modal`, labelled by the title, described by the body (`aria-live="polite"`), Tab trapped in the card, focus on Next at each step, focus returned on close, Esc skips, Left/Right arrows go back/next (mirrored in right-to-left), progress dots as an `<ol>` with `aria-current="step"`. App shortcuts are held while the tour is open.
- **Wiring** in `AppShell.tsx`: auto-start once after settings load; "Create Project" pauses the tour, opens `ProjectDialog`, resumes at step 2 when the dialog closes. Re-open: help guide footer ("Show welcome tour") and the command palette entry.
- **i18n**: 22 keys under `onboarding.tour.*` in `en-additions.json` and all 18 locale JSON files; step titles match the existing tab names. `npm run i18n:check` passes.
- **Tests**: `src/main/settings-first-run.test.ts` (11 cases: helpers plus real temp data folders), `welcome-tour-layout.test.ts` (7). E2E `tests/e2e/welcome-tour.spec.mjs` (5 tests, window 1024x700). The launcher (`tests/e2e/electron-app.mjs`) now writes `data/settings.json` with `hasSeenWelcomeTour: true` before launch unless a spec passes `{ firstLaunch: true }` or already wrote its own settings, so other specs start without the tour.
- Results: `npm run test:ci` 447 unit tests passed; `npm run test:e2e` 20 passed, 6 skipped (SSH and packaged, skipped by design).

## Not done

- Packaged-app smoke test and the packaged spec were not run on this branch.
- Not tested on Windows or Linux, nor with a screen reader.
- No native Help menu (see decisions item 10).
- Translations are machine-written.

## How to resume

1. `cd` to the worktree, `git status`, `npm ci` if `node_modules` is missing.
2. `npm run test:ci` and `npm run test:e2e`.
3. Screenshots: a throwaway script launched the app with `launchTerminallySkill(testInfo, { TERMINALLYSKILL_USER_DATA_DIR: dir }, { firstLaunch: true })` after seeding `settings.json` with `uiLocale`, `theme` and `hasSeenWelcomeTour: false`, then clicked `welcome-tour-next`.
4. Next step: Dan reviews the PR and the decision points in [decisions](../decisions.md) item 10.

## Decisions to propose

Logged as [decisions](../decisions.md) item 10.
