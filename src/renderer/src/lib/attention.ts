import { i18n } from '../i18n'
import {
  attentionKindForExit,
  isUserStopExitCode,
  pickNextAttentionSession,
  shouldRaiseCommandAttention,
  type AttentionKind
} from '../../../shared/attention'
import { isTerminalRunStatus, useWorkflowRunnerStore } from '../store/workflow-runner-store'
import { useAttentionStore } from '../store/attention-store'
import { useProjectStore } from '../store/project-store'
import { useSettingsStore } from '../store/settings-store'
import { resolveWatchedSessionId, useTerminalStore } from '../store/terminal-store'

const MAX_BODY_LENGTH = 140

function truncate(text: string): string {
  const singleLine = text.replace(/\s+/g, ' ').trim()
  return singleLine.length > MAX_BODY_LENGTH ? `${singleLine.slice(0, MAX_BODY_LENGTH - 1)}…` : singleLine
}

let userAway = false

export function setUserAway(away: boolean): void {
  userAway = away
}

/** The window is in front and someone is at the keyboard. */
export function isUserAttending(): boolean {
  return document.hasFocus() && !userAway
}

/** True when the user is already working in this terminal, so an alert would only repeat what is on screen. */
export function isUserWatchingSession(sessionId: string): boolean {
  if (!isUserAttending()) return false
  const { sessions, activeSessionId, splitSessionId, focusedPane, terminalVisible } = useTerminalStore.getState()
  if (!terminalVisible) return false
  const projectId = useProjectStore.getState().activeProject?.id ?? null
  return sessionId === resolveWatchedSessionId(sessions, projectId, activeSessionId, splitSessionId, focusedPane)
}

export function raiseAttention(
  sessionId: string,
  kind: AttentionKind,
  title: string,
  body: string,
  options: { notify?: boolean } = {}
): void {
  if (!useSettingsStore.getState().settings.attentionAlerts) return
  if (isUserWatchingSession(sessionId)) return

  useAttentionStore.getState().raise(sessionId, {
    kind,
    detail: body ? `${title}: ${body}` : title,
    at: new Date().toISOString()
  })

  // Inside the app the tab dot is enough. The OS notification is for when nobody is looking at it.
  if (options.notify !== false && !isUserAttending()) {
    void window.electronAPI.notifyAttention({ sessionId, title, body })
  }
}

/** Show a terminal, switching project first if it belongs to another one. */
export function focusAttentionSession(sessionId: string): boolean {
  const terminals = useTerminalStore.getState()
  const session = terminals.sessions.find((entry) => entry.id === sessionId)
  if (!session) return false

  const projects = useProjectStore.getState()
  if (session.projectId && projects.activeProject?.id !== session.projectId) {
    const project = projects.projects.find((entry) => entry.id === session.projectId)
    if (project) {
      void window.electronAPI.setActiveProject(project.id)
      projects.setActiveProject(project)
    }
  }
  terminals.setActiveSession(sessionId)
  terminals.setTerminalVisible(true)
  return true
}

/** Jump to the terminal that has waited longest for the user (any project) and clear its dot. */
export function jumpToNextAttention(): boolean {
  const { entries, clear } = useAttentionStore.getState()
  const open = useTerminalStore.getState().sessions.map((session) => session.id)
  const sessionId = pickNextAttentionSession(entries, open)
  if (!sessionId) return false
  clear(sessionId)
  return focusAttentionSession(sessionId)
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
  raiseAttention(params.sessionId, kind, title, truncate(params.command), {
    notify: !isUserStopExitCode(params.exitCode)
  })
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
