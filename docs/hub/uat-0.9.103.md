# UAT checklist: 0.9.103

Run on a packaged build (`npm run test:package:mac:arm64` output, or the release candidate), not `npm run dev`. Tick each line. Note failures on the [Decisions](decisions.md) page.

## 1. Attention alerts (new)

- [ ] Settings → General: "Attention alerts" is on; threshold shows 15 seconds.
- [ ] Run `sleep 20` in tab A (typed in the terminal), then open or switch to tab B before it ends. When it ends, tab A shows a green dot. The dot clears when you open tab A.
- [ ] Run `sleep 20; false` in tab A, switch away. Red dot.
- [ ] Run `sleep 3` in tab A, switch away. No dot (under the threshold).
- [ ] Run `sleep 20` and stay on that tab. No dot, no notification.
- [ ] Run `sleep 20`, then switch to another app. macOS shows a notification (accept the permission prompt on first use). Clicking it brings TerminallySKILL forward on that tab.
- [ ] Dock icon shows a count while alerts are waiting; it clears when you look at them.
- [ ] Collapse the terminal bar while a command finishes. The dot shows on the collapsed bar.
- [ ] Turn the setting off. No dots or notifications.
- [ ] A workflow waiting for approval shows a pulsing amber dot.

## 2. Scheduled workflows (new)

- [ ] Scripts list: each row has a calendar-clock icon right after Play. Click it: the schedule dialog opens for that script.
- [ ] Open the editor of a script: the same icon sits in the header next to Share. Same dialog.
- [ ] Add "every 5 minutes". Row icon turns blue (scheduled). Run happens within about 5 minutes in a background tab, without taking focus.
- [ ] Add "daily at a time" with weekday chips. Next run time reads correctly.
- [ ] A script with a required input and no default: dialog blocks saving or the run is skipped and marked.
- [ ] Pause or delete a schedule. No further runs.
- [ ] Quit and relaunch. Schedules are still listed; missed runs did not replay.
- [ ] Delete a script. Its schedules disappear.
- [ ] A scheduled run that fails or waits for approval raises the same dot and notification as above.

## 3. Privacy tab (new)

- [ ] Settings has a Privacy tab. It says no telemetry, no analytics, no account.
- [ ] Trigger "Check for updates". A `github.com` (or update host) row appears. Host only, no path.
- [ ] Use an AI feature (Explain & fix). The AI provider host appears. No prompt text anywhere.
- [ ] Local AI (Ollama or LM Studio) shows as local, if you use one.
- [ ] Clear the list. It empties. Quit and relaunch: it starts empty.

## 4. Dependency and security update (Electron 42.11, Vite, vitest, sharp)

- [ ] App launches; window, menu and dock icon look normal.
- [ ] Open 3 terminals, run `vim`, `less`, `python3`. Keystrokes work.
- [ ] SSH to a host (or the Docker fixture). Password prompt works.
- [ ] Check for updates works and reports correctly.
- [ ] Open the app a second time: it focuses the first window (single instance).

## 5. Quick regression of 0.9.102 headlines

- [ ] Change UI language (for example German, Japanese). Menus and settings change.
- [ ] Run a failing command, click Explain & fix. Suggestion is inserted, not run.
- [ ] Run a 3-step workflow against a local terminal. Steps report the right exit codes.
- [ ] Projects, scripts and settings survive quit and relaunch.

## 5b. Themes (new)

- [ ] Settings → Theme shows three columns: Dark, Mid, Light, each card a small preview.
- [ ] Pick each of Slate, Plum, Dove, Clay: whole app, terminal text, buttons and the schedule day chips stay readable.
- [ ] Restart: the chosen theme is remembered.

## 6. Translations spot check (while here)

- [ ] In 3 languages you can read, open Settings → Privacy, the schedule dialog and Settings → General → Attention. Wording makes sense; no cut-off text.
- [ ] Russian, Ukrainian, Polish: the "1 minute / 2 hours" unit wording is acceptable (known plural weakness).

Dev builds (`npm run dev`): the dot works, but macOS notifications and the dock badge may not show unless "Electron" is allowed in System Settings → Notifications. Prefer the packaged app for those two.

## Not covered by automated tests

Packaged-app launch, macOS notification permission, dock badge, notification click focus, real translations on screen, Windows and Linux behaviour.
