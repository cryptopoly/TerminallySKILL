import type { IDisposable, Terminal } from '@xterm/xterm'
import { i18n } from '../i18n'
import {
  OSC_7501_SUPPORT_REPLY,
  parseOsc7501,
  parseOsc7501Activity,
  parseOsc777,
  parseOsc9,
  sanitizeAgentText,
  type AgentSignal
} from '../../../shared/agent-status'
import { matchApprovalPrompt } from '../../../shared/agent-prompts'
import type { AttentionKind } from '../../../shared/attention'
import {
  QUIET_CHECK_INTERVAL_MS,
  resolveQuietMs,
  shouldCheckQuietTerminal,
  shouldRaiseForBell
} from '../../../shared/quiet-terminal'
import { maskSecrets } from '../../../shared/secret-mask'
import { useAttentionStore } from '../store/attention-store'
import { useSettingsStore } from '../store/settings-store'
import { useTerminalStore } from '../store/terminal-store'
import { isUserWatchingSession, raiseAttention } from './attention'

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

/**
 * Rate-limited, and an agent that sends the same alert twice (say OSC 7501 `blocked` and then its
 * own bell for the same question) gets one dot and one notification, not two.
 */
function raiseAgentAlert(sessionId: string, kind: AttentionKind, title: string, body: string): void {
  const now = Date.now()
  if (now - (lastAlertAt.get(sessionId) ?? 0) < MIN_INTERVAL_MS) return
  if (useAttentionStore.getState().entries[sessionId]?.kind === kind) return
  lastAlertAt.set(sessionId, now)
  raiseAttention(sessionId, kind, title, body)
}

function handleSignal(sessionId: string, signal: AgentSignal | null): void {
  if (!signal) return
  if (!useSettingsStore.getState().settings.attentionAlerts) return

  if (signal.type === 'query') {
    // Only claim support while alerts are on, so the program keeps its own fallback otherwise.
    window.electronAPI.writeToTerminal(sessionId, OSC_7501_SUPPORT_REPLY)
    return
  }

  raiseAgentAlert(sessionId, signal.kind, titleFor(signal), signal.body)
}

/** The visible screen, one string per row. Read only to find an approval prompt; never logged. */
function readScreen(term: Terminal): string[] {
  const buffer = term.buffer.active
  const lines: string[] = []
  for (let row = 0; row < term.rows; row++) {
    lines.push(buffer.getLine(buffer.viewportY + row)?.translateToString(true) ?? '')
  }
  return lines
}

/** An approval prompt on screen, as notification text: secrets masked, plain, one short line. */
function describeApprovalPrompt(term: Terminal): string | null {
  const match = matchApprovalPrompt(readScreen(term))
  if (!match) return null
  // The prompt line itself, not the tool name: some rows overlap, and the line says what is asked.
  return sanitizeAgentText(maskSecrets(match.line).text.replace(/[│╭╮╰╯─❯]/g, ' ')) || null
}

function sessionActivity(sessionId: string) {
  const terminals = useTerminalStore.getState()
  return {
    shellBusy: Boolean(terminals.busySessionIds[sessionId]),
    agentActivity: terminals.agentActivityBySession[sessionId] ?? null
  }
}

function handleBell(term: Terminal, sessionId: string): void {
  if (!useSettingsStore.getState().settings.attentionAlerts) return
  if (!shouldRaiseForBell({ ...sessionActivity(sessionId), watched: isUserWatchingSession(sessionId) })) return
  const prompt = describeApprovalPrompt(term)
  if (prompt) {
    raiseAgentAlert(sessionId, 'approval', i18n.t('attention.waitingForYes', { ns: 'terminal' }), prompt)
  } else {
    raiseAgentAlert(sessionId, 'approval', i18n.t('attention.agentNotify', { ns: 'terminal' }), i18n.t('attention.bell', { ns: 'terminal' }))
  }
}

/**
 * Quiet-terminal check for any program: busy, unwatched and silent for 20 seconds. A prompt on
 * screen asking for a yes raises "needs you" (dot and notification); anything else only turns the
 * tab dot grey (idle), with no notification and no dock badge.
 */
function watchForQuiet(term: Terminal, sessionId: string): IDisposable[] {
  const quietMs = resolveQuietMs(window.electronAPI.attentionQuietMsOverride)
  let lastOutputAt = Date.now()

  const output = term.onWriteParsed(() => {
    lastOutputAt = Date.now()
    if (useTerminalStore.getState().quietSessionIds[sessionId]) {
      useTerminalStore.getState().setSessionQuiet(sessionId, false)
    }
  })

  const timer = window.setInterval(() => {
    if (!useSettingsStore.getState().settings.attentionAlerts) return
    const terminals = useTerminalStore.getState()
    const due = shouldCheckQuietTerminal({
      ...sessionActivity(sessionId),
      watched: isUserWatchingSession(sessionId),
      hasEntry: sessionId in useAttentionStore.getState().entries,
      alreadyQuiet: Boolean(terminals.quietSessionIds[sessionId]),
      lastOutputAt,
      now: Date.now(),
      quietMs
    })
    if (!due) return
    terminals.setSessionQuiet(sessionId, true)
    const prompt = describeApprovalPrompt(term)
    if (prompt) raiseAgentAlert(sessionId, 'approval', i18n.t('attention.waitingForYes', { ns: 'terminal' }), prompt)
  }, Math.min(QUIET_CHECK_INTERVAL_MS, quietMs))

  return [output, { dispose: () => window.clearInterval(timer) }]
}

/**
 * Let any program in this terminal (Claude Code, Codex, Gemini CLI, Aider, a script) raise the tab
 * dot and the notification: through OSC 9, OSC 777;notify and OSC 7501 (the handlers claim the
 * sequence, so nothing is drawn for it), the bell, or by going quiet at an approval prompt.
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
    term.onBell(() => handleBell(term, sessionId)),
    ...watchForQuiet(term, sessionId),
    { dispose: () => lastAlertAt.delete(sessionId) }
  ]
}
