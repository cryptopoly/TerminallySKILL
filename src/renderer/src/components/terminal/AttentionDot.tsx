import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { resolveTabDotState, type TabDotState } from '../../../../shared/attention'
import { useAttentionStore } from '../../store/attention-store'
import { useSettingsStore } from '../../store/settings-store'
import { useTerminalStore } from '../../store/terminal-store'

const LABEL_KEYS: Record<TabDotState, string> = {
  running: 'dot.running',
  approval: 'dot.needsYou',
  finished: 'dot.finished',
  failed: 'dot.failed',
  idle: 'dot.idle'
}

export type DotStyle = TabDotState

/** The dot itself, shared by the tab and the legend in the help guide. Shape differs per state. */
export function TabStatusDot({ state }: { state: DotStyle }): JSX.Element {
  if (state === 'failed') {
    return (
      <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" className="shrink-0">
        <circle cx="5" cy="5" r="5" fill="var(--dot-failed)" />
        <path d="M3.2 3.2 6.8 6.8M6.8 3.2 3.2 6.8" stroke="var(--surface)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'inline-block h-2 w-2 shrink-0 rounded-full',
        state === 'finished' && 'tv-dot-finished',
        state === 'approval' && 'tv-dot-needs-you',
        state === 'running' && 'tv-dot-running',
        state === 'idle' && 'tv-dot-idle'
      )}
    />
  )
}

/**
 * Status dot on a terminal tab: orange spinning ring while running, pulsing yellow when it needs
 * you, solid green finished, red with a cross failed, still grey ring when a program is open but
 * quiet. Waiting states always win over running and idle.
 */
export function AttentionDot({ sessionId }: { sessionId: string }): JSX.Element | null {
  const { t } = useTranslation('terminal')
  const entry = useAttentionStore((state) => state.entries[sessionId])
  const shellBusy = useTerminalStore((state) => Boolean(state.busySessionIds[sessionId]))
  const agentActivity = useTerminalStore((state) => state.agentActivityBySession[sessionId])
  const quiet = useTerminalStore((state) => Boolean(state.quietSessionIds[sessionId]))
  const alertsOn = useSettingsStore((state) => state.settings.attentionAlerts)

  const dotState = resolveTabDotState({
    entry,
    shellBusy: alertsOn && shellBusy,
    agentActivity: alertsOn ? agentActivity : null,
    quiet
  })
  if (!dotState) return null

  const stateLabel = t(LABEL_KEYS[dotState])
  const label = entry?.detail ? t('dot.tooltip', { state: stateLabel, detail: entry.detail }) : stateLabel

  return (
    <span
      // Running and idle change with every command, so they are not live regions; the waiting states are.
      role={dotState === 'running' || dotState === 'idle' ? 'img' : 'status'}
      data-dot-state={dotState}
      title={label}
      aria-label={label}
      className="inline-flex shrink-0"
    >
      <TabStatusDot state={dotState} />
    </span>
  )
}
