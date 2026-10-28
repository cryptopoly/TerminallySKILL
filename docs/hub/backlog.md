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
- [ ] Hand-test the packaged v0.9.102: `python3` typing, Explain & fix, language switch, Arabic layout.
- [ ] Ask a few native speakers to review translations (see [decisions](decisions.md) item 2).

## Backlog

- [x] **P1, done.** Dependency security update: Electron 42.11.18, electron-updater 6.8.11, build tools; `npm audit` 0 (2026-10-28).
- [ ] **P1, in progress.** Monthly dependency review workflow and this hub.
- [ ] **P1, todo.** Flagship feature for 0.9.103 (see [decisions](decisions.md) item 1).
- [ ] **P2, todo.** Multi-host SSH run.
- [ ] **P2, todo.** Command blocks lite.
- [ ] **P2, todo.** Scheduled workflows (runs while the app is open).
- [ ] **P2, todo.** Privacy and network panel (static statement, outbound request list).
- [ ] **P3, todo.** Fig-spec completions for the command builder (check licence first).
- [ ] **P3, todo.** Lazy-load locale bundles.
- [ ] **P3, todo.** Fix 13 test-fixture type errors, then include test files in the type-check.

## Issues

| Issue | Priority | Status | Notes |
|---|---|---|---|
| npm 10.9.4 crashes on dependency re-resolve | P2 | worked around | Use `npx -y npm@11`; consider upgrading npm in CI and locally |
| `macos-latest` runner fails code signing | P2 | worked around | Pinned to `macos-15` |
| Old x86_64 `node-pty` `build/Release` leftover | P3 | todo | Harmless; clean up |
