/**
 * Repeat reminders for a terminal that still waits for a yes: one OS notification 10 minutes after
 * the first, one more at 30 minutes, then nothing. Cleared as soon as the entry is cleared.
 */
export const REMINDER_DELAYS_MS = [10 * 60_000, 30 * 60_000] as const

type TimerId = ReturnType<typeof setTimeout>

export interface ReminderScheduler {
  /** Start reminders for this entry (`at` identifies it); a different `at` replaces the old ones. */
  schedule: (sessionId: string, at: string) => void
  cancel: (sessionId: string) => void
  cancelAll: () => void
}

export function createReminderScheduler(options: {
  /** Whether the same entry is still waiting and the window is still not in front */
  shouldRemind: (sessionId: string, at: string) => boolean
  remind: (sessionId: string, minutes: number) => void
  delaysMs?: readonly number[]
  setTimer?: (callback: () => void, ms: number) => TimerId
  clearTimer?: (id: TimerId) => void
}): ReminderScheduler {
  const delays = options.delaysMs ?? REMINDER_DELAYS_MS
  const setTimer = options.setTimer ?? ((callback, ms) => setTimeout(callback, ms))
  const clearTimer = options.clearTimer ?? ((id) => clearTimeout(id))
  const active = new Map<string, { at: string; timers: TimerId[] }>()

  const cancel = (sessionId: string): void => {
    const current = active.get(sessionId)
    if (!current) return
    for (const timer of current.timers) clearTimer(timer)
    active.delete(sessionId)
  }

  return {
    schedule(sessionId, at) {
      if (active.get(sessionId)?.at === at) return
      cancel(sessionId)
      const timers = delays.map((delay) =>
        setTimer(() => {
          if (options.shouldRemind(sessionId, at)) options.remind(sessionId, Math.round(delay / 60_000))
        }, delay)
      )
      active.set(sessionId, { at, timers })
    },
    cancel,
    cancelAll() {
      for (const sessionId of [...active.keys()]) cancel(sessionId)
    }
  }
}
