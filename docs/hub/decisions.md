---
title: Decisions
order: 2
summary: Open decisions with a recommendation, and the dated log of decisions made.
---
# Decisions

One page for every decision on the project. **Open decisions** come first, in priority order. Decided ones go in the collapsed log at the bottom with a date. When you decide, say so in chat and Claude moves the item down.

Priority: P1 blocks the next release; P2 is needed before the next milestone; P3 is later. A decision raised in chat is logged here the same turn, with a recommendation and a reason.

## Open decisions

### P1: decide soon

0. **Electron 45 inside 0.9.103 (Dan decided 2026-10-29, overrides the earlier "own release" recommendation).** Dan wants 0.9.103 to ship on Electron 45 plus one more headline feature. **Status (2026-10-29 night):** Electron 45.1.0 done and merged into `integ/0.9.103`; test:ci 271 unit tests, e2e 11 passed 2 skipped, agent ran the packaged mac arm64 smoke test green (to be re-run on the merged branch). Safe storage moved to the async API (separate commit, revertable); file dialogs remember last folder (Electron 43 change). **Open:** keep the async safeStorage move in 0.9.103 (recommended, Electron 46 forces it). **Risk to watch:** a Chromium/Node jump can break node-pty, so the packaged smoke test and the full suite gate the release; if they fail, say so and decide again. **Remote test:** no Docker or VM tool is installed, so a real OpenSSH server is started in user space on this Mac for the SSH end-to-end test (branch `test/local-ssh-e2e`). A true VM (Lima or Tart) would be a third-party install and needs Dan's OK.

1. **Ship 0.9.103 scope (updated 2026-10-29: Dan chose to add Electron 45, lazy-loaded locales and ONE more headline feature).** Old question, kept for context: ship now, or add more first? Contents today: dependency security update, attention alerts, scheduled workflows, Privacy tab (see [ideas](ideas.md)). **Explainer:** all three features are built and tested on a branch; nothing is merged or released yet. **Team recommendation:** hand-test the attention alerts and one scheduled run in the packaged app, then merge both branches into `staging` (dependencies first) and release as 0.9.103. **Why:** the three features are small, self-contained and visible; waiting adds risk without adding much.
2. **Merge order.** `chore/deps-and-hub-0.9.103` first, then `feat/0.9.103-attention-schedule-privacy` (it is built on top). **Team recommendation:** two PRs into `staging`, in that order. **Why:** keeps the dependency change reviewable on its own.

### P2: before the next milestone

3. **Native-speaker review of translations.** Machine-assisted today. **Team recommendation:** ask friendly speakers for German, French, Spanish and Japanese first. **Why:** these have the most likely users; flag Arabic as "needs right-to-left review" until checked.
4. **Lazy-load locale bundles: in progress for 0.9.103 (Dan asked 2026-10-29).** Branch `feat/lazy-locales`. Loads English plus the active language only.

8. **Opus review of translations (approved by Dan, done 2026-10-29, merged).** 77 strings fixed in 18 locales (plural-safe unit labels for ru/uk/pl, neutral "Interval:" labels where "Every" broke, meaning errors in tr/nl/ja/zh). Open: the settings card is titled "Notifications" in 17 locales but "Attention alerts" in English; recommend renaming English to "Notifications" for consistency. Native speakers still to confirm items listed in the review hand-back; Arabic needs a visual right-to-left check (letter-spacing on headings, `ml-2` in PrivacyTab). **Team recommendation:** yes, run one Opus pass over the 66 new 0.9.103 strings in the 18 locale files (not the whole app), then fix the Russian, Ukrainian and Polish plural forms. **Why:** Sonnet wrote them, so a stronger second model catches wrong terms and plural errors cheaply (small token cost). It does not replace native speakers, so keep item 3 open and keep the "machine-assisted" note in the release notes.


### P3: later


