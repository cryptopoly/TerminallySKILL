---
title: Status and handover
order: 1
summary: Read this first in every new session.
---
# Status and handover

> **Read first.** TerminallySKILL is an Electron + React terminal workspace (public repo `cryptopoly/TerminallySKILL`, site `terminallyskill.com`). **v0.9.103 is released (2026-10-31)** and the site is updated. Nothing is in flight. Next release is 0.9.104.

Branch flow: feature branches into `staging` (default, protected) by pull request; `staging` promoted to `main` by pull request; the GitHub **Release** workflow is run on `staging` or `main` with the version and creates a **draft** release; Dan publishes it. Required checks on both branches: `test` and `test (macos-latest)`. Windows CI is non-blocking.

## Handover for a fresh session (2026-10-31)

**State:** `staging` and `main` hold 0.9.103; the release is published; the website (`~/TerminallySKILLSite/TerminallySKILLSite`, repo `cryptopoly/TerminallySKILLSite`, GitHub Pages from `main`) is updated. Open PR: the hub checklist PR into `staging` (docs only). No other work in flight; no agent worktrees; local branches are just `staging` and `main`.

**Rules that matter**
- `staging` and `main` are protected: changes go by pull request; required checks are `test` and `test (macos-latest)`; Windows CI failures are expected and non-blocking. Dan merges PRs himself (my permission mode blocks merging without review) and publishes releases.
- The site repo has no branch protection: pushing to its `main` publishes at once. Prepare site changes on a branch, push to `main` only after the release is published.
- Claude Code permission rules live in `.claude/settings.local.json` (local only; includes `gh workflow run Release*`, `gh release view/edit/upload`). Only Dan edits them.
- Run the Release workflow with `gh workflow run Release --ref staging -f version=X`. If a macOS job fails at "staple" with a network error (Apple), `gh run rerun <id> --failed`.
- No `Co-Authored-By` or attribution lines in commits or PR text. Replies short; style is terse.

**Test machines (Parallels)**
- `Ubuntu 26.04 ARM64`: Node 22, Xvfb, Docker, sshd, repo clone `~/tsk`, passwordless sudo for `parallels`. Snapshots `fresh-install-2026-10-30`, `tools-ready-2026-10-30`. It has the 0.9.103 `.deb` installed and is Dan's general test VM. `prlctl exec` takes ONE string argument (it re-parses), runs as root; use `su - parallels -c '...'` for the user; umask there is 007 (scripts set 022). The Mac home is at `/media/psf/Home` inside it.
- `W11 Testing` (Windows 11 ARM64): snapshot `pre-test-2026-10-30`; Node and MinGit in `C:\tools`; the silent installer leaves out all `.exe`/`.dll` files (backlog). Other Windows VMs untouched.
- Tools: `tools/vm-test.sh` (full suite on Linux), `tools/vm-release-smoke.sh <version>` (release `.deb` from the draft), `tools/vm-release-smoke-windows.sh`, `tools/linux-package-smoke.sh`. CI also runs e2e on macOS and Windows.

**Lessons from 0.9.103:** test the files users download (the CI-built arm64 `.deb` had an x86 `pty.node`); commands like `sudo`/`apt` flush typed-ahead terminal input (step markers can be lost, now has a fallback); CI runner screens are about 1024x768 so e2e tests must not rely on a big window; node-pty has no Linux prebuilds, so build each Linux arch on its own runner.

**Dan's data on this Mac:** the packaged app and the dev app share `~/Library/Application Support/TerminallySKILL` (see memory). Never kill his running Electron.

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
