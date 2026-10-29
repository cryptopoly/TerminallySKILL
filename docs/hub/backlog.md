---
title: Backlog and issues
order: 3
summary: Reminders for Dan, then every task with priority and status.
---
# Backlog and issues

Priority: P1 urgent, P2 next, P3 later. Status: todo, in progress, done. Done items stay in the list, marked; they are not deleted.

## Reminders for Dan

- [ ] **Monthly, first week: dependency and security review.** Update the packages we use and check for security issues, so we ship the newest, safest software we can. Run `npm audit`, `npm outdated`, check Electron's release notes and security advisories, bump, then run `npm run test:ci`, `npm run test:e2e` and `npm run test:package:mac:arm64`. A monthly GitHub issue is opened automatically by `.github/workflows/dependency-review.yml` as the prompt. Next due: **2026-11-02**.
- [ ] **Also review immediately** when a serious advisory is in the news (Electron, node-pty, ws, electron-updater are the shipped runtime packages).
- [ ] **Release tweet / notes for 0.9.103:** lead with the privacy line "No telemetry. No analytics. No account." (verified 2026-10-29: no telemetry, analytics or crash-reporting code in the app; the only network use is the update check, AI providers and SSH/VNC the user chooses).
- [ ] Hand-test the 0.9.103 features in a packaged build (attention alert, one schedule, Privacy tab) before release.
- [ ] Hand-test the packaged v0.9.102: `python3` typing, Explain & fix, language switch, Arabic layout.
- [ ] Ask a few native speakers to review translations (see [decisions](decisions.md) item 2).

## Backlog

- [x] **P1, done.** Dependency security update: Electron 42.11.18, electron-updater 6.8.11, build tools; `npm audit` 0 (2026-10-28).
- [x] **P1, done on branch.** Monthly dependency review workflow and this hub (the workflow only starts opening issues once merged to `staging`).
- [x] **P1, done on branch.** Attention layer (tab dot, badge, notification).
- [x] **P1, done on branch.** Scheduled workflows.
- [x] **P1, done on branch.** Privacy and network panel.
- [ ] **P1, in progress.** Upgrade Electron 42 to 45 (42 is out of support since 2026-10-21): now part of 0.9.103 (branch `feat/electron-45`).
- [ ] **P1, todo.** Pick and build one more headline feature for 0.9.103 (see [decisions](decisions.md) item 10).
- [ ] **P1, in progress.** Local OpenSSH remote-session e2e (branch `test/local-ssh-e2e`).
- [ ] **P1, todo.** Merge both branches into `staging`, bump to 0.9.103, write release notes, release.
- [ ] **P2, todo.** Multi-host SSH run.
- [ ] **P2, todo.** Command blocks lite.
- [ ] **P3, banked.** Private tab ("don't record this tab"): see [ideas](ideas.md).
- [ ] **P3, banked.** Attention dots for other projects' tabs; "jump to next terminal that needs me" shortcut.
- [ ] **P3, banked.** Background schedules: today a schedule needs an open window (closing the last window on macOS skips runs). Options: keep a hidden window alive, launch at login, menu-bar item. Decide after real use.
- [ ] **P3, banked.** Schedule run history and an optional catch-up for missed runs.
- [ ] **P3, todo.** Fig-spec completions for the command builder (check licence first).
- [ ] **P2, in progress.** Lazy-load locale bundles (branch `feat/lazy-locales`, in 0.9.103).
- [ ] **P3, todo.** Fix 13 test-fixture type errors, then include test files in the type-check.

## Issues

| Issue | Priority | Status | Notes |
|---|---|---|---|
| npm 10.9.4 crashes on dependency re-resolve | P2 | worked around | Use `npx -y npm@11`; consider upgrading npm in CI and locally |
| `macos-latest` runner fails code signing | P2 | worked around | Pinned to `macos-15` |
| Old x86_64 `node-pty` `build/Release` leftover | P3 | todo | Harmless; clean up |