5. **Next headline feature for 0.9.104.** Options in [ideas](ideas.md): command blocks lite, multi-host SSH run. **Team recommendation:** command blocks lite first. **Why:** smaller, reuses Explain & fix, and the attention layer already knows when a command ends.
6. **"Private tab" (no-logs option).** Full analysis in [ideas](ideas.md#verdict-a-no-logs--incognito-option). **Team recommendation:** bank; do not build now. **Why:** a browser-style incognito mode does not fit a terminal (the shell, remote servers and AI providers keep their own records, and the app already has global and per-project log switches); a per-tab version helps little and risks false trust.
7. **Move shell-integration tests and type-check to cover test files.** About 13 fixture type errors are excluded today. **Team recommendation:** fix when touching those tests.

<details>
<summary>Decision log (made decisions, newest section last)</summary>

## 2026-10-30

- **Linux arm64 ships as `.deb` only (Dan decided):** electron-builder's arm64 AppImage runtime links `libz.so` and does not start on stock Ubuntu; a `patchelf` fix was proven but needs a double build, so it is banked. x64 keeps AppImage and `.deb`. Both architectures stay supported. PR `chore/linux-arm64-deb-only`.
- **Lightning on the website (Dan's LNbits was a paid instance, now decommissioned):** card stays removed. Self-hosting needs a Lightning node with channels and backups, more upkeep than a donation jar; revisit with a hosted Lightning address if wanted.
- **Branch protection on `staging` and `main` (Dan said yes):** applied with the GitHub API. Force-push and deletion blocked, a pull request required (0 approvals), CI check `test` required, admin bypass left on. The new macOS and Windows jobs are not required.
- **Lightning wallet removed from the website (Dan lost the wallet):** card with the LNURL QR code and the lnbits address deleted from `TerminallySKILLSite/index.html`, pushed to `main` (commit `05f49c9`). The other wallets (BTC, ETH, SOL, LTC, DOGE, ZEC) and PayPal remain. The old address stays in the site repo's git history, so treat it as dead; do not reuse.
- **Linux packages are tested (Dan asked):** `tools/linux-package-smoke.sh` checks the unpacked app, the AppImage and a real `dpkg -i` install of the deb. On Ubuntu arm64: unpacked and deb pass, AppImage fails without `libz.so` (see backlog, noted in release notes). Windows 11 ARM64 VM (`W11 Testing`, snapshot `pre-test-2026-10-30`) gets Node and MinGit in `C:\tools` and runs `tools/vm-test.sh --windows`.
- **Linux test VM automation (Dan asked):** `tools/vm-test.sh` runs the whole suite on the Ubuntu 26.04 ARM64 Parallels VM (`npm ci`, `test:ci`, `test:e2e`, local SSH, Docker SSH) and prints PASS/FAIL per step. Docker installed in that VM from Ubuntu's own `docker.io` package (snapshot `tools-ready-2026-10-30` taken first). **All five steps pass.** Finding: the Docker SSH test had never passed on Linux. Two fixes: the fixture account was locked (sshd refuses locked accounts even for key logins), and the spec overrode `HOME`, which OpenSSH ignores; it now uses the `ssh` wrapper like the local SSH spec. CI also gets macOS and Windows jobs (`cross-platform`; Windows is non-blocking until it has a clean run). App launched on the VM's real desktop and screenshotted: opens, shows v0.9.103.

## 2026-10-29, evening

- **CI on `staging`/`main` had been failing since before 0.9.103 (found 2026-10-30):** `command-detector.test.ts` assumed macOS shell flags but CI runs Linux. Fixed by stubbing the platform in the test. The new Linux VM also exposed a bash-vs-zsh prompt assumption in the SSH e2e (fixed) and a rare race when opening a run from schedule history (partly fixed, one CI retry added).
- **Ubuntu VM access (Dan):** Parallels Ubuntu 26.04 ARM64 is the general test VM. Snapshot taken first; tools installed inside (git, build tools, Xvfb, Electron libraries, openssh-server, Node 22). Windows VMs untouched.

- **Release PR opened (Dan said go):** version bumped to 0.9.103, notes in `docs/releases/v0.9.103.md`, PR cryptopoly/TerminallySKILL#2 into `staging`. Old agent worktrees and merged local branches deleted (Dan OK). Remote branches left in place.
- **VM test automation (Dan asked):** Parallels Desktop Pro is installed (licence valid to 2027-08-16, `prlctl` available) with VMs: Ubuntu 26.04 ARM64, W11, W11 CLEAN (snapshots), W11 Testing. UTM not installed. **Recommendation:** (1) add a GitHub Actions matrix (windows-latest, ubuntu-latest with xvfb) for unit + e2e, free and repeatable; (2) a `prlctl` script that reverts a VM snapshot, starts it, clones the branch, runs `npm ci`, `test:ci`, `test:e2e` and the packaged installer smoke test, collects results, shuts down. **Why:** CI covers x64 cheaply; the VMs cover Arm builds, a clean install and the update path. Needs Dan's OK before touching any VM (the Ubuntu VM is running; W11 is password protected; snapshots must be taken or reverted).

- **Extra features for 0.9.103 chosen by Dan:** ideas 6 (jump to next terminal that needs me), 7 (schedule run history and optional catch-up), 14 (agent-aware attention) and 15 (secret masking in logs and AI requests). Dan picked four, not one, so the release grows again. Agents run in separate worktrees from `origin/integ/0.9.103`: `feat/agent-attention` (6 and 14), `feat/schedule-history` (7), `feat/secret-masking` (15). **Claude note:** idea 14 depends on the OSC 7501 claim, which is unverified; the agent must verify it first and fall back to OSC 9/777.
- **Docker installed (Dan):** the CLI is there but the daemon is not running, so `npm run test:e2e:ssh-docker` skips. Start Docker Desktop (or OrbStack/Colima), then rerun. Known risk: that spec overrides `HOME`, which made Electron hang on quit in the local SSH test.
- **Keychain popup (Dan approved):** stale keychain search-list entries removed; unpackaged e2e launches use `--use-mock-keychain`.
- **Merge note:** agent worktrees can start from old commits; every agent now branches explicitly from `origin/integ/0.9.103`. The main folder was fast-forwarded to it (Dan's dev app was closed first).

- **Release scope changed (Dan):** 0.9.103 now = dependency update + attention alerts + scheduled workflows + Privacy tab + Electron 45 + lazy-loaded locales + one more headline feature (to be picked from the expanded ideas list). Reason: Dan was mocked for being on Electron 42 and wants the release to be current.
- **Agents started (separate worktrees):** Electron 45 upgrade (Opus), lazy-load locales (Sonnet), local OpenSSH remote-session e2e (Sonnet), competitor research and idea expansion (Opus).
- **Remote VM test:** nobody in this repo had one; Docker spec exists but Docker is not installed. We test a real OpenSSH server run in user space instead. Real VM stays optional.

## 2026-10-29

- **Decision 9 done (Dan approved):** the project picker's green terminal badge now also turns green while any terminal in that project is mid-command, not only for workflow runs. Busy state comes from shell integration.
- **Split view rule (Dan approved):** only the pane you are working in counts as watched, so a long command in the other pane still raises its dot.
- **Electron 42 is out of support (found 2026-10-29):** Electron supports the latest three majors; 45.0.0 shipped 2026-10-21, so 42 got its last patch (42.11.18) the same day. Upgrade planned after 0.9.103 (see below).

- **Bug fixed: ghost "running" runs.** Terminal ids restart at term-1 each launch, so a run left unfinished by an earlier launch (Dan's Build TSKILL from 2026-10-28) was never cleaned up while a new term-1 existed. Unfinished runs from before the current launch are now recovered at startup. Unit test added.
- **Not a bug:** a workflow run ends when its command ends. Run TSKILL ended (15m56s) when the dev server was stopped; the restart was typed by hand, so no new run exists. See item 9.

- **Four new Mid themes (Dan asked, Claude chose colours):** Slate (blue-gray + sky), Plum (mauve + orchid), Dove (soft gray-blue + cobalt), Clay (warm tan + emerald). 12 themes in total. Settings → Theme is now three columns (Dark, Mid, Light) and each card is a miniature of the app drawn in that theme's own colours. Other languages show English names for the new themes until translated.
- **Settings card renamed "Notifications" in English** to match the other 17 languages (Dan approved).
- **Dan on translations:** good enough for now; fix wording when a user reports it. No further review planned.
- **Dot not seen on a `sleep 40` in Dan's dev run:** could not reproduce in the built app or in `npm run dev` with fresh data (dot appears). Waiting for Dan's exact steps.

- **Bug found in hand-test and fixed:** the green/red tab dot never appeared for commands typed in the terminal (the command-start event was dropped while the shell was marked busy). Attention alerts now keep their own start marker; an end-to-end test covers it. Not a settings issue: the feature is on by default.
- **Selected weekday chips are now solid accent colour** (same style as the app's primary buttons), checked in all 8 themes.
- **Schedules need an open window** (answer to Dan): a run is skipped and marked skipped if no window is open. Background option banked in [backlog](backlog.md).
- **Privacy line for the release tweet:** "No telemetry. No analytics. No account." (backlog reminder added).

- **Schedule icon also in the Scripts list (Dan):** next to Play on each row, opens the same dialog. The small "scheduled" badge in the row's meta line was removed; the icon turns blue when a schedule exists. A UAT checklist for 0.9.103 was added to the hub.

- **Features for 0.9.103 chosen by Dan:** attention layer, scheduled workflows, privacy and network panel. (Replaces the open "flagship feature" decision.)
- **Attention defaults (Claude, low risk, Dan can change):** on by default; only commands running 15 s or longer; no alert while the user is looking at that terminal; desktop notification only when the window is not in front; workflow approvals, completions and failures always alert. Setting lives in Settings → General.
- **Scheduled workflows run only while the app is open and skip missed runs (Claude, low risk).** Honest and simple; a "catch up" option is banked. Runs open a background tab and never take focus. Required inputs must have defaults, otherwise the run is skipped and marked so.
- **Schedules are checked by the main process every 20 s and handed to the first open window.** Interval minimum 5 minutes.
- **Privacy panel keeps hosts only, in memory, cleared on quit (Claude).** No paths, headers or content; no disk copy.
- **UI rule for new features:** no new toolbar buttons. One icon in the workflow header, a dot on the existing tab, one settings tab, one settings card. Decided by Dan ("mind the UI").
- **"No-logs / incognito" idea reviewed and banked** (not built). See [ideas](ideas.md).

## 2026-10-28

- **Branch flow copies ChaosEngineAI:** `staging` is the default branch, feature PRs go into `staging`, `release/vX.Y.Z` into `staging`, tag on `staging`, `main` is promoted from `staging`. Decided by Dan.
- **Release builds use the GitHub Release workflow; macOS jobs pinned to `macos-15`.** The `macos-latest` image (macOS 26) failed code signing with "SecKeychainUnlock … passphrase … not correct". Revisit when the image is fixed.
- **Dependency security stays on the supported Electron 42 line.** Bump to the newest 42.x patch (42.11.18), not a new major. Overrides pin `js-yaml`, `tar` and `undici` where tools pull old copies.
- **Lockfile is resolved with `npx -y npm@11` until npm 10 is fixed.** npm 10.9.4 crashes on a fresh resolve; CI still installs with `npm ci` on Node 22. Decided by Claude, low risk, no global change.
- **Monthly dependency and security review is a standing task.** See the [backlog](backlog.md) reminders. Decided by Dan.
- **No telemetry, no accounts, no cloud agents** (from the competitor research: the loudest complaint against rivals). Kept as a product rule.

</details>
