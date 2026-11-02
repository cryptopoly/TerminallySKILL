---
title: Backlog
order: 3
summary: Reminders for Dan, then every feature, bug and chore not yet done, in one table, with detail below.
---
# Backlog

All future work lives here: features, bugs and chores. [Decisions](decisions.md) holds only questions waiting on a design or product call. When a decision creates work, the work moves here.

Priority: P1 urgent, P2 next, P3 later. Sizes: **S** up to 3 days, **M** about a week, **L** two weeks or more (one developer). **IDs are stable:** numbers are the feature ideas, **B** is a bug, **C** is a chore or small setting. A dropped idea keeps its number and moves to Rejected. Code references were read on the dates shown. Competitor sources are in [research](research-competitors.md).

## Reminders for Dan

- [ ] **Monthly, first week: dependency and security review.** Update the packages we use and check for security issues, so we ship the newest, safest software we can. Run `npm audit`, `npm outdated`, check Electron's release notes and security advisories, bump, then run `npm run test:ci`, `npm run test:e2e` and `npm run test:package:mac:arm64`. A monthly GitHub issue is opened automatically by `.github/workflows/dependency-review.yml` as the prompt. Next due: **2026-12-02**. Last done 2026-11-02 (see [decisions](decisions.md) item 21).
- [ ] **Also review immediately** when a serious advisory is in the news (Electron, node-pty, ws, electron-updater are the shipped runtime packages).
- [x] **Release tweet / notes for 0.9.103 (released 2026-10-31):** lead with the privacy line "No telemetry. No analytics. No account." (verified 2026-10-29: no telemetry, analytics or crash-reporting code in the app; the only network use is the update check, AI providers and SSH/VNC the user chooses).
- [x] Hand-test the 0.9.103 features in a packaged build before release (done 2026-10-31, UAT passed).
- [ ] Hand-test the packaged v0.9.102: `python3` typing, Explain & fix, language switch, Arabic layout.
- [x] Native-speaker review dropped (2026-11-01): act on wording feedback if a user raises it (see [decisions](decisions.md) item 3).

## All work

Status chips above the table filter it; Done starts hidden.

