---
title: UAT 0.9.104
order: 10
summary: Hand-test checklist for 0.9.104, on a packaged build.
---
# UAT checklist: 0.9.104

Run on a packaged build, not `npm run dev`: dev does not show notification banners. Back up the data folder first. Note failures on the [Decisions](decisions.md) page.

## 1. Agent-waiting alerts (headline)

- [ ] Real Claude Code approval prompt, app in the background: yellow dot and notification.
- [ ] Same prompt, app in front, no keyboard or mouse for 2 minutes: notification.
- [ ] Leave a prompt unanswered for 10 minutes: reminder notification.
- [ ] Click a notification: the app comes forward on that terminal.
- [ ] No notification after Ctrl+C on a long command.

## 2. Notification choice

- [ ] Use a fresh data folder (`TERMINALLYSKILL_USER_DATA_DIR`). First notification: one tip shows at the bottom right when you return. macOS: its button opens System Settings. No tip after that, including after a restart.
- [ ] Editor prompt on, Ctrl+R: the shell's search opens. Type part of an old command and press Enter: it runs, and the editor prompt returns.
- [ ] Editor prompt off, Ctrl+R: the same search opens, in the packaged app and in `npm run dev`.
- [ ] In search, press Ctrl+C twice: the editor prompt returns.
- [ ] Settings → General → Notifications: the "Keep notifications until dismissed" card shows.
- [ ] Open System Settings: the Notifications pane opens.
- [ ] Set TerminallySKILL to Alerts: a notification stays until closed.

## 3. Workflows

- [ ] Run `npm ci`, `electron-rebuild`, `package:mac`: each step completes only when it ends, one at a time.
- [ ] A failing step stops the run.
- [ ] No `printf` line in the terminal.
- [ ] Up arrow after the run shows a real command, not a marker. Check the arrow's position.
- [ ] Last terminal row is not cropped.

## 4. Dots

- [ ] Silent `sleep 60` in a background tab stays orange.
- [ ] Each state matches the legend in Help.

## 5. Terminal and projects

- [ ] `Cmd+Shift+M` maximises and restores; so do the tab bar button and the palette entry.
- [ ] `Cmd+Option+Down` and `Cmd+Option+Up` cycle projects.
- [ ] zsh history carries across new tabs (checked by Dan 2026-11-01; recheck on this build).

## 6. Masking

- [ ] `redis://:pass@host` and `DB_PASS=value` are masked in a saved log. The live terminal is unchanged.

## 7. Dependency update

- [ ] Open a VNC session with a real server, if you have a host to hand. An automatic test now covers the viewer, tunnel and password prompt with a stand-in server, so this is the only check against a real one. Include a server with a password if you have one.
- [ ] An SSH terminal connects.
- [ ] Settings → About shows 0.9.104.
