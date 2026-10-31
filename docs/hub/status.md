---
title: Status and handover
order: 1
summary: Read this first in every new session.
---
# Status and handover

> **Read first.** TerminallySKILL is an Electron + React terminal workspace (public repo `cryptopoly/TerminallySKILL`, site `terminallyskill.com`). **v0.9.103 is released (2026-10-31)** and the site is updated. Nothing is in flight. Next release is 0.9.104.

Branch flow: feature branches into `staging` (default, protected) by pull request; `staging` promoted to `main` by pull request; the GitHub **Release** workflow is run on `staging` or `main` with the version and creates a **draft** release; Dan publishes it. Required checks on both branches: `test` and `test (macos-latest)`. Windows CI is non-blocking.

## What 0.9.103 shipped

Electron 45; attention alerts and agent-aware dots (Claude Code, Codex); jump-to-next-terminal (`Cmd+Shift+J`); scheduled workflows with history and catch-up; Privacy tab and secret masking; lazy-loaded languages and four more themes (12); first-run welcome tour; fixes found during testing: scripts with no project open, Linux arm64 terminal (native arm64 build), workflows hanging after `sudo` or `apt`. Linux arm64 ships as a `.deb` only. Notes: `docs/releases/v0.9.103.md`.

## How releases are tested (see [release checklist](release-checklist.md))

`tools/vm-test.sh` runs the whole suite on the Ubuntu arm64 Parallels VM (Docker SSH included); `tools/vm-release-smoke.sh <version>` installs the release `.deb` from the draft and runs the packaged spec; Windows is best effort (`tools/vm-release-smoke-windows.sh`, blocked by the installer issue in the backlog). The lesson of this release: test the files users download, not a local build.

## Next up

1. Dependency and security review, due **2026-11-02** (see backlog reminders).
2. Backlog Issues table: Windows tests and installer, terminal panel squeezed on small windows, no error shown when a terminal cannot open, 0.9.102 arm64 Linux probably had the dead-terminal bug.
3. Native-speaker review of translations (now including the 22 tour strings).
4. Pick the 0.9.104 headline feature (decisions item 5).

History of the 0.9.103 build: [status history](progress/status-history-0.9.103.md).
