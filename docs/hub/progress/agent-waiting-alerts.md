---
title: Agent-waiting alerts (11c)
status: in review
---
# Progress: agent-waiting alerts

Updated: 2026-10-31. Owner: agent. Branch: `feat/agent-waiting-alerts`, stacked on `feat/terminal-maximise-dots` (PR #19). Pushed, no PR.

## Goal

[Decisions](../decisions.md) item 11c: when an agent (or any program) waits for a yes in a terminal nobody is looking at, show the needs-you dot and send the OS notification. Remind again if it is still waiting.

## Step 1: what agents really emit (verified first)

### Claude Code 2.1.316

Evidence: strings in the installed binary (`~/.openclaw/tools/node/bin/claude`, a Bun-compiled Mach-O), plus one real start in a throwaway `HOME` and `CLAUDE_CONFIG_DIR`. It was not signed in, so no API calls were made.

- **Local notifications** (setting `preferredNotifChannel`, in `/config` as "Notifications" / "Local notifications"):
  - Values: `auto` (the default), `iterm2` (OSC 9), `terminal_bell` (BEL), `iterm2_with_bell`, `kitty` (OSC 99), `ghostty` (OSC 777), `notifications_disabled`.
  - With `auto`, it picks a channel only for these terminals:
    - `iTerm.app`: OSC 9.
    - `kitty`: OSC 99.
    - `ghostty`: OSC 777.
    - `Apple_Terminal`: BEL, and only when the profile's own bell is off.
  - Any other terminal gets `no_method_available`, so nothing is sent.
  - When they fire:
    - Permission prompt: after 6 s with no input. Text: "Claude needs your permission to use X".
    - Idle prompt: after 60 s (`messageIdleNotifThresholdMs`). Text: "Claude is waiting for your input".
  - **So the original theory was right about the notification channel: in TerminallySKILL, `auto` sends no BEL or OSC 9 for these.**
- **But the theory was incomplete. Claude Code also speaks OSC 7501, and we already support it.**
  - At start-up it sends the query `ESC ] 7501 ; ? BEL`. This was seen on the wire in the real start, next to `CSI > 0 q`, `CSI ? u` and `CSI c`.
  - If the terminal answers with an OSC 7501 reply that starts with `?`, it reports its state as `OSC 7501 ; state=working|blocked|done|idle|error : app=claude-code : kind=permission|question|auth : msg=<base64>`.
  - TerminallySKILL already answers that query (`OSC_7501_SUPPORT_REPLY`, since 0.9.103, when attention alerts are on), and already turns `blocked` into needs-you.
  - So a current Claude Code should already raise needs-you here with no setting. This is from the code; there was no signed-in run to confirm it.
  - It does **not** report state when:
    - `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` is set;
    - it runs as a background worker;
    - it runs inside tmux or screen (they swallow the query);
    - it is an older version without the probe;
    - attention alerts are off (we do not answer then).
- **Other output:**
  - It sets the window title (OSC 0).
  - It sends OSC 9;4 progress only to Ghostty 1.2+, iTerm2 3.6.6+ and ConEmu.
  - It sends OSC 133 marks.
  - OSC 21337 tab status is compiled out (`dyn()` returns false).
  - It rings the bell itself when a tool that ran over 5 s resolves, but only through the `terminal_bell` path.
- **Approval prompt text** (in the binary):
  - "Do you want to proceed?"
  - "Do you want to {verb} {file}?"
  - "Yes, and don't ask again for …"
  - "No, and tell Claude what to do differently"
  - "Esc to cancel"
- **Honest hint:** in Claude Code, `/config` → Notifications → `terminal_bell` (or `iterm2` for OSC 9 with text). Both are documented values, and we handle both. We do not fake `TERM_PROGRAM`.

### Our pty environment

- `src/main/pty-manager.ts` does not set `TERM_PROGRAM`, so it inherits whatever the app was started with:
  - Started from Finder or the Dock: unset.
  - Started from a terminal (dev, `open` from iTerm): `TERM_PROGRAM=iTerm.app` and `ITERM_SESSION_ID` leak into our shells, so Claude Code then thinks it is in iTerm2 and sends OSC 9.
- `TERM=xterm-256color`.
- Not changed here (see Decisions to propose).

### Other agents (public docs and source only; nothing installed or run)

| Tool | Notifies by itself? | Setting | Approval text used in the matcher |
|---|---|---|---|
| Codex CLI | Yes: OSC 9 for Ghostty, iTerm2, Kitty, Warp, WezTerm; **BEL for every other terminal** (so BEL handling covers it here) | `[tui] notifications` (default on per PR #6633, assumed), `notification_method = auto\|osc9\|bel`, `notification_condition = unfocused\|always` | Verified (`codex-rs/tui/src/bottom_pane/approval_overlay.rs`): "Would you like to run the following command?", "… make the following edits?", "… grant these permissions?", "Do you want to approve network access to", "No, and tell Codex what to do differently" |
| Gemini CLI | Yes when on: OSC 9, falls back to BEL | `general.enableNotifications` (default false), `general.notificationMethod` (default auto) | Verified (`ToolConfirmationMessage.tsx`): "Apply this change?", "Allow execution of …" |
| Aider | Runs an OS notifier command; BEL only when notifications are on and no notifier is found | `--notifications` / `AIDER_NOTIFICATIONS` | Verified (`io.py` `confirm_ask`): "… (Y)es/(N)o …" |
| GitHub Copilot CLI | No built-in BEL or OSC found; has a `notification` hook event | hooks in `.github/hooks/*.json` or `~/.copilot/hooks/` | Verified from docs: "No, and tell Copilot what to do differently (Esc)" |
| Cursor CLI | Docs: "Send a terminal notification when the agent finishes or needs input"; the sequence is not documented | `notifications` in `~/.cursor/cli-config.json` | **Assumed:** "(y) … (n)" (docs only say approve (y) or reject (n)) |
| OpenCode | None found | none found | **Assumed:** "Always allow" / "Allow always" (from issues and third-party pages, not source) |
| Amp | None found (the config page needs a sign-in) | none found | **Not verified:** generic patterns only |

Sources:
- learn.chatgpt.com config reference;
- raw `openai/codex` `codex-rs/tui/src/notifications/mod.rs`;
- `google-gemini/gemini-cli` `docs/cli/settings.md` and geminicli.com notifications;
- aider.chat notifications docs and `aider/io.py`, `aider/coders/base_coder.py`;
- docs.github.com Copilot CLI and its hooks reference;
- cursor.com/docs/cli.

The research was done by a sub-agent from the web, so treat each row as checked once, not twice.

## Step 2: what was built

Everything below is agent-neutral: there is no tool-specific gate anywhere. A Claude-only check would miss Codex, which sends BEL here.

1. **BEL** (`term.onBell`) raises needs-you.
   - Rule (`shouldRaiseForBell`): it counts only when the terminal is not watched and something is running in it (shell integration busy, or a program reported OSC 7501).
   - Why: shells ring the bell for trivial reasons (tab completion with no match, a wrong key in a pager), but those happen at the prompt or while you type, which means you are watching.
   - If the screen shows an approval prompt, the alert says "Waiting for your yes: <prompt line>". Otherwise it says "Needs your attention: Rang the terminal bell".
   - Rate-limited with the OSC handlers (1 s per terminal).
   - A second alert of the same kind on a tab that already shows it is dropped. For example, Claude Code's OSC 7501 `blocked` followed by its bell gives one dot and one notification.
2. **Quiet-terminal check** (`shouldCheckQuietTerminal`, every 1 s per terminal).
   - Fires when a terminal is busy (or a program reported OSC 7501 idle), unwatched, has no dot already, and has printed nothing for **20 s** (constant).
   - A program that reports OSC 7501 `working` is trusted and never flagged.
   - Then the last 10 non-empty screen lines go through the prompt table (`src/shared/agent-prompts.ts`, one row per tool and pattern, a unit test per row):
     - **Approval match:** needs-you dot plus OS notification ("Waiting for your yes", with the prompt line as the body). The body is masked with `maskSecrets`, cleaned with `sanitizeAgentText`, and limited to 140 characters.
     - **No match:** the grey **idle** dot only. No notification and no dock badge, because "quiet" alone also covers a dev server or a long `sleep`, and notifying for those would be noise.
   - Any new output clears idle. The screen is read only to match, and is never logged or sent anywhere except the local notification body.
3. **Idle dot is wired.**
   - Shown for a quiet busy terminal and for a program that reports OSC 7501 `idle`. Before, an idle report hid the dot.
   - Legend text is now real: "a program is open but has printed nothing for a while … Dot only, no notification."
   - Not a live region. It never counts on the dock badge (it is not an attention entry).
4. **Repeat reminders** (`createReminderScheduler`).
   - For any needs-you entry (OSC, bell, quiet check, workflow approval): one more OS notification at 10 minutes and one at 30 minutes, titled "Still waiting for you (10 minutes)" with the duration from `Intl.NumberFormat`, which handles plurals.
   - Sent only while the same entry is still there and the window is not in front.
   - Cancelled when the entry clears.
5. **Settings hint** under the Notifications card: "Coding agents (Claude Code, Codex, Gemini CLI and others) can alert you here too. If yours stays silent, see your agent's notification setting." Plain text, no link.
6. **OS notification:** unchanged path (`silent: false`, so the system default sound; the click focuses the terminal). A comment was added.
7. **Test-only timing:** `TSK_E2E_ATTENTION_QUIET_MS` is read in the preload as `attentionQuietMsOverride`. It is clamped to 500 ms–20 s and can only make the wait shorter.
8. **Strings:**
   - New: `dot.idle`, `attention.waitingForYes`, `attention.bell` and `attention.stillWaiting` (terminal); `general.attention.agentHint` (settings).
   - Changed: the idle legend label and description (onboarding).
   - All in 18 locales, machine-written; add them to the native-review list (item 3).

## Tests

- Unit tests:
  - prompt table: one example per row, a negative set, question beats option line, a prompt that scrolled off is ignored;
  - quiet rule and bell rule;
  - reminder schedule with fake timers (10 and 30 min, never a third, cancel, window in front, same entry or new entry);
  - `resolveTabDotState` idle cases;
  - store clean-up of the quiet flag.
- `npm run test:ci` green (490 tests).
- New e2e `tests/e2e/agent-waiting-alerts.spec.mjs`:
  - (1) "Do you want to proceed? (y/n)" and then silence in a background tab gives needs-you with the prompt as the detail;
  - (2) BEL in a busy background tab gives needs-you;
  - (3) a silent `sleep` in a background tab gives the idle dot, which is not a live region and adds no count;
  - a quiet command in the watched tab raises nothing;
  - the Settings hint renders.
- `terminal-maximise-dots` updated: OSC 7501 idle now shows the idle dot.
- `npm run test:e2e`: 27 passed, 6 skipped (the SSH and Docker specs).
- Screenshots looked at:
  - tab bar with two needs-you dots and one idle dot, on void and chalk;
  - Settings hint;
  - legend.
  - Set `TERMINALLYSKILL_SCREENSHOT_DIR` to keep them.

## Not done / not tested

- **No signed-in Claude Code, Codex or Gemini run** (paid). The OSC 7501 path is proven only up to the probe; the BEL and quiet paths are proven with `printf` and `echo`.
- Repeat reminders are not exercised end to end (unit tests with fake timers only). The real OS notification and its sound were not seen; e2e cannot see notification centre.
- Windows and Linux; packaged app.
- **The walk-away case with the window still in front.** If TerminallySKILL is the front window and the agent's tab is the active one, the tab counts as watched, so nothing is raised. That is probably part of what users hit (they leave the window up and walk off).
- A typed command line that itself contains prompt text can match if the command goes quiet before printing (seen in e2e). Real agents' command lines do not, so this was left as is.
- Approval patterns for OpenCode, Cursor CLI and Amp are guesses or generic only.

## How to resume

1. `git checkout feat/agent-waiting-alerts` in a worktree, `npm ci`.
2. `npm run test:ci`, `npm run test:e2e`.
3. PR after #19 merges (this branch is stacked on it).

## Decisions to propose

- **Walk-away with the window in front.** Recommend treating a terminal as unwatched when the system has had no keyboard or mouse input for 2 minutes (Electron `powerMonitor.getSystemIdleTime`). Why: it covers the 20-minute walk-away even when the app is in front. It is cheap and local (no telemetry).
- **Stop inheriting `TERM_PROGRAM`, `TERM_PROGRAM_VERSION`, `LC_TERMINAL` and `ITERM_SESSION_ID` from the launching terminal.** Optionally set an honest `TERM_PROGRAM=TerminallySKILL`. Why: when started from iTerm, programs today believe they run in iTerm2, which is not true. Note: Claude Code would then stop sending OSC 9 in that case, and would rely on OSC 7501 or the user's setting.
- **Idle stays while you look.** A quiet tab keeps its grey dot when you open it, until it prints again. Recommend keep: it is information, not an alert.
- **Quiet without a prompt = dot only.** Recommend keep (no notification, no badge).
