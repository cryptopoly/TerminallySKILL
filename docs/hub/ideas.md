---
title: Ideas bank
order: 3
summary: Every feature idea we have had, with status and a team recommendation. Nothing gets lost here.
---
# Ideas bank

Every idea goes here the day it comes up, built or not. **Status:** shipped (on a branch or released), banked (good, not scheduled), rejected (with the reason, so we do not re-argue it). **Team recommendation** is Claude's view; Dan decides, and the decision moves to the [decisions](decisions.md) log.

## Built for 0.9.103 (branch `feat/0.9.103-attention-schedule-privacy`)

| Idea | Status | Notes |
|---|---|---|
| **Attention layer**: tab dot, dock badge and desktop notification when a long command finishes or fails, or a workflow waits for approval | shipped on branch | Settings → General: one switch and a "longer than" threshold (default 15 s). No alert while you are looking at that terminal. |
| **Scheduled workflows**: run a workflow every N minutes, or daily at a time on chosen weekdays | shipped on branch | Runs only while the app is open; missed runs are skipped, not replayed. Runs in a background tab so it never steals focus. Needs defaults for required inputs. One clock icon in the workflow header. |
| **Privacy and network panel**: plain statement plus a host-only list of outbound requests | shipped on branch | Settings → Privacy. Memory only, cleared on quit. Paths, headers and content are never recorded. |

## Banked

| Idea | Priority | Effort | Team recommendation |
|---|---|---|---|
| **Private tab ("don't record this tab")**: see the analysis below | P3 | S–M | Bank. Build only if you still want it after reading the verdict; smallest version below. |
| **Multi-host SSH run**: run a workflow or snippet over several SSH projects, per-host pass/fail | P2 | M | Next headline feature after command blocks. Natural pair with scheduled workflows. |
| **Command blocks lite**: copy output, rerun, Explain & fix per command | P2 | M | Build next (0.9.104). Smallest, reuses Explain & fix. |
| **Fig-spec completions** for the command builder | P3 | M | Check the licence before any work. |
| **Attention dots for other projects' tabs** (today a dot shows only for terminals in the project you are viewing; the desktop notification and dock badge cover the rest) | P3 | S | Do if people report missed alerts. A dot on the project selector is enough. |
| **"Jump to next terminal that needs me"** shortcut | P3 | S | Cheap add-on to the attention layer. |
| **Schedule run history** in Runs & Logs, and a "run missed schedule on launch" option | P3 | S | Do together. Keep the default as skip. |
| **Lazy-load locale bundles** | P3 | S | Do when startup time bothers someone. |
| **Team-shared workflows through git** (a folder of `.tvflow` files in the repo) | P3 | S | Good, no cloud needed. Wait for a request. |
| **Searchable shell history across sessions** (Atuin-style, local only) | P3 | M | Bank; large surface. |
| **SFTP pane, port-forward UI** | P3 | L | Bank; only if SSH users ask. |
| **Built-in session restore** | P3 | M | Bank. |

## Rejected

| Idea | Why |
|---|---|
| Mandatory accounts, cloud sync, default telemetry | The trust complaint against rivals; our main selling point is the opposite. |
| Cloud agents (Warp "Oz" style) | Needs servers; contradicts local-first. |
| Webhook-triggered workflows | Needs a listening port or a relay service; security cost is high for a desktop app. Revisit only with a local-only trigger design. |
| Saving the network log to disk | Would create exactly the kind of record the Privacy tab promises we do not keep. |
| Whole-app "incognito mode" | See the verdict below. |

## Verdict: a "no-logs" / incognito option

**Short answer: the browser idea does not transfer; a small per-tab version is defensible but low value. Banked, not recommended for now.**

What already exists. Settings → Logs has a global "Save terminal logs" switch, and each project can override it (inherit / always / never). So "don't keep logs" is already a setting.

Why a browser-style incognito mode does not fit.
- A browser's private window isolates an identity: cookies, history, cache, logins. The app has no such identity layer. Its stored data is mostly things you wrote on purpose (projects, scripts, snippets) and want kept.
- The trail that matters in a terminal is mostly **not ours**: the shell's own history file (`~/.zsh_history`), the remote server's logs over SSH, the AI provider's logs when you use an AI feature, and your clipboard. The app cannot erase or hide those. A mode named "incognito" would suggest it can, which is a false promise.
- Terminal scrollback stays in memory while the tab is open.

What would be real. A per-tab **"Don't record this tab"** switch in the tab's right-click menu (no new toolbar button) that: skips the log for that tab; skips run history for it; starts local shells with history off (`HISTFILE` unset); marks the tab with a small label; and blocks or warns before AI features send its output. Honest wording: "This tab is not saved by TerminallySKILL. Your shell, remote servers and AI providers may still keep records."

Cost and risk. Shell-by-shell handling (zsh, bash, fish), nothing reliable for remote shells, one more state to test, and a feature people may over-trust. The same need (typing a secret without it reaching a log) is already met by setting a project's logs to "never".

**Recommendation:** bank as P3. Do not build now. If you want something cheap that helps, add a pointer from the Privacy tab to the existing per-project log setting (the tab already shows whether logs are on).