| ID | Item | Type | Size | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| 1 | Command blocks lite | Feature | M | P2 | Planned | 0.9.105, first (decisions item 19). Copy a command or its output without dragging. |
| 13 | Built-in session restore | Feature | M | P2 | Planned | 0.9.105, after blocks: opt-in, layout and folders first, no unprompted SSH reconnect. |
| 16 | Save recent commands as a workflow | Feature | S–M | P2 | Proposed | Shares the command list with idea 1. |
| 2 | Multi-host SSH run | Feature | M | P2 | Banked | Next SSH feature after idea 1. |
| 19 | GPU terminal rendering, measured first | Feature | S | P2 | Proposed |  |
| 20 | New agent in its own worktree | Feature | M | P2 | Proposed |  |
| 3 | Private tab ("don't record this tab") | Feature | S–M | P3 | Banked | Not recommended now; see the verdict below. |
| 4 | Fig-spec completions for the command builder | Feature | M | P3 | Banked |  |
| 5 | Attention dots for other projects | Feature | S | P3 | Banked |  |
| 8 | Background schedules (no open window needed) | Feature | M | P3 | Banked |  |
| 9 | Team-shared workflows through git | Feature | S–M | P3 | Banked |  |
| 10 | Searchable shell history (local, Atuin-style) | Feature | M | P3 | Banked |  |
| 11 | Port-forward UI; SFTP pane | Feature | S–M / L | P3 | Banked |  |
| 17 | Paste a command, get the visual builder | Feature | M | P3 | Proposed |  |
| 18 | Markdown runbooks (run code blocks in a README) | Feature | S–M | P3 | Proposed |  |
| 21 | Review what an agent changed | Feature | M | P3 | Proposed |  |
| 22 | Import SSH projects from `~/.ssh/config` | Feature | S–M | P3 | Proposed |  |
| 23 | Agent and workflow alerts on your phone | Feature | S–M | P3 | Proposed |  |
| B1 | Terminal panel left with one row on small windows | Bug |  | P2 | Todo | About 1024x677 with the Editor Prompt on, found from CI screenshots. Consider a minimum terminal height, or hide the review bar first. |
| B2 | No error when a terminal cannot open | Bug |  | P2 | Todo | Run Script does nothing visible: the failure is swallowed by a `void` promise in `executeScript` (`ScriptList.tsx`). Show an error toast. |
| B3 | E2E "a missed run is recorded" fails about 1 run in 20 | Bug |  | P2 | Worked around | One CI retry. May be a product bug: the jump can land on the Dashboard. Loop `xvfb-run npx playwright test tests/e2e/attention-schedule.spec.mjs -g "missed run is recorded"` in the Ubuntu VM. |
| B4 | Windows: unit tests assume POSIX paths | Bug |  | P3 | Todo | `path-access`, `file-ipc`, `run-manager`. Job is non-blocking; fix tests, then drop `continue-on-error`. Windows e2e and packaging never ran on the VM: `node-pty` needs VS Build Tools with ARM64 C++ (several GB, needs Dan's OK). |
| B5 | Windows 11 ARM64: silent install writes no `.exe` or `.dll` | Bug |  | P3 | Open | Found with `tools/vm-release-smoke-windows.sh`. Cause unknown. No known Windows users; check before promising support. |
| B6 | Linux arm64 AppImage needs `libz.so` | Bug |  | P3 | Worked around | arm64 ships `.deb` only. A patched runtime is proven but needs a double build. |
| B7 | Did 0.9.102 arm64 Linux have the dead-terminal bug? | Bug |  | P3 | Todo | An x86 `pty.node`, fixed in 0.9.103. If so, say so in release notes. |
| B8 | `.deb` file modes follow the builder's umask | Bug |  | P3 | Worked around | Release builds use umask 022, so shipped files are fine. Could normalise modes in the builder config. |
| C1 | Major package upgrades held back | Chore |  | P3 | Banked | Held 2026-11-02: `@xterm/xterm` 6 and addons, React 19, Tailwind 4, TypeScript 7, Vite 8, Vitest 5, `electron-vite` 6, `lucide-react` 1, `react-resizable-panels` 4, `@vitejs/plugin-react` 6. noVNC pinned at 1.6.0 because 1.7 moved to ES modules and breaks our import and build patch. Review `@xterm/xterm` 6 and noVNC 1.7 next, one at a time. 15 moderate `npm audit` findings are in `electron-builder` tools only and are not shipped. |
| C2 | Test against a real VNC server | Chore | S | P3 | Done | `x11vnc` in the Ubuntu VM and in CI's Linux job, approved by Dan 2026-11-02. Linux only. VM snapshot `before-x11vnc-2026-11-02` taken first. |
| C3 | Package smoke test removes the installed `.deb` | Chore | S | P3 | Todo | `tools/linux-package-smoke.sh` ends with `dpkg -r`, so `tools/vm-test.sh` removes the installed release from the VM. Restore the earlier version at the end. |
| C4 | Native-speaker review of translations | Chore |  | P3 | Banked | Closed as a task 2026-11-02: only if the app gets real users. Act on wording feedback if a user raises it. Arabic right-to-left is checked by machine and screenshots only. |
| C5 | Per-script "quiet" setting for alerts | Feature | S | P3 | Banked | For a dev app quit with Cmd+Q, which exits 0 and still alerts (decisions item 12a). |
| C6 | "Also hide variables named ..." list in the Privacy tab | Feature | S | P3 | Banked | Decisions item 11e. |
| C7 | npm 10.9.4 crashes on dependency re-resolve | Chore |  | P2 | Worked around | Use `npx -y npm@11`; consider upgrading npm in CI and locally. |
| C8 | `macos-latest` runner fails code signing | Chore |  | P2 | Worked around | Pinned to `macos-15`. Revisit when the image is fixed. |
| C9 | Old x86_64 `node-pty` `build/Release` leftover | Chore |  | P3 | Todo | Harmless; clean up. |
| 6 | Jump to next terminal that needs me | Feature | S | P3 | Done | Shipped in 0.9.103. |
| 7 | Schedule run history and missed-run catch-up | Feature | S | P3 | Done | Shipped in 0.9.103. |
| 12 | Lazy-load locale bundles | Feature | S | P3 | Done | Shipped in 0.9.103. |
| 14 | Agent-aware attention | Feature | S | P2 | Done | Shipped in 0.9.103. |
| 15 | Secret masking in logs and AI requests | Feature | S–M | P2 | Done | Shipped in 0.9.103; gaps closed for 0.9.104. |
| B9 | macOS CI e2e failed on the small runner screen | Bug |  | P2 | Done | Fixed in tests, PR 4. |
| B10 | arm64 Linux package shipped an x86 `pty.node` | Bug |  | P1 | Done | Fixed in 0.9.103. Release workflow builds arm64 on `ubuntu-24.04-arm` and checks the module. |
| B11 | Workflows hung after `sudo` or `apt` | Bug |  | P1 | Done | Fixed in 0.9.103. |
| C10 | Type-check test files | Chore | S | P3 | Done | PR 24. |

## Banked ideas (1 to 13)

### 1. Command blocks lite (M)
- **What:** each finished command in a terminal gets a small gutter mark with actions: copy output, copy command, rerun, Explain & fix.
- **User value:** no more scroll-and-drag to copy one command's output; failures are one click from an explanation.
- **How here:** `components/terminal/TerminalPanel.tsx` already builds a `TerminalCommandBlock` (start line, end line, command, exit code) from the shell-integration events (OSC 7337 `prompt-ready` / `command-start`, emitted by `main/shell-integration-init.ts`, parsed in `main/pty-output.ts`). Today only `lastCompletedCommandBlock` is kept, and `lib/terminal-transcript.ts` extracts its text. Keep a capped list of blocks anchored with xterm markers (so trimmed scrollback does not shift lines), draw a green/red decoration per block, and reuse the Explain & fix path (`lib/command-ai-explain.ts`, `lib/exit-diagnostics.ts`) and `PromoteCommandDialog.tsx` ("save as snippet").
- **Risk:** low-medium. Only works where shell integration runs (local zsh and bash); remote SSH shells get no blocks (unverified whether integration is injected remotely). Full-screen apps (vim, less) must not get marks.
- **Dependencies:** none. Pairs with 16 (save blocks as a workflow).
- **Recommendation:** first in 0.9.105 (decisions item 19). First version: gutter dot plus a right-click menu; no block selection or folding.
- **Code check 2026-11-01:** `TerminalPanel.tsx` builds a block but keeps only the active and last one; xterm markers are not used yet. Remote blocks are unverified. Together with idea 16, about 1 to 1.5 weeks.

### 2. Multi-host SSH run (M)
- **What:** run one workflow or snippet across several SSH projects and see a pass/fail row per host.
- **User value:** "update and restart on all five servers" becomes one action with a clear result table, without a paid SSH client.
- **How here:** SSH projects already carry host, user, port, key (`shared/project-schema.ts`, `SSHProjectWorkspaceTarget`), and `shared/workspace-target.ts` builds the launch plan. The workflow runner (`store/workflow-runner-store.ts`, `components/scripts/WorkflowRunnerHost.tsx`) runs in one tab; run it once per selected project in background tabs (as schedules already do) and group the `RunRecord`s (`main/run-manager.ts`) under one batch id. Host picker goes in `WorkflowRunDialog.tsx`.
- **Risk:** medium. A bad command now hits many machines: default to sequential with "stop on first failure", and offer "run on one host first, then ask" using the existing approval step.
- **Dependencies:** 7 (run history grouping) helps; none required.
- **Recommendation:** next big SSH feature after 1. First version: sequential only, stop on first failure, one host first then ask, summary table in Runs & Logs. About 1 week. Serves SSH users only and carries more risk than 1.
- **Code check 2026-11-01:** run records have no batch id yet.

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

### 6. Jump to next terminal that needs me (S) (shipped in 0.9.103)
- **What:** one shortcut (suggest Cmd/Ctrl+Shift+U, the same as cmux) and a palette entry that focus the oldest unseen alert, switching project if needed.
- **User value:** with several agents and builds running, you go straight to the one waiting.
- **How here:** add the key to the handler in `components/layout/AppShell.tsx` (next to Cmd+K and Ctrl+Tab), read `store/attention-store.ts`, and add a `components/palette/CommandPalette.tsx` entry.
- **Risk:** low (check the key does not clash in 19 keyboard layouts).
- **Dependencies:** best with 14.
- **Recommendation:** ship with 14.

### 7. Schedule run history and missed-run catch-up (S) (shipped in 0.9.103)
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

### 12. Lazy-load locale bundles (S) (shipped in 0.9.103)
- **What:** load only the active language instead of all 19 at start.
- **User value:** faster start and less memory (renderer about 4.9 MB today).
- **How here:** `i18n/resources.ts` statically imports all 18 `locales/*.json`; switch to a dynamic `import()` per language with English bundled.
- **Risk:** low; language switch must wait for the bundle to load.
- **Recommendation:** done.

### 13. Built-in session restore (M)
- **What:** reopen each project's tabs, splits and folders after a restart, optionally with the old scrollback shown as read-only text.
- **User value:** a restart or update no longer costs your layout.
- **How here:** `TerminalPanel.tsx` already loads `SerializeAddon` (used for snapshots and logs); `lib/workspace-session.ts` (`createProjectTerminalSession`) rebuilds a project shell. Save the layout on quit, recreate tabs on launch, print saved scrollback dimmed. Running processes are not restored.
- **Risk:** medium: stale scrollback may contain secrets (needs 15), and restored SSH tabs reconnect unprompted.
- **Dependencies:** 15 for scrollback.
- **Recommendation:** bank; do layout-only first if asked.

## New ideas (2026-10-29)

Picked to play to the app's strengths: workflows, the command builder, no account, SSH projects, the attention layer and schedules. Evidence links are in [research](research-competitors.md#update-2026-10-29-second-pass).

### 14. Agent-aware attention (S) (shipped in 0.9.103)
- **What:** let programs that run inside a tab, especially Claude Code and Codex, raise the tab dot and notification themselves, with their own message ("Claude needs permission to run npm test").
- **User value:** people run several coding agents in tabs; today our dot only knows about long commands and workflow approvals, not "the agent is waiting for you".
- **How here:** `main/pty-output.ts` already pulls our own OSC 7337 markers out of the output stream with regexes and buffers split chunks. Add parsers for three standard sequences: OSC 9 (`ESC ] 9 ; message`) and OSC 777 (`ESC ] 777 ; notify ; title ; body`) desktop notifications, and the new OSC 7501 Program Status Protocol (states idle, working, blocked, done, error; message base64). Forward them as attention events to `lib/attention.ts` (`raiseAttention`), which already handles tab dot, dock badge and notification. Show "blocked" as the amber approval dot and "working" as the busy badge.
- **Why it is impressive in a demo:** four Claude Code tabs, you switch to email, one tab turns amber with the agent's own words, the notification click lands on that tab. Plus "it just works, nothing to configure" for Claude Code's new status protocol.
- **Competitor evidence:** cmux rings panes on OSC 9/99/777 and jumps to unread with Cmd+Shift+U; iTerm2 3.7 (2026-09) added Claude Code session status dots; Zed terminal threads (2026-05) notify when a process needs attention; Claude Code sends desktop notifications by default only in Ghostty, Kitty and iTerm2, and supports OSC 7501 status (v2.1.295+); OSC 7501 was proposed by Mitchell Hashimoto on 2026-10-06.
- **Risk:** low-medium. Any program (or a remote server) can print these sequences, so cap message length, strip control characters, never open URLs from them, and honour the existing switch. How a terminal advertises OSC 7501 support is not yet verified; read the spec before building. Bell-only programs are noisy, so treat a bare bell as a dot only, never a notification.
- **Dependencies:** none; pairs with 6.
- **Recommendation:** done.

### 15. Secret masking in logs and AI requests (S–M) (shipped in 0.9.103)
- **What:** detect common secrets (cloud keys, GitHub and Stripe tokens, AI provider keys, JWTs, private-key blocks) and replace them with `[redacted: GitHub token]` before anything is written to a saved log or sent to an AI provider.
- **User value:** `cat .env` followed by Explain & fix no longer ships your keys to a model or into a log file.
- **How here:** one shared pattern list (new `shared/secret-patterns.ts`), applied in `main/log-manager.ts` (`saveSessionLog`), in the prompt builders of `main/ai-manager.ts` (`buildOutputReviewPrompt`, `buildCommandExplainPrompt`), and when promoting output to snapshots or snippets. `lib/terminal-safety.ts` already classifies password and token prompts and can share wording. The Privacy tab shows a session-only count ("4 secrets kept out of AI requests"), never the values.
- **Why it is impressive in a demo:** print a fake AWS key, press Explain & fix, open the request preview: the key is a grey `[redacted]` chip. Fits "No telemetry. No analytics. No account."
- **Competitor evidence:** Warp has Secret Redaction (regex-based, off by default, redacts before sending to LLMs); iTerm2 3.7 added redaction to its screenshot tool.
- **Risk:** low-medium. False positives can mangle logs (keep a switch); false negatives mean the wording must say "pattern-based, not a guarantee".
- **Dependencies:** none; unblocks 10 and 13.
- **Recommendation:** done.

### 16. Save recent commands as a workflow (S–M)
- **What:** pick the last commands you typed in a tab and turn them into a workflow, with selected text turned into inputs.
- **User value:** the fastest way to create workflows: do the task once by hand, then save it.
- **How here:** commands and exit codes already arrive through shell integration (see idea 1). Extend `components/terminal/PromoteCommandDialog.tsx`, which today promotes one command to a script or snippet, into a checklist of the tab's last 20 commands (successful ones ticked). Each becomes a command step; selecting text in a step creates an input via `components/scripts/WorkflowInputEditor.tsx` and inserts `{{name}}` (syntax from `shared/workflow-execution.ts`).
- **Why it is impressive in a demo:** set up a project in five typed commands, click "Save as workflow", turn the folder name into an input, run it on a second project.
- **Competitor evidence:** Warp creates workflows from a block's actions with `{{argument}}` parameters; Atuin Desktop sells runbooks built from shell history.
- **Risk:** low. Needs a session-level command list (shared with 1). Commands typed inside SSH sessions may not be captured.
- **Dependencies:** shares plumbing with 1.
- **Recommendation:** good companion to 1. First version: no automatic input detection.

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

## New ideas (2026-11-01)

From web searches and a code check on 2026-11-01. The evidence is mostly vendor docs and blogs. None has been requested by our users so far, and sizes are estimates.

### 19. GPU terminal rendering, measured first (S)
- **What:** measure how fast the terminal draws heavy output. If it helps, draw it with the graphics chip.
- **How here:** `TerminalPanel.tsx` loads the fit, web-links, search and serialize addons only, so xterm uses its default DOM renderer. Benchmark first, then add `@xterm/addon-webgl` with a fallback to DOM on lost context or no GPU, plus a setting. [xterm 4.3.0](https://github.com/xtermjs/xterm.js/releases/tag/4.3.0) reports WebGL up to 900% faster than canvas; that is an old benchmark and not ours.
- **Risk:** WebGL can lose its context after sleep; software GPUs (VMs, CI) may misbehave; compatibility with xterm 5.5 versus 6.0 is not checked.
- **Recommendation:** measure at the next dependency review; ship only if the gain is visible. Cheap, helps every user, and agents print a lot of output.

### 20. New agent in its own worktree (M)
- **What:** one click makes a separate copy of your code on a new branch and starts an AI agent there, so several agents do not trip over each other.
- **How here:** the app has no worktree code. A "New agent tab" action in a git project asks for a name and an agent, creates the worktree and branch, opens a labelled tab, and offers cleanup with a warning about uncommitted or unpushed work. [Claude Code has `--worktree`](https://code.claude.com/docs/en/worktrees); use plain `git worktree add` for other agents.
- **Risk:** shared ports and databases remain the hard part; this does not solve that. Evidence is mainly how-to guides plus [crystl](https://crystl.dev/blog/git-worktrees-claude-code/), a vendor offering the same setup.
- **Recommendation:** after command blocks. Extends the attention work: dots tell you which agent needs you, and this makes running several easy.

### 21. Review what an agent changed (M)
- **What:** a panel shows the code changes an agent made in its folder, and lets you send comments back to it.
- **How here:** `DiffViewer.tsx` compares output snapshots line by line by position, so it is not a real diff. A side panel shows `git diff` for the active tab's folder, refreshes as files change, and pastes review comments into the agent's terminal after the user confirms. Local projects first. [Agent Manager](https://pkg.go.dev/github.com/YoanWai/agent-manager@v0.4.0) ships this comment-back loop.
- **Risk:** overlaps with editors and agents' own review tools; large diffs need care.
- **Recommendation:** bank until idea 20 is in use.

### 22. Import SSH projects from `~/.ssh/config` (S–M)
- **What:** pick from the servers your computer already knows, instead of typing each one in.
- **How here:** an SSH project stores host, user, port, identity file and working folder, and the app launches the system `ssh`. It has no import and no jump-host field. `ProxyJump` should already apply when the host matches; not tested. Test that first, then add a picker that reads `Host` entries, skips wildcards and handles `Include`.
- **Risk:** low. It reads a local file only.
- **Recommendation:** do the test and importer before idea 2.

### 23. Agent and workflow alerts on your phone (S–M)
- **What:** when an agent needs you and you have left your desk, your phone buzzes. You choose where the message goes, and it is off by default.
- **How here:** an opt-in setting with a URL the user supplies, for example an [ntfy topic](https://docs.ntfy.sh/publish/). Send only the alert type and project name by default, never terminal output, run masking on any text, and log each send in the Privacy tab.
- **Risk:** it is the app's first user-configured outbound message, so it needs care around the "no cloud" promise. Public ntfy topics act like passwords, and [instant iOS delivery](https://docs.ntfy.sh/subscribe/phone/) from self-hosted ntfy needs an upstream server.
- **Recommendation:** build only after users confirm that 0.9.104's desktop alerts leave a gap.

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

<details>
<summary>Older checklist (kept for history)</summary>

- [x] **P1, done.** Dependency security update: Electron 42.11.18, electron-updater 6.8.11, build tools; `npm audit` 0 (2026-10-28).
- [x] **P1, done on branch.** Monthly dependency review workflow and this hub (the workflow only starts opening issues once merged to `staging`).
- [x] **P1, done on branch.** Attention layer (tab dot, badge, notification).
- [x] **P1, done on branch.** Scheduled workflows.
- [x] **P1, done on branch.** Privacy and network panel.
- [x] **P1, done on branch.** Upgrade Electron 42 to 45 (42 is out of support since 2026-10-21): now part of 0.9.103 (branch `feat/electron-45`).
- [x] **P1, done on branch.** Four extra features for 0.9.103: agent-aware attention (14), jump-to-next-terminal (6), schedule history and catch-up (7), secret masking (15). See the ideas above.
- [x] **P1, done on branch.** Local OpenSSH remote-session e2e (branch `test/local-ssh-e2e`).
- [x] **P1, done (published 2026-10-31).** Release 0.9.103: version bumped, notes written, PR #2 open into `staging`. Dan: hand-test UAT, merge, promote to `main`, run the Release workflow, tweet.
- [x] **P2, started.** Ubuntu 26.04 ARM64 VM is set up (snapshot `fresh-install-2026-10-30`, Node 22, Xvfb, repo clone in `~/tsk`); test:ci and e2e pass there. Still todo: `prlctl` script, GitHub Actions matrix, Windows VMs. Original item: GitHub Actions matrix plus a Parallels `prlctl` script (see [decisions](decisions.md)).
- [ ] **P2, todo (from 0.9.103 feedback, see [decisions](decisions.md) item 11).** Maximise terminal toggle (11a); running/needs-you/idle dots with legend (11b); agent-waiting notifications: BEL, quiet-terminal check, repeat reminder, verify Claude Code output first (11c, headline candidate); cycle-projects shortcut (11d); masking gaps: empty-user URL password, `DB_PASS`/`PWD`, `_KEY` names (11e).
- [ ] **P2, todo (decisions item 12).** zsh history: HISTFILE points into the temp ZDOTDIR so history is lost per tab (12c); no OS alert for user stops, exit 130/143/129 (12a); workflow step marker `printf` leaking to the display (12b, P3).
- [ ] **P2, todo.** Multi-host SSH run.
- [ ] **P2, todo, 0.9.105 first.** Command blocks lite: copy a command or its output without dragging through the terminal.
- [ ] **P2, todo, 0.9.105 second.** Session restore: opt-in, layout and folders first. No SSH reconnect unprompted. Prove masking on saved scrollback before restoring it.
- [ ] **P3, banked.** Private tab ("don't record this tab"): see idea 3.
- [ ] **P3, banked.** Attention dots for other projects' tabs; "jump to next terminal that needs me" shortcut.
- [ ] **P3, banked.** Background schedules: today a schedule needs an open window (closing the last window on macOS skips runs). Options: keep a hidden window alive, launch at login, menu-bar item. Decide after real use.
- [ ] **P3, banked.** Schedule run history and an optional catch-up for missed runs.
- [ ] **P3, todo.** Fig-spec completions for the command builder (check licence first).
- [x] **P2, done on branch.** Lazy-load locale bundles (branch `feat/lazy-locales`, in 0.9.103).
- [ ] **P3, in progress.** Fix 13 test-fixture type errors, then include test files in the type-check (branch `chore/typecheck-tests`).

</details>
