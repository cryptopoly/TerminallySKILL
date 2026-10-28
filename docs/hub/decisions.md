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

1. **Flagship feature for 0.9.103.** Options from [research](research-competitors.md): (a) attention layer: tab badge and OS notification when a long command finishes or fails, or a workflow step waits for approval; (b) multi-host SSH run; (c) command blocks lite (copy output, rerun, Explain & fix per command); (d) scheduled workflows; (e) privacy and network panel; (f) Fig-spec completions for the command builder. **Explainer:** people now run several AI agents and builds at once and lose track of which needs them; competitors (cmux, Warp) sell this. **Team recommendation:** (a) the attention layer, smallest version first. **Why:** smallest effort, no new data model, reuses the command queue, approvals and Explain & fix, and is visible in a tweet. A cheap add-on is (e), a static privacy statement, because trust is the loudest complaint about rivals.

### P2: before the next milestone

2. **Native-speaker review of translations.** Machine-assisted today. **Team recommendation:** ask friendly speakers for German, French, Spanish and Japanese first. **Why:** these have the most likely users; flag Arabic as "needs right-to-left review" until checked.
3. **Lazy-load locale bundles.** All 19 languages load at startup (renderer about 4.9 MB). **Team recommendation:** load only the active language. **Why:** faster start, smaller memory; not urgent.

### P3: later

4. **Move shell-integration tests and type-check to cover test files.** About 13 fixture type errors are excluded today. **Team recommendation:** fix when touching those tests.

<details>
<summary>Decision log (made decisions, newest section last)</summary>

## 2026-10-28

- **Branch flow copies ChaosEngineAI:** `staging` is the default branch, feature PRs go into `staging`, `release/vX.Y.Z` into `staging`, tag on `staging`, `main` is promoted from `staging`. Decided by Dan.
- **Release builds use the GitHub Release workflow; macOS jobs pinned to `macos-15`.** The `macos-latest` image (macOS 26) failed code signing with "SecKeychainUnlock … passphrase … not correct". Revisit when the image is fixed.
- **Dependency security stays on the supported Electron 42 line.** Bump to the newest 42.x patch (42.11.18), not a new major. Overrides pin `js-yaml`, `tar` and `undici` where tools pull old copies.
- **Lockfile is resolved with `npx -y npm@11` until npm 10 is fixed.** npm 10.9.4 crashes on a fresh resolve; CI still installs with `npm ci` on Node 22. Decided by Claude, low risk, no global change.
- **Monthly dependency and security review is a standing task.** See the [backlog](backlog.md) reminders. Decided by Dan.
- **No telemetry, no accounts, no cloud agents** (from the competitor research: the loudest complaint against rivals). Kept as a product rule.

</details>
