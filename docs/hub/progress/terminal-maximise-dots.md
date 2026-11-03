---
title: Maximise terminal and status dots (11a, 11b)
status: in review
---
# Progress: maximise terminal and status dots

Updated: 2026-10-31. Owner: agent. Branch: `feat/terminal-maximise-dots` (from `staging`, pushed, no PR).

## Goal

[Decisions](../decisions.md) items 11a and 11b: a maximise toggle for the docked terminal, and more tab dots (running, needs you) with a legend, not relying on colour alone.

## Done

- **Maximise (11a).** Button in the terminal tab bar beside the split buttons (`Maximize2`/`Minimize2`, tooltip, `aria-label`, `aria-pressed`), palette entry ("Maximise terminal" / "Restore terminal size", only when the project has a terminal), shortcut `Cmd+Shift+M` (macOS) / `Ctrl+Shift+M`, capture phase so the shell does not get it. It collapses the project view panel; the same toggle restores the old split. Not saved: lives in the terminal store, resets on restart, not per project. The saved `terminalSize` is never overwritten while maximised. Hiding the terminal (minimise, `Cmd+/`, the chevron) ends maximise, so showing it again brings back the normal split. Side effect: dragging the divider to the very top now snaps to maximised (the panel is collapsible), and dragging back out restores.
- **Dots (11b).** Five styles, each with its own shape or motion:
  - Running: orange ring with a gap, spinning. Shown from the first second while shell integration marks the terminal busy, or while an agent reports OSC 7501 `state=working`. If an agent reports any other state while its command runs, the agent wins, so an open but quiet agent does not look busy. Never raises a notification or counts on the dock badge (it is not an attention entry). Not a live region (`role="img"`), so screen readers are not told about every command.
  - Needs you: yellow dot with a halo, pulsing (was amber).
  - Finished: solid green dot.
  - Failed: red dot with a cross.
  - Idle agent: still grey ring. Style and legend row only; nothing sets it yet (comes with agent notifications, 11c).
  - Finished, failed and needs-you always win over running. Running cannot stick: it clears on command end, on shell exit and on tab close; agent state is cleared with it.
  - Respects `prefers-reduced-motion` (no spin or pulse; ring and halo still differ).
  - Tooltip and `aria-label`: "State · detail", translated (e.g. "Failed · Command failed (exit 1): npm test").
  - Legend: new "Terminal tab dots" section in the help guide with the real dots; `Cmd+Shift+M` added to the keyboard section.
  - Dots only show while attention alerts are on (the setting), as before.
- Strings: 8 terminal + 13 onboarding keys in English and 17 other locales (machine-written; add to the native-review list, item 3).
- Tests: unit tests for `resolveTabDotState`, `parseOsc7501Activity`, store clean-up and maximise reset; new e2e `tests/e2e/terminal-maximise-dots.spec.mjs` (running dot within 2 s, agent idle override, maximise via button, shortcut and palette, hide/show restores, saved size unchanged, screenshots). Two existing e2e selectors updated for the new tooltip text.

## Colours per theme

Semantic tokens `--dot-running`, `--dot-needs-you`, `--dot-needs-you-edge`, `--dot-finished`, `--dot-failed`, `--dot-idle` in `global.css`, tuned per theme so no dot reuses the theme accent. Light themes give yellow a dark edge because yellow cannot reach 3:1 on a pale background. Measured (WCAG contrast against the tab bar and active tab, lower of the two; CIEDE2000 distance from accent and accent-light, lower of the two; distance between dots; needs-you uses its edge for contrast and its fill for distance):

| Theme | Contrast run / needs / fin / fail / idle | ΔE from accent run / needs / fin / fail | ΔE run-needs / run-fail / needs-fail |
|---|---|---|---|
| void | 7.8 / 11.6 / 7.8 / 4.7 / 6.9 | 49 / 48 / 37 / 69 | 24 / 25 / 49 |
| ember | 4.2 / 9.1 / 5.3 / 4.5 / 4.7 | 15 / 21 / 46 / 32 | 43 / 18 / 54 |
| dusk | 5.5 / 8.1 / 5.5 / 3.3 / 4.8 | 46 / 56 / 48 / 42 | 24 / 25 / 49 |
| forest | 7.4 / 10.9 / 14.7 / 4.4 / 6.5 | 53 / 35 / 20 / 76 | 24 / 25 / 49 |
| slate | 3.8 / 5.7 / 5.0 / 3.2 / 5.9 | 51 / 58 / 45 / 49 | 24 / 29 / 51 |
| plum | 4.2 / 6.2 / 5.4 / 3.4 / 6.4 | 50 / 71 / 54 / 30 | 24 / 24 / 47 |
| chalk | 3.5 / 7.8 / 4.5 / 5.7 / 4.3 | 11 / 38 / 58 / 19 | 31 / 32 / 61 |
| sand | 3.9 / 6.6 / 3.8 / 4.8 / 3.6 | 16 / 33 / 35 / 27 | 45 / 19 / 61 |
| stone | 3.5 / 5.9 / 3.8 / 4.3 / 3.3 | 44 / 37 / 11 / 52 | 45 / 19 / 61 |
| mist | 4.4 / 7.4 / 4.3 / 5.4 / 4.1 | 50 / 41 / 18 / 58 | 45 / 19 / 61 |
| dove | 3.8 / 4.5 / 3.7 / 4.1 / 5.3 | 46 / 67 / 49 / 34 | 52 / 23 / 70 |
| clay | 3.7 / 4.4 / 3.6 / 4.0 / 5.3 | 53 / 42 / 17 / 65 | 52 / 23 / 60 |

Every dot is at 3:1 or more. The closest calls: chalk running vs its copper accent (ΔE 11) and stone finished vs its olive accent (ΔE 11); running vs failed on ember, sand, stone and mist (ΔE 18 to 19). In each case the shape differs (ring vs dot with a cross), and the accent is used for text and icons, not dots. Before this change, green and red on dove and clay were 1.1 to 1.9:1, and forest's green accent was identical to the finished dot.

Screenshots of all five styles on all 12 themes, the real tabs on void, chalk, plum and dove, the legend and the maximised state come from the e2e spec (set `TERMINALLYSKILL_SCREENSHOT_DIR` to keep them).

## Not done / not tested

- Real `Cmd+K` and `Cmd+I` key presses in the e2e: Playwright's Meta+K/Meta+I do not reach the page in Electron on macOS, so the spec sends the keydown event directly. `Cmd+Shift+M` was pressed for real.
- Real Claude Code or Codex sessions (paid). The OSC 7501 `working`/`idle` path is tested with `printf`.
- Windows and Linux; packaged app; right-to-left layout of the legend (Arabic).
- Screen reader check of the dots.
- Idle-agent state is not wired (by design, 11c).

## How to resume

1. `git checkout feat/terminal-maximise-dots` in a worktree, `npm ci`.
2. `npm run test:ci`, `npm run test:e2e`.
3. Next: Dan reviews the screenshots, then a PR into `staging`.

## Decisions to propose

- **Drag snaps to maximised.** Dragging the divider to the top now maximises. Recommend keep: it matches the toggle and the button state follows it.
- **Agent state wins over shell busy.** While Claude Code is open the shell is busy the whole time; with this rule the dot shows running only while the agent says `working`. Recommend keep.
- **Dots follow the attention-alerts setting.** With alerts off, no running dot either. Recommend keep: one switch for all dots.
- **Palette entry only when the project has a terminal.** Recommend keep.
