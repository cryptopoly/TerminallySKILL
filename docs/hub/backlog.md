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
- [x] **Release tweet / notes for 0.9.103 (released 2026-10-31):** lead with the privacy line "No telemetry. No analytics. No account." (verified 2026-10-29: no telemetry, analytics or crash-reporting code in the app; the only network use is the update check, AI providers and SSH/VNC the user chooses).
- [x] Hand-test the 0.9.103 features in a packaged build before release (done 2026-10-31, UAT passed).
- [ ] Hand-test the packaged v0.9.102: `python3` typing, Explain & fix, language switch, Arabic layout.
- [ ] Ask a few native speakers to review translations, including the 22 welcome-tour strings (see [decisions](decisions.md) item 3).
- [ ] Check whether 0.9.102 arm64 Linux has the dead-terminal bug (x86 `pty.node`); if so, say so in the next release notes.

## Backlog

- [x] **P1, done.** Dependency security update: Electron 42.11.18, electron-updater 6.8.11, build tools; `npm audit` 0 (2026-10-28).
- [x] **P1, done on branch.** Monthly dependency review workflow and this hub (the workflow only starts opening issues once merged to `staging`).
- [x] **P1, done on branch.** Attention layer (tab dot, badge, notification).
- [x] **P1, done on branch.** Scheduled workflows.
- [x] **P1, done on branch.** Privacy and network panel.
- [x] **P1, done on branch.** Upgrade Electron 42 to 45 (42 is out of support since 2026-10-21): now part of 0.9.103 (branch `feat/electron-45`).
- [x] **P1, done on branch.** Four extra features for 0.9.103: agent-aware attention (14), jump-to-next-terminal (6), schedule history and catch-up (7), secret masking (15). See [ideas](ideas.md).
- [x] **P1, done on branch.** Local OpenSSH remote-session e2e (branch `test/local-ssh-e2e`).
- [x] **P1, done (published 2026-10-31).** Release 0.9.103: version bumped, notes written, PR #2 open into `staging`. Dan: hand-test UAT, merge, promote to `main`, run the Release workflow, tweet.
- [x] **P2, started.** Ubuntu 26.04 ARM64 VM is set up (snapshot `fresh-install-2026-10-30`, Node 22, Xvfb, repo clone in `~/tsk`); test:ci and e2e pass there. Still todo: `prlctl` script, GitHub Actions matrix, Windows VMs. Original item: GitHub Actions matrix plus a Parallels `prlctl` script (see [decisions](decisions.md)).
- [ ] **P2, todo (from 0.9.103 feedback, see [decisions](decisions.md) item 11).** Maximise terminal toggle (11a); running/needs-you/idle dots with legend (11b); agent-waiting notifications: BEL, quiet-terminal check, repeat reminder, verify Claude Code output first (11c, headline candidate); cycle-projects shortcut (11d); masking gaps: empty-user URL password, `DB_PASS`/`PWD`, `_KEY` names (11e).
- [ ] **P2, todo (decisions item 12).** zsh history: HISTFILE points into the temp ZDOTDIR so history is lost per tab (12c); no OS alert for user stops, exit 130/143/129 (12a); workflow step marker `printf` leaking to the display (12b, P3).
- [ ] **P2, todo.** Multi-host SSH run.
- [ ] **P2, todo.** Command blocks lite.
- [ ] **P3, banked.** Private tab ("don't record this tab"): see [ideas](ideas.md).
- [ ] **P3, banked.** Attention dots for other projects' tabs; "jump to next terminal that needs me" shortcut.
- [ ] **P3, banked.** Background schedules: today a schedule needs an open window (closing the last window on macOS skips runs). Options: keep a hidden window alive, launch at login, menu-bar item. Decide after real use.
- [ ] **P3, banked.** Schedule run history and an optional catch-up for missed runs.
- [ ] **P3, todo.** Fig-spec completions for the command builder (check licence first).
- [x] **P2, done on branch.** Lazy-load locale bundles (branch `feat/lazy-locales`, in 0.9.103).
- [ ] **P3, todo.** Fix 13 test-fixture type errors, then include test files in the type-check.

## Next release (0.9.104) checklist

Pulled together after 0.9.103 shipped. Details for each are in the Issues table below.

- [ ] **P2.** Terminal panel keeps at least a few rows on small windows (about 1024x700) when the Editor Prompt is on. Found by CI screenshots; a small laptop screen can hit it.
- [ ] **P2.** Show an error message when a terminal cannot open (Run Script did nothing and said nothing when no terminal could start). The failure is swallowed in `executeScript` (`ScriptList.tsx`).
- [ ] **P2.** Check whether 0.9.102 arm64 Linux has the dead-terminal bug (x86 `pty.node`); if so, say so in the 0.9.104 release notes.
- [ ] **P2.** Monthly dependency and security review, due **2026-11-02** (see Reminders).
- [ ] **P2.** Native-speaker review of translations, including the 22 welcome-tour strings.
- [ ] **P3.** Windows: the three unit tests that assume POSIX paths, and the installer that writes no `.exe` or `.dll` on the Windows 11 ARM64 VM (Windows has no known users; decide before promising support).
- [ ] **P3.** Linux arm64 AppImage: ship it again only with the `libz.so` runtime fix (patched runtime proven, needs a double build); `.deb` only for now.
- [ ] **P3.** Pick the headline feature (decisions item 5). Run the [release checklist](release-checklist.md), including `tools/vm-release-smoke.sh` on the draft files.

