import type { IDisposable, Terminal } from '@xterm/xterm'
import { i18n } from '../i18n'
import {
  OSC_7501_SUPPORT_REPLY,
  parseOsc7501,
  parseOsc7501Activity,
  parseOsc777,
  parseOsc9,
  type AgentSignal
} from '../../../shared/agent-status'
import { useSettingsStore } from '../store/settings-store'
import { useTerminalStore } from '../store/terminal-store'
import { raiseAttention } from './attention'

/** A program printing these in a loop must not flood the notification centre. */
const MIN_INTERVAL_MS = 1000
const lastAlertAt = new Map<string, number>()

function titleFor(signal: Extract<AgentSignal, { type: 'alert' }>): string {
  if (signal.title) return signal.title
  if (signal.source === 'notify') return i18n.t('attention.agentNotify', { ns: 'terminal' })
  if (signal.kind === 'failed') return i18n.t('attention.agentError', { ns: 'terminal' })
  if (signal.kind === 'finished') return i18n.t('attention.agentDone', { ns: 'terminal' })
  return i18n.t('attention.agentBlocked', { ns: 'terminal' })
}

function handleSignal(sessionId: string, signal: AgentSignal | null): void {
  if (!signal) return
  if (!useSettingsStore.getState().settings.attentionAlerts) return

  if (signal.type === 'query') {
    // Only claim support while alerts are on, so the program keeps its own fallback otherwise.
    window.electronAPI.writeToTerminal(sessionId, OSC_7501_SUPPORT_REPLY)
    return
  }

  const now = Date.now()
  if (now - (lastAlertAt.get(sessionId) ?? 0) < MIN_INTERVAL_MS) return
  lastAlertAt.set(sessionId, now)
  raiseAttention(sessionId, signal.kind, titleFor(signal), signal.body)
}

/**
 * Let programs in this terminal (Claude Code, Codex and others) raise the tab dot and the
 * notification through OSC 9, OSC 777;notify and OSC 7501. The handlers claim the sequence,
 * so nothing is drawn for it.
 */
export function registerAgentAttention(term: Terminal, sessionId: string): IDisposable[] {
  return [
    term.parser.registerOscHandler(9, (data) => {
      handleSignal(sessionId, parseOsc9(data))
      return true
    }),
    term.parser.registerOscHandler(777, (data) => {
      handleSignal(sessionId, parseOsc777(data))
      return true
    }),
    term.parser.registerOscHandler(7501, (data) => {
      // Working or not drives the running dot only; it never notifies or counts on the dock badge.
      const activity = parseOsc7501Activity(data)
      if (activity) useTerminalStore.getState().setAgentActivity(sessionId, activity)
      handleSignal(sessionId, parseOsc7501(data))
      return true
    }),
    { dispose: () => lastAlertAt.delete(sessionId) }
  ]
}
