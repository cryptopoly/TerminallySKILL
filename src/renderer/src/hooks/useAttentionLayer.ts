import { useEffect } from 'react'
import { createReminderScheduler } from '../../../shared/attention-reminders'
import { i18n, resolveFormatLocale } from '../i18n'
import { isUserAway, isUserStopExitCode } from '../../../shared/attention'
import {
  describeWorkflowAttention,
  isUserAttending,
  setUserAway,
  focusAttentionSession,
  isUserWatchingSession,
  raiseAttention
} from '../lib/attention'
import { useAttentionStore } from '../store/attention-store'
import { useProjectStore } from '../store/project-store'
import { useSettingsStore } from '../store/settings-store'
import { useTerminalStore } from '../store/terminal-store'
import { useWorkflowRunnerStore, type WorkflowRunStatus } from '../store/workflow-runner-store'

function sendReminder(sessionId: string, minutes: number): void {
  const entry = useAttentionStore.getState().entries[sessionId]
  if (!entry) return
  const settings = useSettingsStore.getState().settings
  const duration = new Intl.NumberFormat(resolveFormatLocale(settings), {
    style: 'unit',
    unit: 'minute',
    unitDisplay: 'long'
  }).format(minutes)
  void window.electronAPI.notifyAttention({
    sessionId,
    title: i18n.t('attention.stillWaiting', { ns: 'terminal', duration }),
    body: entry.detail
  })
}

const IDLE_POLL_MS = 10_000
const ALERT_STATUSES: WorkflowRunStatus[] = ['awaiting_approval', 'completed', 'failed']

function clearWatchedEntries(): void {
  const { entries, clear } = useAttentionStore.getState()
  for (const sessionId of Object.keys(entries)) {
    if (isUserWatchingSession(sessionId)) clear(sessionId)
  }
}

/**
 * Connects the three attention sources (workflow state, window focus, tab selection) to the
 * tab dots, the dock badge and the OS notification click. Commands raise attention directly
 * from the terminal panel when their prompt returns.
 */
export function useAttentionLayer(): void {
  // Workflow runs: waiting for approval, finished, failed
  useEffect(() => {
    const lastStatus = new Map<string, WorkflowRunStatus>()
    return useWorkflowRunnerStore.subscribe((state) => {
      for (const [sessionId, run] of Object.entries(state.runsBySession)) {
        const previous = lastStatus.get(run.runId)
        if (previous === run.status) continue
        lastStatus.set(run.runId, run.status)
        if (!ALERT_STATUSES.includes(run.status)) continue
        const alert = describeWorkflowAttention(
          run.status as 'awaiting_approval' | 'completed' | 'failed',
          run.script.name
        )
        raiseAttention(sessionId, alert.kind, alert.title, alert.body, {
          notify: !run.steps.some((step) => isUserStopExitCode(step.exitCode))
        })
      }
    })
  }, [])

  // Looking at a terminal answers its alert
  useEffect(() => {
    const unsubscribeTerminals = useTerminalStore.subscribe(clearWatchedEntries)
    const unsubscribeProject = useProjectStore.subscribe(clearWatchedEntries)
    window.addEventListener('focus', clearWatchedEntries)
    return () => {
      unsubscribeTerminals()
      unsubscribeProject()
      window.removeEventListener('focus', clearWatchedEntries)
    }
  }, [])

  // Walked away with the window in front: after a while with no input, nobody is watching any terminal
  useEffect(() => {
    let away = false
    const check = async (): Promise<void> => {
      const nowAway = isUserAway(await window.electronAPI.getSystemIdleSeconds())
      if (nowAway === away) return
      away = nowAway
      setUserAway(nowAway)
      if (!nowAway) clearWatchedEntries()
    }
    const timer = setInterval(() => void check(), IDLE_POLL_MS)
    return () => {
      clearInterval(timer)
      setUserAway(false)
    }
  }, [])

  // Still waiting for a yes: remind at 10 and 30 minutes while the window is not in front
  useEffect(() => {
    const reminders = createReminderScheduler({
      shouldRemind: (sessionId, at) => {
        const entry = useAttentionStore.getState().entries[sessionId]
        return (
          entry?.kind === 'approval' &&
          entry.at === at &&
          !isUserAttending() &&
          useSettingsStore.getState().settings.attentionAlerts
        )
      },
      remind: sendReminder
    })
    const unsubscribe = useAttentionStore.subscribe((state, previous) => {
      for (const sessionId of Object.keys(previous.entries)) {
        if (!(sessionId in state.entries)) reminders.cancel(sessionId)
      }
      for (const [sessionId, entry] of Object.entries(state.entries)) {
        if (entry.kind === 'approval') reminders.schedule(sessionId, entry.at)
        else reminders.cancel(sessionId)
      }
    })
    return () => {
      unsubscribe()
      reminders.cancelAll()
    }
  }, [])

  // Dock / launcher badge counts terminals that need the user
  useEffect(() => {
    let last = -1
    return useAttentionStore.subscribe((state) => {
      const count = Object.keys(state.entries).length
      if (count === last) return
      last = count
      void window.electronAPI.setAttentionBadge(count)
    })
  }, [])

  // Clicking the OS notification opens the terminal that raised it
  useEffect(() => {
    return window.electronAPI.onAttentionFocusSession((sessionId) => {
      focusAttentionSession(sessionId)
    })
  }, [])

  // A closed terminal cannot need attention
  useEffect(() => {
    return useTerminalStore.subscribe((state) => {
      const open = new Set(state.sessions.map((session) => session.id))
      const { entries, clear } = useAttentionStore.getState()
      for (const sessionId of Object.keys(entries)) {
        if (!open.has(sessionId)) clear(sessionId)
      }
    })
  }, [])
}
