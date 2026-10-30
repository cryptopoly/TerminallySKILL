---
title: Progress: schedule history and catch-up
status: done, not merged
---
# Schedule run history and optional catch-up (idea 7)

Branch: `feat/schedule-history` (from `integ/0.9.103`).

## What shipped
- **History per schedule** (last 20, newest first, stored in `schedules.json` as `history`): status `completed | failed | cancelled | skipped | missed | running`, trigger `schedule | catch-up`, optional reason (`no-window`, `not-runnable`, `busy`, `interrupted`) and the `runId`. Collapsible "History (n)" under each schedule in `ScheduleDialog.tsx`; a row with a run has an icon that jumps to Runs & Logs (`log-store.pendingRunId`, sidebar tab set to logs).
- **"Scheduled" tag** on runs in Runs & Logs (list and detail). `RunRecord.scheduleId` (optional, null for manual runs), set from `startRun({ scheduleId })`.
- **Catch-up** per schedule, `catchUp` (default false). Checkbox in the add form and on each schedule row.

## How catch-up decides
- Pure `findMissedRun(schedule, now)` in `shared/schedule-schema.ts`: enabled, has a stored `nextRunAt`, and it is not after `now`. It returns that one slot, never a count. Disabled, no stored time, or a clock moved back (next run still ahead) give nothing.
- At load (`schedule-manager.ts`): missed + catch-up off -> a `missed` history entry and `nextRunAt` moves forward (today's behaviour). Missed + catch-up on -> the schedule id is queued in memory and `nextRunAt` moves forward.
- Queued runs fire when a window's renderer calls `schedules:renderer-ready` (from `useScheduledRuns`, after it subscribed and the stores loaded). The first window to call takes the whole queue, so it is once per schedule, first window only. A schedule switched off or with catch-up off before then is dropped.
- The 20 s tick is unchanged. A slot that comes due with no window is still `skipped` (now also in history, reason `no-window`).

## Compatibility
Old `schedules.json` loads through `normalizeStoredSchedule`: `catchUp` false, `history` empty, malformed entries dropped. A `running` entry found at load (app quit mid-run) becomes `failed` / `interrupted`. `runs.json` records without `scheduleId` load as null.

## Tests
`schedule-schema.test.ts` (30), new `main/schedule-manager.test.ts` (8), e2e `attention-schedule.spec.mjs` "a missed run is recorded..." (relaunch with a hand-edited old-format file, UI history and jump). Strings: `en-additions.json` plus 18 locales (machine translated).

## Not covered
- Missed run when the app stays open but the machine sleeps: the tick still fires the overdue slot late, once, regardless of `catchUp` (unchanged).
- The jump finds the run only if its project is the active project (Runs & Logs lists per project).
- Ordinary tick delivery can still reach a window whose renderer has not finished loading (pre-existing, rare); only catch-up waits for ready.
- Translations not native-reviewed; the dialog intro still says missed runs are skipped (true unless catch-up is on).
