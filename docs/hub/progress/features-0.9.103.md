---
title: Progress: attention, schedules, privacy
status: in progress
---
# Progress: attention layer, scheduled workflows, privacy panel

Updated: 2026-10-29. Owner: Claude. Branch: `feat/0.9.103-attention-schedule-privacy` (on top of `chore/deps-and-hub-0.9.103`).

## Goal

Ship three new, visible features in 0.9.103 without adding toolbar clutter.

## Done

- **Attention.** `src/shared/attention.ts` (rules), `src/renderer/src/lib/attention.ts` (raise), `store/attention-store.ts`, `hooks/useAttentionLayer.ts` (workflow events, focus clearing, dock badge, notification click), `components/terminal/AttentionDot.tsx`, `src/main/attention-manager.ts`. Commands raise from `TerminalPanel.tsx` when the prompt returns.
- **Schedules.** `src/shared/schedule-schema.ts` (pure next-run logic, tested), `src/main/schedule-manager.ts` (store `schedules.json`, 20 s tick), `hooks/useScheduledRuns.ts`, `components/scripts/ScheduleDialog.tsx`, icon in `ScriptEditor.tsx`, badge in `ScriptList.tsx`.
- **Privacy.** `src/main/network-log.ts` (host only, 100 entries, memory), recorded from `ai-fetch.ts`, `update-manager.ts` and the Electron session hook in `index.ts`; `components/settings/PrivacyTab.tsx`.
- Strings in `en-additions.json` plus 18 locales. Tests: `attention.test.ts`, `schedule-schema.test.ts`, `network-log.test.ts`, `tests/e2e/attention-schedule.spec.mjs`.

## Not done

- Not hand-tested in a packaged build (macOS notification permission, dock badge).
- Not merged, not released, version still 0.9.102.
- Translations not native-reviewed. Plural-sensitive unit words in ru, uk, pl use a fixed form.

## How to resume

- `git checkout feat/0.9.103-attention-schedule-privacy`, then `npm run test:ci` and `npm run test:e2e`.
- Force a due schedule in a test: send `schedules:due` from the main process (see the e2e spec).
