# Cycle projects shortcut

Branch: `feat/cycle-projects-shortcut` (from `origin/staging`). Decision 11d.

## Done

- macOS Cmd+Option+Down / Up = next / previous project. Windows and Linux Ctrl+Alt+PageDown / PageUp.
- Pure helpers in `src/renderer/src/lib/project-order.ts` (sort, group, flat picker order, `cycleProject`, key matcher, shortcut label) with tests in `project-order.test.ts`. `ProjectSelector.tsx` now uses the same sort/group helpers, so the picker and the shortcut cannot drift apart.
- `src/renderer/src/hooks/useProjectCycleShortcut.ts`: capture-phase window listener (preventDefault + stopPropagation, so the focused xterm never sees the key). Switching does what the picker does: `window.electronAPI.setActiveProject(id)` then the project store. Layout hydration is not done by the picker either; AppShell reacts to the active project change.
- AppShell diff is 2 lines (import + `useProjectCycleShortcut()` next to `useAttentionLayer()`), to avoid conflicts with `feat/terminal-maximise-dots`.
- Command palette: "Next project" / "Previous project" with the shortcut in the description (symbols on macOS: ⌘⌥↓ / ⌘⌥↑, "Ctrl+Alt+PageDown" elsewhere).
- Help guide keyboard list: new `cycleProjects` entry.
- Strings added to `en-additions.json` and all 18 locales (machine translated).
- E2E: `tests/e2e/project-cycle-shortcut.spec.mjs` (two projects, terminal focused, next / next / previous).

## Notes

- Order is the picker order with no search and all groups expanded (collapsed groups in the open picker are ignored by the shortcut). Active project missing from the list goes to the first project; one or zero projects is a no-op.
- The order depends on open terminals and `lastOpenedAt` from the renderer store (which is not refreshed on switch), so it stays stable while cycling; it can change after a reload.
- No existing handler uses Alt with these keys. xterm has no custom key handler, so no pass-through was needed.

## Tested

`npm run test:ci` (459 unit tests, typecheck, i18n check, build) green; full `npx playwright test` 22 passed, 6 skipped (ssh/packaged, as before).

## Not tested

Windows/Linux key path only unit-tested (matcher), not run in a real e2e on those platforms. Translations not reviewed by a native speaker.
