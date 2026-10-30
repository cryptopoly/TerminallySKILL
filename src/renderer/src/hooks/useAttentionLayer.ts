import { useEffect } from 'react'
import {
  describeWorkflowAttention,
  focusAttentionSession,
  isUserWatchingSession,
  raiseAttention
} from '../lib/attention'
import { useAttentionStore } from '../store/attention-store'
import { useProjectStore } from '../store/project-store'
import { useTerminalStore } from '../store/terminal-store'
import { useWorkflowRunnerStore, type WorkflowRunStatus } from '../store/workflow-runner-store'

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
        raiseAttention(sessionId, alert.kind, alert.title, alert.body)
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
