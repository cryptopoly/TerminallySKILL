---
title: Status and handover
order: 1
summary: Read this first in every new session.
---
# Status and handover

> **Read first.** TerminallySKILL is an Electron + React terminal workspace. v0.9.102 is released (2026-10-28). Now: **v0.9.103**, a dependency-security update plus one new flagship feature. Then read [decisions](decisions.md) and [backlog](backlog.md).

Branch flow: feature branches go into `staging` (default branch), `staging` is promoted to `main`, tags are cut from the release commit. Release builds run from the GitHub `Release` workflow (macOS jobs are pinned to `macos-15`).

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
