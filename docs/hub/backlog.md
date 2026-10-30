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
- [x] **P1, done on branch.** Upgrade Electron 42 to 45 (42 is out of support since 2026-10-21): now part of 0.9.103 (branch `feat/electron-45`).
- [x] **P1, done on branch.** Four extra features for 0.9.103: agent-aware attention (14), jump-to-next-terminal (6), schedule history and catch-up (7), secret masking (15). See [ideas](ideas.md).
- [x] **P1, done on branch.** Local OpenSSH remote-session e2e (branch `test/local-ssh-e2e`).
- [ ] **P1, in progress.** Release 0.9.103: version bumped, notes written, PR #2 open into `staging`. Dan: hand-test UAT, merge, promote to `main`, run the Release workflow, tweet.
- [x] **P2, started.** Ubuntu 26.04 ARM64 VM is set up (snapshot `fresh-install-2026-10-30`, Node 22, Xvfb, repo clone in `~/tsk`); test:ci and e2e pass there. Still todo: `prlctl` script, GitHub Actions matrix, Windows VMs. Original item: GitHub Actions matrix plus a Parallels `prlctl` script (see [decisions](decisions.md)).
- [ ] **P2, todo.** Multi-host SSH run.
- [ ] **P2, todo.** Command blocks lite.
- [ ] **P3, banked.** Private tab ("don't record this tab"): see [ideas](ideas.md).
- [ ] **P3, banked.** Attention dots for other projects' tabs; "jump to next terminal that needs me" shortcut.
- [ ] **P3, banked.** Background schedules: today a schedule needs an open window (closing the last window on macOS skips runs). Options: keep a hidden window alive, launch at login, menu-bar item. Decide after real use.
- [ ] **P3, banked.** Schedule run history and an optional catch-up for missed runs.
- [ ] **P3, todo.** Fig-spec completions for the command builder (check licence first).
- [x] **P2, done on branch.** Lazy-load locale bundles (branch `feat/lazy-locales`, in 0.9.103).
- [ ] **P3, todo.** Fix 13 test-fixture type errors, then include test files in the type-check.

## Issues

| Issue | Priority | Status | Notes |
|---|---|---|---|
| npm 10.9.4 crashes on dependency re-resolve | P2 | worked around | Use `npx -y npm@11`; consider upgrading npm in CI and locally |
| `macos-latest` runner fails code signing | P2 | worked around | Pinned to `macos-15` |
| Old x86_64 `node-pty` `build/Release` leftover | P3 | todo | Harmless; clean up |
| E2E "a missed run is recorded..." fails about 1 run in 20 on a slow 2-CPU Linux VM at its last step (after "Open in Runs & Logs" the Runs list does not show the run; the snapshot shows the Dashboard instead of the Logs panel). Two real races already fixed (tab switch through the store; requested run kept until loaded); a rarer cause remains | P2 | worked around with one CI retry | Reproduce in the Parallels Ubuntu VM: loop `xvfb-run npx playwright test tests/e2e/attention-schedule.spec.mjs -g "missed run is recorded"`. May be a product bug: the jump can land on the Dashboard. |
| Windows CI job (`test (windows-latest)`) fails unit tests: `path-access`, `file-ipc` and `run-manager` tests assume POSIX paths | P2 | todo | First ever Windows run, found 2026-10-30. Test-side path assumptions, not seen as product bugs yet. Same 6 failures on the Windows 11 ARM64 VM (2026-10-30). There `npm ci` and packaging also stop at `node-pty` ("Could not find any Visual Studio installation"), so e2e and `package:win` never ran; needs VS Build Tools with the ARM64 C++ tools (several GB) if Windows ever matters. Job is non-blocking; fix tests, then drop `continue-on-error`. Windows e2e not reached |
| macOS CI job: e2e `agent-attention` ("agent escape sequences in background tabs...") fails on both tries on GitHub's macOS runner; terminal shows only `bash-3.2$ ` and never the `tab-one` marker. `secret-masking` e2e flaky there | P2 | todo | Runner login shell is bash 3.2, not zsh, and slower. Likely the test types before the shell is ready or relies on zsh. Passes on Dan's Mac and the Linux VM. Job is non-blocking |
| Linux arm64 AppImage fails to start on stock Ubuntu 26.04: its runtime is linked to `libz.so` (the dev link) | P2 | noted in release notes | Found 2026-10-30 by `tools/linux-package-smoke.sh`. Workaround: `apt install zlib1g-dev` or use the `.deb`. Check the x64 AppImage in CI; fix by a newer appimage runtime or dropping arm64 AppImage |
| `.deb` file modes follow the builder's umask (built under umask 007 they came out 770, unreadable for normal users) | P3 | worked around | Release builds run on GitHub with umask 022, so shipped files are fine; `tools/vm-test-inner.sh` sets `umask 022`. Could normalise modes in the builder config |