## Issues

| Issue | Priority | Status | Notes |
|---|---|---|---|
| npm 10.9.4 crashes on dependency re-resolve | P2 | worked around | Use `npx -y npm@11`; consider upgrading npm in CI and locally |
| `macos-latest` runner fails code signing | P2 | worked around | Pinned to `macos-15` |
| Old x86_64 `node-pty` `build/Release` leftover | P3 | todo | Harmless; clean up |
| E2E "a missed run is recorded..." fails about 1 run in 20 on a slow 2-CPU Linux VM at its last step (after "Open in Runs & Logs" the Runs list does not show the run; the snapshot shows the Dashboard instead of the Logs panel). Two real races already fixed (tab switch through the store; requested run kept until loaded); a rarer cause remains | P2 | worked around with one CI retry | Reproduce in the Parallels Ubuntu VM: loop `xvfb-run npx playwright test tests/e2e/attention-schedule.spec.mjs -g "missed run is recorded"`. May be a product bug: the jump can land on the Dashboard. |
| Windows CI job (`test (windows-latest)`) fails unit tests: `path-access`, `file-ipc` and `run-manager` tests assume POSIX paths | P2 | todo | First ever Windows run, found 2026-10-30. Test-side path assumptions, not seen as product bugs yet. Same 6 failures on the Windows 11 ARM64 VM (2026-10-30). There `npm ci` and packaging also stop at `node-pty` ("Could not find any Visual Studio installation"), so e2e and `package:win` never ran; needs VS Build Tools with the ARM64 C++ tools (several GB) if Windows ever matters. Job is non-blocking; fix tests, then drop `continue-on-error`. Windows e2e not reached |
| macOS CI e2e: `agent-attention`, `secret-masking` (and once the OSC 7501 test) failed on GitHub's runner; terminal showed only one `bash-3.2$` row | P2 | fixed in tests (PR 4) | Cause found 2026-10-30 from CI screenshots: the runner's virtual screen is ~1024x768, the window shrinks to it, and the terminal panel is left with a single row (editor prompt and review bar take the rest). Reproduced locally at 1024x677. The tests now use classic input mode (agent-attention) or a taller terminal panel (secret-masking); both pass with the window forced to 1024x677. |
| Linux arm64 AppImage fails to start on stock Ubuntu 26.04: its runtime is linked to `libz.so` (the dev link) | P2 | worked around: arm64 ships deb only (0.9.103) | Found 2026-10-30 by `tools/linux-package-smoke.sh`. Workaround: `apt install zlib1g-dev` or use the `.deb`. Check the x64 AppImage in CI; fix by a newer appimage runtime or dropping arm64 AppImage |
| `.deb` file modes follow the builder's umask (built under umask 007 they came out 770, unreadable for normal users) | P3 | worked around | Release builds run on GitHub with umask 022, so shipped files are fine; `tools/vm-test-inner.sh` sets `umask 022`. Could normalise modes in the builder config |
| Terminal panel is left with one visible row in a ~1024x677 window when the Editor Prompt is on | P2 | todo | UX finding from the macOS CI screenshots (2026-10-30), see the row above. Consider a minimum terminal height, or hide the review bar first on small windows |
| Linux arm64 package built on an x64 CI runner shipped an x86 `pty.node`, so no terminal could start on arm64 Linux | P1 | fixed (PR, 0.9.103 rebuild) | Found 2026-10-31 by Dan installing the draft release deb on the Ubuntu VM: "Failed to load native module: pty.node". node-pty has no Linux prebuilds, so it is compiled on the build machine. Release workflow now builds arm64 on `ubuntu-24.04-arm` and checks the module's architecture. 0.9.102 arm64 Linux likely had the same bug. Windows and macOS use node-pty prebuilds as fallback; macOS x64 and Windows arm64 builds not run-tested |
| Scripts without a project: Run Script does nothing visible when no terminal can open (no error shown) | P2 | todo | Seen on the same VM. A terminal-creation failure is swallowed by `executeScript` (a `void` promise in `ScriptList.tsx`), so the user sees nothing. Show an error toast; separately decide whether global scripts should run in the home directory (they do: cwd falls back to home) |
| Windows 11 ARM64 VM: silent install of `TerminallySKILL-Setup-0.9.103-arm64.exe` writes only 12 files (paks, locales, uninstaller) and no `.exe` or `.dll`; so no Windows release smoke test passes | P3 | open | Found 2026-10-31 with `tools/vm-release-smoke-windows.sh`. No Defender detections logged. Cause unknown (installer, Defender, or the VM). Windows has no known users; check before promising Windows support |
| Workflows hung on the first step when it ran `sudo` or `apt` (the typed-ahead step marker was discarded by the terminal input flush) | P1 | fixed (PR), 0.9.103 rebuild | Found 2026-10-31 by Dan on the Ubuntu VM (`sudo apt update` then `sudo apt upgrade`: step 1 stayed "running"). Reproduced with a pty script. Fix: if no marker arrives within 1 s of the step's prompt, use the prompt's exit code. E2E `workflow-input-flush.spec.mjs` fails without the fix |
