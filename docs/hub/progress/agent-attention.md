# Agent-aware attention and jump shortcut (ideas 14 and 6)

Branch `feat/agent-attention`, off `integ/0.9.103` (`73bab54f`).

## OSC 7501: what was verified
- **Spec** (superlogical.com/rex/docs/build/program-status, read 2026-10-29): `OSC 7501 ; key=value:key=value ST`, ST is `ESC \` or BEL. States `idle working done blocked error clear`; keys `state id kind progress app title msg`; `msg` is base64 UTF-8, at most 2732 bytes encoded and 2048 decoded, and a report whose decoded text has a control character is discarded whole. Feature detection: the program sends `OSC 7501 ; ? ST` followed by `CSI c`; a terminal that supports it replies `OSC 7501 ; ? ST` (optionally `:states=…:kinds=…`) before the DA reply. No terminfo or environment variable.
- **Proposal** (mitchellh.com/writing/program-status-osc7501): dated 2026-10-06; libghostty and Rex implement it; Claude Code, Codex, Terraform and Homebrew integrations are described as proof of concept.
- **Claude Code docs** (code.claude.com/docs/en/terminal-config): reports status to terminals that implement OSC 7501 from v2.1.295, nothing to turn on; it checks for support first; desktop notifications by default only in Ghostty, Kitty and iTerm2.
- **Live probe:** Claude Code 2.1.299 started in a pty (trust dialog, no session, no API use) sends `ESC ] 7501 ; ? BEL` then `ESC [ c` at startup. So the support reply is required, and the app now sends it.
- **Not verified:** the exact reports Claude Code sends once a session runs (states, `app`, `msg` text, whether it uses `id`). That needs a real session (paid credits), so it was not run.

## What shipped
- `src/shared/agent-status.ts`: parsers for OSC 9 (ConEmu `9;N` sub-commands such as the `9;4` progress bar are ignored), OSC 777 `notify;title;body`, OSC 7501. Mapping: OSC 9 and 777 → amber (needs you); 7501 `blocked` → amber, `done` → green, `error` → red; `idle`, `working`, `clear` raise nothing. Record `id`s are not modelled (one status per terminal).
- Untrusted text: control characters (C0, DEL, C1), bidi overrides and HTML-like tags removed, single line, 140 characters; payloads over 4096 bytes dropped. Text is only ever shown as plain text (tooltip, aria-label, OS notification). No URLs are opened.
- `src/renderer/src/lib/agent-attention.ts`: `term.parser.registerOscHandler` for 9, 777, 7501 per terminal. Goes through the existing `raiseAttention`, so the `attentionAlerts` switch and the "user is watching" rule apply. At most one alert per terminal per second. The 7501 support reply is sent only while alerts are on.
- Jump: **Cmd+Shift+J** (macOS) / **Ctrl+Shift+J** (Windows, Linux). Picks the terminal that has waited longest, in any project (switches project like a notification click), and clears its dot. Captured before xterm sees the key, so the shell never gets `^J`. Also a palette entry, shown only while a dot exists, and a line in Help → Keyboard Shortcuts. Cmd+Shift+U (cmux) was not used: Ctrl+Shift+U is the IBus Unicode-entry key on Linux.
- Strings: 8 new keys in English and the 18 locale files (machine translation, not native-reviewed).

## Tests
- Unit: `src/shared/agent-status.test.ts` (16) and 2 more in `attention.test.ts`; `npm run test:ci` 289 tests pass.
- E2E `tests/e2e/agent-attention.spec.mjs` (2): OSC 9 and OSC 7501 from two background tabs give the right dots, the shortcut jumps oldest first and clears them; the support reply reaches the program through the pty. `npm run test:e2e`: 13 passed, 6 skipped (packaged, Docker and local SSH, as before).

## Not covered / follow-ups
- No test of "never raise from the focused watched pane" for OSC (Playwright windows are not reliably focused); it reuses the same check as command alerts.
- The Notifications settings text still only mentions commands and workflows.
- A stale amber dot stays if an agent goes from `blocked` back to `working` without you looking (e.g. the prompt was answered elsewhere).
- Not tried with real Codex, Windows or Linux.
