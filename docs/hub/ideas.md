---
title: Ideas bank
order: 3
summary: Every feature idea we have had, numbered, with size, risk and a team recommendation. Nothing gets lost here.
---
# Ideas bank

Every idea goes here the day it comes up, built or not. **Status:** shipped (on a branch or released), banked (good, not scheduled), in progress, rejected (with the reason, so we do not re-argue it). **Team recommendation** is Claude's view; Dan decides, and the decision moves to the [decisions](decisions.md) log.

**Numbering is stable.** Refer to "idea 7". New ideas get the next free number; a dropped idea keeps its number and moves to Rejected. Sizes: **S** up to 3 days, **M** about a week, **L** two weeks or more (one developer). File paths are under `src/` and were read on 2026-10-29. Competitor sources are in [research](research-competitors.md).

Jump to: [shortlist for 0.9.103](#shortlist-a-feature-for-09103-about-a-week) · [new ideas 14 to 18](#new-ideas-2026-10-29) · [rejected](#rejected)

## Built for 0.9.103 (branch `feat/0.9.103-attention-schedule-privacy`)

| Idea | Status | Notes |
|---|---|---|
| **Attention layer**: tab dot, dock badge and desktop notification when a long command finishes or fails, or a workflow waits for approval | shipped on branch | Settings → General: one switch and a "longer than" threshold (default 15 s). No alert while you are looking at that terminal. |
| **Scheduled workflows**: run a workflow every N minutes, or daily at a time on chosen weekdays | shipped on branch | Runs only while the app is open; missed runs are skipped, not replayed. Runs in a background tab so it never steals focus. Needs defaults for required inputs. One clock icon in the workflow header. |
| **Privacy and network panel**: plain statement plus a host-only list of outbound requests | shipped on branch | Settings → Privacy. Memory only, cleared on quit. Paths, headers and content are never recorded. |

## Overview of numbered ideas

| # | Idea | Size | Priority | Status |
|---|---|---|---|---|
| 1 | Command blocks lite | M | P2 | banked, planned 0.9.104+ |
| 2 | Multi-host SSH run | M | P2 | banked |
| 3 | Private tab ("don't record this tab") | S–M | P3 | banked, not recommended now |
| 4 | Fig-spec completions for the command builder | M | P3 | banked |
| 5 | Attention dots for other projects | S | P3 | banked |
| 6 | Jump to next terminal that needs me | S | P3 | banked, **part of shortlist pick** |
| 7 | Schedule run history and missed-run catch-up | S | P3 | banked, shortlist #3 |
| 8 | Background schedules (no open window needed) | M | P3 | banked |
| 9 | Team-shared workflows through git | S–M | P3 | banked |
| 10 | Searchable shell history (local, Atuin-style) | M | P3 | banked |
| 11 | Port-forward UI; SFTP pane | S–M / L | P3 | banked |
| 12 | Lazy-load locale bundles | S | P3 | **in progress** (other stream) |
| 13 | Built-in session restore | M | P3 | banked |
| 14 | **New:** Agent-aware attention (OSC 7501 status, OSC 9/777 notifications) | S | P2 | proposed, **shortlist #1** |
| 15 | **New:** Secret masking in logs and AI requests | S–M | P2 | proposed, shortlist #2 |
| 16 | **New:** Save recent commands as a workflow | S–M | P2 | proposed |
| 17 | **New:** Paste a command, get the visual builder | M | P3 | proposed |
| 18 | **New:** Markdown runbooks (run code blocks in a README) | S–M | P3 | proposed |

## Banked ideas (1 to 13)

### 1. Command blocks lite (M)
- **What:** each finished command in a terminal gets a small gutter mark with actions: copy output, copy command, rerun, Explain & fix.
- **User value:** no more scroll-and-drag to copy one command's output; failures are one click from an explanation.
- **How here:** `components/terminal/TerminalPanel.tsx` already builds a `TerminalCommandBlock` (start line, end line, command, exit code) from the shell-integration events (OSC 7337 `prompt-ready` / `command-start`, emitted by `main/shell-integration-init.ts`, parsed in `main/pty-output.ts`). Today only `lastCompletedCommandBlock` is kept, and `lib/terminal-transcript.ts` extracts its text. Keep a capped list of blocks anchored with xterm markers (so trimmed scrollback does not shift lines), draw a green/red decoration per block, and reuse the Explain & fix path (`lib/command-ai-explain.ts`, `lib/exit-diagnostics.ts`) and `PromoteCommandDialog.tsx` ("save as snippet").
- **Risk:** low-medium. Only works where shell integration runs (local zsh and bash); remote SSH shells get no blocks (unverified whether integration is injected remotely). Full-screen apps (vim, less) must not get marks.
- **Dependencies:** none. Pairs with 16 (save blocks as a workflow).
- **Recommendation:** build in 0.9.104 or 0.9.105 as planned. First version: gutter dot plus a right-click menu; no block selection or folding.

### 2. Multi-host SSH run (M)
- **What:** run one workflow or snippet across several SSH projects and see a pass/fail row per host.
- **User value:** "update and restart on all five servers" becomes one action with a clear result table, without a paid SSH client.
- **How here:** SSH projects already carry host, user, port, key (`shared/project-schema.ts`, `SSHProjectWorkspaceTarget`), and `shared/workspace-target.ts` builds the launch plan. The workflow runner (`store/workflow-runner-store.ts`, `components/scripts/WorkflowRunnerHost.tsx`) runs in one tab; run it once per selected project in background tabs (as schedules already do) and group the `RunRecord`s (`main/run-manager.ts`) under one batch id. Host picker goes in `WorkflowRunDialog.tsx`.
- **Risk:** medium. A bad command now hits many machines: default to sequential with "stop on first failure", and offer "run on one host first, then ask" using the existing approval step.
- **Dependencies:** 7 (run history grouping) helps; none required.
- **Recommendation:** next big SSH feature after 1. First version: sequential only, no parallel mode, summary table in Runs & Logs.

### 3. Private tab: "don't record this tab" (S–M)
- **What:** a per-tab switch that skips logs and run history, starts the local shell without a history file, and labels the tab.
- **User value:** type a secret or demo something without it landing in a saved log.
- **How here:** `main/log-manager.ts` (`shouldSaveSessionLog`) and `main/run-manager.ts` would check a per-session flag; `main/shell-integration-init.ts` would unset `HISTFILE` for zsh and bash; AI features would warn before sending that tab's output.
- **Risk:** false trust (shell, servers and AI providers keep their own records); one more state to test.
- **Dependencies:** none. Idea 15 covers most of the real need with less risk.
- **Recommendation:** bank (see the verdict at the bottom of this page). Prefer 15 first.

### 4. Fig-spec completions for the command builder (M)
- **What:** import the open Fig completion specs so the builder knows the subcommands and flags of hundreds of CLIs without parsing `--help`.
- **User value:** better builders for tools whose help text parses badly (git, docker, kubectl subcommands).
- **How here:** the builder loads JSON definitions from `commands/` via `main/command-loader.ts` and falls back to `main/help-parser.ts`. A build-time script would convert a curated set of `withfig/autocomplete` specs (TypeScript) into our `shared/command-schema.ts` format, keeping subcommands, options and args and dropping "generators" (functions that run shell commands).
- **Licence:** `withfig/autocomplete` is MIT (checked on GitHub, 2026-10-29), so bundling with attribution is allowed.
- **Risk:** medium. Specs drift, bundle size grows, the spec format is TypeScript, and the upstream is now maintained around Kiro CLI.
- **Dependencies:** none.
- **Recommendation:** pilot 10 tools where `help-parser.ts` does worst; decide after.

### 5. Attention dots for other projects (S)
- **What:** a dot on the project selector when a terminal in another project needs you.
- **User value:** you see that a background project failed without a desktop notification.
- **How here:** `store/attention-store.ts` holds attention per session; `components/projects/ProjectSelector.tsx` already shows a busy badge (decision 9). Roll up the highest-priority attention per project and reuse `components/terminal/AttentionDot.tsx`.
- **Risk:** low.
- **Dependencies:** none.
- **Recommendation:** do it together with 6 when someone reports a missed alert, or as part of the shortlist pick.

### 6. Jump to next terminal that needs me (S)
- **What:** one shortcut (suggest Cmd/Ctrl+Shift+U, the same as cmux) and a palette entry that focus the oldest unseen alert, switching project if needed.
- **User value:** with several agents and builds running, you go straight to the one waiting.
- **How here:** add the key to the handler in `components/layout/AppShell.tsx` (next to Cmd+K and Ctrl+Tab), read `store/attention-store.ts`, and add a `components/palette/CommandPalette.tsx` entry.
- **Risk:** low (check the key does not clash in 19 keyboard layouts).
- **Dependencies:** best with 14.
- **Recommendation:** ship with 14.

### 7. Schedule run history and missed-run catch-up (S)
- **What:** show each scheduled run in Runs & Logs with a "scheduled" label, and an option per schedule to run once on launch if a run was missed.
- **User value:** you can see whether last night's backup ran, and a laptop that was asleep still gets its daily run.
- **How here:** `shared/schedule-schema.ts` stores only `lastRunAt` and `lastStatus`; `shared/run-schema.ts` has `RunSource = 'workflow'` only. Add a trigger field (manual or schedule) to the run record and a filter in `components/logs/LogBrowser.tsx`. Catch-up: `main/schedule-manager.ts` `load()` currently moves overdue schedules forward with `resolveNextRunAt`; an opt-in flag would fire one run instead.
- **Risk:** low. Catch-up must fire once, not once per missed slot.
- **Dependencies:** none.
- **Recommendation:** do it; history first, catch-up second. Keep the default as skip.

### 8. Background schedules (M)
- **What:** schedules keep running when the last window is closed (menu-bar item), with an optional launch at login.
- **User value:** schedules become dependable for real chores.
- **How here:** `main/schedule-manager.ts` ticks in the main process every 20 s but hands the run to the first open window, because the runner lives in the renderer (`hooks/useScheduledRuns.ts`, `WorkflowRunnerHost.tsx`). Options: keep a hidden window alive while schedules exist (smallest), plus an Electron `Tray` item and `app.setLoginItemSettings`.
- **Risk:** medium. Users dislike apps that do not quit; battery; Windows and Linux tray differences.
- **Dependencies:** 7 (you need history to trust background runs).
- **Recommendation:** after real use. First version: a setting, off by default, "Keep running in the menu bar while schedules are on".

### 9. Team-shared workflows through git (S–M)
- **What:** workflows saved as `.tvflow` files in a folder inside the repo (for example `.terminallyskill/workflows/`) show up for everyone who opens that project.
- **User value:** team runbooks travel with the code, with no cloud and no account.
- **How here:** `shared/tvflow-schema.ts` already defines the v2 file; import and export exist in `main/script-manager.ts`, which stores everything in one `scripts.json` in the data folder. Scan the project's working directory for the folder, list those workflows as a read-only "From repo" group in `components/scripts/ScriptList.tsx`, and add "Save to repo". Our input placeholders are `{{name}}` (`shared/workflow-execution.ts`), the same style as Warp's `.warp/workflows`, so an importer for Warp YAML is cheap later.
- **Risk:** medium: running commands someone else committed. Show the steps before the first run of a changed file, and never allow a repo workflow to be scheduled without a local copy.
- **Dependencies:** none.
- **Recommendation:** good no-cloud answer to Warp Drive; build when a team user asks.

### 10. Searchable shell history across sessions (M)
- **What:** a local, searchable history of every command typed in the app, with folder, project, exit code and duration.
- **User value:** "what was that docker command I ran in March in this project" without Atuin.
- **How here:** every command already arrives as a `command-start` event with the later `prompt-ready` exit code and folder (`shared/shell-integration.ts`). Append to a JSON-lines file per project in the data folder; search from `CommandPalette.tsx`.
- **Risk:** medium-high for privacy: inline secrets (`export TOKEN=...`) would be stored. Needs 15 first, must respect the log switches and 3.
- **Dependencies:** 15.
- **Recommendation:** bank. Users who care often already run Atuin.

### 11. Port-forward UI (S–M); SFTP pane (L)
- **What:** a per-SSH-project list of saved tunnels ("forward remote 5432 to local 5432") with on/off switches; separately, a remote file pane.
- **User value:** reach a remote database or web UI without remembering `ssh -L` flags.
- **How here:** `main/vnc-manager.ts` already finds a free local port and spawns `ssh -L 127.0.0.1:<port>:localhost:<vncPort>`; generalise that into a tunnel manager and show tunnels in `ProjectDialog.tsx`. SFTP is a different size: `components/projects/FileBrowser.tsx` and `main/ipc/file-ipc.ts` are local only, so it needs the `ssh2` package or `sftp` batch mode, plus upload and permission handling.
- **Risk:** port-forward low; SFTP high (competitors' SFTP gets the most bug reports).
- **Dependencies:** none.
- **Recommendation:** split the idea. Port-forward is a good small SSH feature; keep SFTP banked until SSH users ask.

### 12. Lazy-load locale bundles (S) — in progress
- **What:** load only the active language instead of all 19 at start.
- **User value:** faster start and less memory (renderer about 4.9 MB today).
- **How here:** `i18n/resources.ts` statically imports all 18 `locales/*.json`; switch to a dynamic `import()` per language with English bundled.
- **Risk:** low; language switch must wait for the bundle to load.
- **Recommendation:** being done by another stream now; no action here.

### 13. Built-in session restore (M)
- **What:** reopen each project's tabs, splits and folders after a restart, optionally with the old scrollback shown as read-only text.
- **User value:** a restart or update no longer costs your layout.
- **How here:** `TerminalPanel.tsx` already loads `SerializeAddon` (used for snapshots and logs); `lib/workspace-session.ts` (`createProjectTerminalSession`) rebuilds a project shell. Save the layout on quit, recreate tabs on launch, print saved scrollback dimmed. Running processes are not restored.
- **Risk:** medium: stale scrollback may contain secrets (needs 15), and restored SSH tabs reconnect unprompted.
- **Dependencies:** 15 for scrollback.
- **Recommendation:** bank; do layout-only first if asked.

## New ideas (2026-10-29)

Picked to play to the app's strengths: workflows, the command builder, no account, SSH projects, the attention layer and schedules. Evidence links are in [research](research-competitors.md#update-2026-10-29-second-pass).

### 14. Agent-aware attention (S)
- **What:** let programs that run inside a tab, especially Claude Code and Codex, raise the tab dot and notification themselves, with their own message ("Claude needs permission to run npm test").
- **User value:** people run several coding agents in tabs; today our dot only knows about long commands and workflow approvals, not "the agent is waiting for you".
- **How here:** `main/pty-output.ts` already pulls our own OSC 7337 markers out of the output stream with regexes and buffers split chunks. Add parsers for three standard sequences: OSC 9 (`ESC ] 9 ; message`) and OSC 777 (`ESC ] 777 ; notify ; title ; body`) desktop notifications, and the new OSC 7501 Program Status Protocol (states idle, working, blocked, done, error; message base64). Forward them as attention events to `lib/attention.ts` (`raiseAttention`), which already handles tab dot, dock badge and notification. Show "blocked" as the amber approval dot and "working" as the busy badge.
- **Why it is impressive in a demo:** four Claude Code tabs, you switch to email, one tab turns amber with the agent's own words, the notification click lands on that tab. Plus "it just works, nothing to configure" for Claude Code's new status protocol.
- **Competitor evidence:** cmux rings panes on OSC 9/99/777 and jumps to unread with Cmd+Shift+U; iTerm2 3.7 (2026-09) added Claude Code session status dots; Zed terminal threads (2026-05) notify when a process needs attention; Claude Code sends desktop notifications by default only in Ghostty, Kitty and iTerm2, and supports OSC 7501 status (v2.1.295+); OSC 7501 was proposed by Mitchell Hashimoto on 2026-10-06.
- **Risk:** low-medium. Any program (or a remote server) can print these sequences, so cap message length, strip control characters, never open URLs from them, and honour the existing switch. How a terminal advertises OSC 7501 support is not yet verified; read the spec before building. Bell-only programs are noisy, so treat a bare bell as a dot only, never a notification.
- **Dependencies:** none; pairs with 6.
- **Recommendation:** **top pick for 0.9.103** (see the shortlist).

### 15. Secret masking in logs and AI requests (S–M)
- **What:** detect common secrets (cloud keys, GitHub and Stripe tokens, AI provider keys, JWTs, private-key blocks) and replace them with `[redacted: GitHub token]` before anything is written to a saved log or sent to an AI provider.
- **User value:** `cat .env` followed by Explain & fix no longer ships your keys to a model or into a log file.
- **How here:** one shared pattern list (new `shared/secret-patterns.ts`), applied in `main/log-manager.ts` (`saveSessionLog`), in the prompt builders of `main/ai-manager.ts` (`buildOutputReviewPrompt`, `buildCommandExplainPrompt`), and when promoting output to snapshots or snippets. `lib/terminal-safety.ts` already classifies password and token prompts and can share wording. The Privacy tab shows a session-only count ("4 secrets kept out of AI requests"), never the values.
- **Why it is impressive in a demo:** print a fake AWS key, press Explain & fix, open the request preview: the key is a grey `[redacted]` chip. Fits "No telemetry. No analytics. No account."
- **Competitor evidence:** Warp has Secret Redaction (regex-based, off by default, redacts before sending to LLMs); iTerm2 3.7 added redaction to its screenshot tool.
- **Risk:** low-medium. False positives can mangle logs (keep a switch); false negatives mean the wording must say "pattern-based, not a guarantee".
- **Dependencies:** none; unblocks 10 and 13.
- **Recommendation:** strong second; small first version is logs plus AI only, no on-screen masking.

### 16. Save recent commands as a workflow (S–M)
- **What:** pick the last commands you typed in a tab and turn them into a workflow, with selected text turned into inputs.
- **User value:** the fastest way to create workflows: do the task once by hand, then save it.
- **How here:** commands and exit codes already arrive through shell integration (see idea 1). Extend `components/terminal/PromoteCommandDialog.tsx`, which today promotes one command to a script or snippet, into a checklist of the tab's last 20 commands (successful ones ticked). Each becomes a command step; selecting text in a step creates an input via `components/scripts/WorkflowInputEditor.tsx` and inserts `{{name}}` (syntax from `shared/workflow-execution.ts`).
- **Why it is impressive in a demo:** set up a project in five typed commands, click "Save as workflow", turn the folder name into an input, run it on a second project.
- **Competitor evidence:** Warp creates workflows from a block's actions with `{{argument}}` parameters; Atuin Desktop sells runbooks built from shell history.
- **Risk:** low. Needs a session-level command list (shared with 1). Commands typed inside SSH sessions may not be captured.
- **Dependencies:** shares plumbing with 1.
- **Recommendation:** good 0.9.104 companion to 1. First version: no automatic input detection.

### 17. Paste a command, get the visual builder (M)
- **What:** paste any command line (`rsync -avz --delete -e "ssh -p 2222" src/ host:dst/`) and the builder opens with every flag ticked and explained; unknown parts are marked.
- **User value:** understand and safely edit commands copied from the web or from a colleague, offline, without AI.
- **How here:** the inverse of `lib/command-serializer.ts` (`serializeCommand`). Split the line into words (a small tokenizer; no shell-parsing package today), match the program to a `CommandDefinition` from `store/command-store.ts`, map long, short, grouped (`-avz`) and `--opt=value` flags to options, the rest to positional args, and handle subcommands through `lib/reference-help-command-tree.ts`. Open `CommandBuilder.tsx` with those values.
- **Why it is impressive in a demo:** paste a scary `find ... -exec rm {} \;` from a forum and watch the builder light up with plain-language explanations; switch to `-print` to dry-run.
- **Competitor evidence:** explainshell does static explanations (2026 status unverified); Warp and iTerm2 explain commands with cloud AI. No rival found that turns a pasted command back into an editable form.
- **Risk:** medium: quoting, pipes and `&&` chains. First version handles one simple command and says so for pipes.
- **Dependencies:** none; better with 4.
- **Recommendation:** the most "only here" idea; schedule for a later release.

### 18. Markdown runbooks: run code blocks in a README (S–M)
- **What:** when a Markdown file is open, each shell code block gets "Run in terminal" and the file gets "Import as workflow" (headings become notes, code blocks become steps).
- **User value:** every repo's README and RUNBOOK becomes runnable and saveable in one click.
- **How here:** `components/files/FileViewer.tsx` already highlights Markdown; find fenced blocks tagged `sh`, `bash`, `zsh`, `shell` or `console`. "Run" sends the text through the existing paste checks in `lib/terminal-safety.ts` (multi-line and dangerous-command confirmation). Import builds note and command steps. `main/starter-pack-detector.ts` could offer it when a new project has a README with runnable blocks.
- **Why it is impressive in a demo:** clone a repo, open its README, click Run on the install block, then "Import as workflow" and schedule it.
- **Competitor evidence:** Runme turns Markdown into runnable runbooks; Atuin Desktop builds runbooks from shell blocks; Warp has notebooks.
- **Risk:** low-medium: never auto-run; `console` blocks with `$ ` prompts need the prompt stripped.
- **Dependencies:** none.
- **Recommendation:** cheap and visible; the run buttons alone are S.

## Shortlist: a feature for 0.9.103 (about a week)

**Costly to add now:** 0.9.103 is built, tested and waiting for UAT. Any new feature delays the release and the Electron 45 upgrade that follows it. **Alternative:** ship 0.9.103 as it is and put the pick below in the next feature release. If Dan still wants one more feature in 0.9.103, take #1.

| Rank | Candidate | Work | Why |
|---|---|---|---|
| **1** | **Idea 14, agent-aware attention, plus idea 6, jump shortcut** | 3–4 days | Finishes the 0.9.103 story (attention), rides on code written and tested this week, very timely (OSC 7501 is three weeks old and Claude Code already speaks it), strongest demo GIF, no privacy cost. |
| 2 | Idea 15, secret masking (logs and AI only) | 4–5 days | Strong privacy message for the "No telemetry" release, but touches logging and every AI prompt, so more testing. |
| 3 | Idea 7, schedule run history | 2 days | Makes the new schedules trustworthy; small, low risk, but not exciting in a tweet. |

**Recommendation:** idea 14 with idea 6. Small first version:
- Keep: OSC 9 and OSC 777 notifications, OSC 7501 `blocked`, `done` and `error` mapped to the existing amber, green and red dots, message text in the notification, Cmd/Ctrl+Shift+U to jump, one unit test per sequence and one E2E test.
- Cut: OSC 99 (Kitty's richer protocol), `working` progress bars, nested OSC 7501 task ids, attention dots for other projects (idea 5), bell handling, any Claude Code hook installer.

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

**Recommendation:** bank as P3. Do not build now. If you want something cheap that helps, add a pointer from the Privacy tab to the existing per-project log setting (the tab already shows whether logs are on). Idea 15 (secret masking) covers more of the real need.
