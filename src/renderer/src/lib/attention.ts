import { i18n } from '../i18n'
import {
  attentionKindForExit,
  shouldRaiseCommandAttention,
  type AttentionKind
} from '../../../shared/attention'
import { isTerminalRunStatus, useWorkflowRunnerStore } from '../store/workflow-runner-store'
import { useAttentionStore } from '../store/attention-store'
import { useProjectStore } from '../store/project-store'
import { useSettingsStore } from '../store/settings-store'
import { useTerminalStore } from '../store/terminal-store'

const MAX_BODY_LENGTH = 140

function truncate(text: string): string {
  const singleLine = text.replace(/\s+/g, ' ').trim()
  return singleLine.length > MAX_BODY_LENGTH ? `${singleLine.slice(0, MAX_BODY_LENGTH - 1)}…` : singleLine
}

/** True when the user can already see this terminal, so an alert would only repeat what is on screen. */
export function isUserWatchingSession(sessionId: string): boolean {
  if (!document.hasFocus()) return false
  const { sessions, activeSessionId, splitSessionId, terminalVisible } = useTerminalStore.getState()
  if (!terminalVisible) return false
  if (sessionId !== activeSessionId && sessionId !== splitSessionId) return false
  const session = sessions.find((entry) => entry.id === sessionId)
  return (session?.projectId ?? null) === (useProjectStore.getState().activeProject?.id ?? null)
}

export function raiseAttention(sessionId: string, kind: AttentionKind, title: string, body: string): void {
  if (!useSettingsStore.getState().settings.attentionAlerts) return
  if (isUserWatchingSession(sessionId)) return

  useAttentionStore.getState().raise(sessionId, {
    kind,
    detail: body ? `${title}: ${body}` : title,
    at: new Date().toISOString()
  })

  // Inside the app the tab dot is enough. The OS notification is for when the window is not in front.
  if (!document.hasFocus()) {
    void window.electronAPI.notifyAttention({ sessionId, title, body })
  }
}

export function raiseCommandAttention(params: {
  sessionId: string
  command: string
  startedAt: string
  completedAt: string
  exitCode: number | null
}): void {
  const { settings } = useSettingsStore.getState()
  if (!settings.attentionAlerts) return

  // A running workflow reports its own progress; its individual steps would only add noise.
  const run = useWorkflowRunnerStore.getState().runsBySession[params.sessionId]
  if (run && !isTerminalRunStatus(run.status)) return

  const shouldRaise = shouldRaiseCommandAttention({
    startedAt: params.startedAt,
    completedAt: params.completedAt,
    minSeconds: settings.attentionMinSeconds,
    userIsWatching: isUserWatchingSession(params.sessionId)
  })
  if (!shouldRaise) return

  const kind = attentionKindForExit(params.exitCode)
  const title =
    kind === 'failed'
      ? i18n.t('attention.failed', { ns: 'terminal', code: params.exitCode })
      : i18n.t('attention.finished', { ns: 'terminal' })
  raiseAttention(params.sessionId, kind, title, truncate(params.command))
}

export function describeWorkflowAttention(
  status: 'awaiting_approval' | 'completed' | 'failed',
  scriptName: string
): { kind: AttentionKind; title: string; body: string } {
  if (status === 'awaiting_approval') {
    return { kind: 'approval', title: i18n.t('attention.approval', { ns: 'terminal' }), body: truncate(scriptName) }
  }
  if (status === 'failed') {
    return { kind: 'failed', title: i18n.t('attention.workflowFailed', { ns: 'terminal' }), body: truncate(scriptName) }
  }
  return { kind: 'finished', title: i18n.t('attention.workflowDone', { ns: 'terminal' }), body: truncate(scriptName) }
}
