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

1. **Ship 0.9.103 now, or add more first?** Contents today: dependency security update, attention alerts, scheduled workflows, Privacy tab (see [ideas](ideas.md)). **Explainer:** all three features are built and tested on a branch; nothing is merged or released yet. **Team recommendation:** hand-test the attention alerts and one scheduled run in the packaged app, then merge both branches into `staging` (dependencies first) and release as 0.9.103. **Why:** the three features are small, self-contained and visible; waiting adds risk without adding much.
2. **Merge order.** `chore/deps-and-hub-0.9.103` first, then `feat/0.9.103-attention-schedule-privacy` (it is built on top). **Team recommendation:** two PRs into `staging`, in that order. **Why:** keeps the dependency change reviewable on its own.

### P2: before the next milestone

3. **Native-speaker review of translations.** Machine-assisted today. **Team recommendation:** ask friendly speakers for German, French, Spanish and Japanese first. **Why:** these have the most likely users; flag Arabic as "needs right-to-left review" until checked.
4. **Lazy-load locale bundles.** All 19 languages load at startup (renderer about 4.9 MB). **Team recommendation:** load only the active language. **Why:** faster start, smaller memory; not urgent.

8. **Opus review of translations (approved by Dan, done 2026-10-29, merged).** 77 strings fixed in 18 locales (plural-safe unit labels for ru/uk/pl, neutral "Interval:" labels where "Every" broke, meaning errors in tr/nl/ja/zh). Open: the settings card is titled "Notifications" in 17 locales but "Attention alerts" in English; recommend renaming English to "Notifications" for consistency. Native speakers still to confirm items listed in the review hand-back; Arabic needs a visual right-to-left check (letter-spacing on headings, `ml-2` in PrivacyTab). **Team recommendation:** yes, run one Opus pass over the 66 new 0.9.103 strings in the 18 locale files (not the whole app), then fix the Russian, Ukrainian and Polish plural forms. **Why:** Sonnet wrote them, so a stronger second model catches wrong terms and plural errors cheaply (small token cost). It does not replace native speakers, so keep item 3 open and keep the "machine-assisted" note in the release notes.

### P3: later

5. **Next headline feature for 0.9.104.** Options in [ideas](ideas.md): command blocks lite, multi-host SSH run. **Team recommendation:** command blocks lite first. **Why:** smaller, reuses Explain & fix, and the attention layer already knows when a command ends.
6. **"Private tab" (no-logs option).** Full analysis in [ideas](ideas.md#verdict-a-no-logs--incognito-option). **Team recommendation:** bank; do not build now. **Why:** a browser-style incognito mode does not fit a terminal (the shell, remote servers and AI providers keep their own records, and the app already has global and per-project log switches); a per-tab version helps little and risks false trust.
7. **Move shell-integration tests and type-check to cover test files.** About 13 fixture type errors are excluded today. **Team recommendation:** fix when touching those tests.

<details>
<summary>Decision log (made decisions, newest section last)</summary>

## 2026-10-29

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
