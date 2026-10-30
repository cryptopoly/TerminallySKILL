---
title: Progress: Electron 45 upgrade
status: done
---
# Progress: Electron 45 upgrade

Updated: 2026-10-29. Owner: Claude. Branch: `feat/electron-45` (off `feat/0.9.103-attention-schedule-privacy` at `0692317f`).

## Goal

Move from Electron 42.11.18 to 45.1.0 (newest 45.x on npm) for 0.9.103, fixing every breaking change that touches the app.

## Versions

| Package | Before | After |
|---|---|---|
| electron | 42.11.18 | 45.1.0 (Node 24.22.1, Chromium 156, ABI 150) |
| node-abi (transitive, via @electron/rebuild) | 4.31.0 | 4.40.0 |
| electron-builder, electron-vite, electron-updater, @electron-toolkit/utils, vite, node-pty | unchanged | unchanged |

`engines.node` stays `>=22.12.0` (Electron 45's own install requirement is unchanged), so CI stays on Node 22.

## Breaking changes (43, 44, 45) and what was done

- **node-abi did not know Electron 45** (`Could not detect abi for version 45.1.0`), so `npm ci` failed in postinstall. Fix: lockfile-only bump of node-abi to 4.40.0. node-pty 1.1.0 then compiles from source against Electron 45 headers with no patch.
- **43: dialogs default to Downloads, OS no longer remembers the last folder.** Added `src/main/dialog-path.ts`; the file, folder, flow import and flow export dialogs reopen in the last folder used this run.
- **44: main-process `clipboard.writeText` returns a Promise.** The IPC handler now returns it so errors reach the renderer.
- **44: macOS 12 dropped.** README now says macOS 13 Ventura; the packaged `LSMinimumSystemVersion` is 13.0 (from Electron).
- **44: Unity removed on Linux.** `app.setBadgeCount` is now macOS-only; comment corrected, no behaviour to change.
- **44: no 32-bit builds.** Release matrix is already x64/arm64 only.
- **45: synchronous `safeStorage` deprecated (removed in 46).** `secret-manager.ts` and `vnc-credentials.ts` use the async API. Electron documents that async decrypts data written by the sync API.
- No action needed: sandboxed-preload shims (our preload runs with `sandbox: false`), `window.open` children (handler denies all), clipboard in renderer (renderer uses `navigator.clipboard`), ASAR `fs.open` (only used on user files), `setPermissionRequestHandler`, `select-client-certificate`, login items, `contentTracing`, `nativeImage.toBitmap`, Linux rounded corners (no frameless window on Linux).

## Verified

- `npm ci` with npm 10.9.4 on a clean `node_modules`, then `npm audit`: 0 vulnerabilities.
- `npm run test:ci`: baseline, i18n, type-check, 266 unit tests (52 files), build.
- `npm run test:e2e`: 9 passed, 2 skipped (packaged and Docker, as designed).
- `npm run test:package:mac:arm64`: 1 passed. Signed with Developer ID; `codesign --verify --deep --strict` OK; node-pty `pty.node` and `spawn-helper` are in `app.asar.unpacked`, signed, hardened runtime.
- Packaged app launched against a temp data dir: `process.versions.electron` 45.1.0, a zsh pty ran a command, Settings and Privacy tab render. No deprecation warnings in stdout/stderr.

## Not verified

- Windows and Linux builds and runtime (no host here). The README's Linux line (glibc 2.28, Ubuntu 20.04, Debian 10) may be stale: Electron now only supports distros that are still supported upstream.
- Notarization (skipped locally, no Apple credentials) and the auto-update path from 0.9.102.
- safeStorage at runtime. Testing it would touch the real login Keychain. Needs a UAT check: an AI key and a VNC password saved in 0.9.102 still work after updating.
- macOS x64 build.

## Decisions to propose

- Keep the async safeStorage migration in 0.9.103 (recommended: Electron 46 forces it anyway, and the commit is separate so it can be reverted alone), or ship the synchronous calls one more release.
- Update the README Linux requirement once a Linux build is tested on Electron 45.
