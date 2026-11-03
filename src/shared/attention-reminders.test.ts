import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createReminderScheduler, REMINDER_DELAYS_MS } from './attention-reminders'

describe('createReminderScheduler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('reminds once at 10 minutes and once at 30, then never again', () => {
    const remind = vi.fn()
    const scheduler = createReminderScheduler({ shouldRemind: () => true, remind })
    scheduler.schedule('a', 't1')

    vi.advanceTimersByTime(10 * 60_000 - 1)
    expect(remind).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(remind).toHaveBeenLastCalledWith('a', 10)
    vi.advanceTimersByTime(20 * 60_000)
    expect(remind).toHaveBeenLastCalledWith('a', 30)
    vi.advanceTimersByTime(24 * 60 * 60_000)
    expect(remind).toHaveBeenCalledTimes(REMINDER_DELAYS_MS.length)
  })

  it('stops when the entry is cleared', () => {
    const remind = vi.fn()
    const scheduler = createReminderScheduler({ shouldRemind: () => true, remind })
    scheduler.schedule('a', 't1')
    scheduler.cancel('a')
    vi.advanceTimersByTime(60 * 60_000)
    expect(remind).not.toHaveBeenCalled()
  })

  it('skips a reminder while the window is in front or the entry changed', () => {
    const remind = vi.fn()
    let waiting = false
    const scheduler = createReminderScheduler({ shouldRemind: () => waiting, remind })
    scheduler.schedule('a', 't1')
    vi.advanceTimersByTime(10 * 60_000)
    expect(remind).not.toHaveBeenCalled()
    waiting = true
    vi.advanceTimersByTime(20 * 60_000)
    expect(remind).toHaveBeenCalledOnce()
  })

  it('does not restart for the same entry, and restarts for a new one', () => {
    const remind = vi.fn()
    const scheduler = createReminderScheduler({ shouldRemind: () => true, remind })
    scheduler.schedule('a', 't1')
    vi.advanceTimersByTime(5 * 60_000)
    scheduler.schedule('a', 't1')
    vi.advanceTimersByTime(5 * 60_000)
    expect(remind).toHaveBeenCalledOnce()
    scheduler.schedule('a', 't2')
    vi.advanceTimersByTime(10 * 60_000)
    expect(remind).toHaveBeenCalledTimes(2)
    scheduler.cancelAll()
    vi.advanceTimersByTime(60 * 60_000)
    expect(remind).toHaveBeenCalledTimes(2)
  })
})
