---
title: Progress: dependency security update
status: done
---
# Progress: dependency security update

Updated: 2026-10-28. Owner: Claude. Branch: `chore/deps-and-hub-0.9.103` (off `staging`).

## Goal

Move to patched Electron and clear `npm audit` without changing the Electron major.

## Done

- Electron `^42.11.18`, electron-updater `^6.8.11`, `sharp ^0.35.5`, `vite ^7.3.7`, `vitest ^4.1.12`, `postcss ^8.5.32`. Overrides: `js-yaml ^4.3.2`, `tar ^7.5.22`, `@electron/get > undici ^7.30.1`.
- `scripts/check-runtime-baseline.mjs` expectations updated to match.
- `npm audit` 0 (was 23). `npm run test:ci`, `npm run test:e2e`, `npm run test:package:mac:arm64` pass.

## Not done

- Not released. Goes out with 0.9.103.

## How to resume

- `git checkout chore/deps-and-hub-0.9.103`. To re-resolve the lockfile use `npx -y npm@11 install`, then `rm -rf node_modules && npm ci` (npm 10 crashes on a fresh resolve; see [status](../status.md)).
