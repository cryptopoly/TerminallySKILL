import { useEffect, useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useRunScript } from '../../hooks/useRunScript'
import {
  Terminal,
  Play,
  FolderOpen,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Clock,
  ScrollText,
  TerminalSquare,
  AlertCircle
} from 'lucide-react'
import clsx from 'clsx'
import { useProjectStore } from '../../store/project-store'
import { useTerminalStore } from '../../store/terminal-store'
import { useScriptStore } from '../../store/script-store'
import { useCommandStore } from '../../store/command-store'
import { useSettingsStore } from '../../store/settings-store'
import { isTerminalRunStatus, useWorkflowRunnerStore } from '../../store/workflow-runner-store'
import type { RunRecord } from '../../../../shared/run-schema'
import type { Script } from '../../../../shared/script-schema'
import { resolveProjectWorkingDirectory } from '../../../../shared/project-schema'
import { formatDate } from '../../i18n/format'
import { resolveFormatLocale } from '../../i18n'

interface DashboardProps {
  onNewTerminal: () => void
  onShowInfo: (section?: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string, locale: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
  if (diff < 60_000) return rtf.format(0, 'second')
  if (diff < 3_600_000) return rtf.format(-Math.floor(diff / 60_000), 'minute')
  if (diff < 86_400_000) return rtf.format(-Math.floor(diff / 3_600_000), 'hour')
  if (diff < 604_800_000) return rtf.format(-Math.floor(diff / 86_400_000), 'day')
  return ''
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return '...'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return '<1s'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const remaining = s % 60
  if (m < 60) return `${m}m ${remaining}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function statusIcon(status: string): JSX.Element {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={14} className="text-safe shrink-0" />
    case 'failed':
      return <XCircle size={14} className="text-destructive shrink-0" />
    case 'cancelled':
      return <AlertCircle size={14} className="text-gray-500 shrink-0" />
    default:
      return <Loader2 size={14} className="text-accent-light animate-spin shrink-0" />
  }
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function Dashboard({ onNewTerminal }: DashboardProps): JSX.Element {
  const { t } = useTranslation('dashboard')
  const activeProject = useProjectStore((s) => s.activeProject)
  const runsBySession = useWorkflowRunnerStore((s) => s.runsBySession)
  const sessions = useTerminalStore((s) => s.sessions)
  const { setActiveSessionId, setTerminalVisible } = useTerminalStore()
  const scripts = useScriptStore((s) => s.scripts)
  const { setActiveScript } = useScriptStore()
  const commands = useCommandStore((s) => s.commands)
  const { setActiveCommand } = useCommandStore()
  const { updateProjectInStore } = useProjectStore()
  const settings = useSettingsStore((s) => s.settings)

  const [runHistory, setRunHistory] = useState<RunRecord[]>([])
  const { runScript, runningScriptId, canRunScript } = useRunScript()
  const formatLocale = resolveFormatLocale(settings)
  const displayRelativeTime = useCallback(
    (iso: string) => formatRelativeTime(iso, formatLocale) || formatDate(iso, settings),
    [formatLocale, settings]
  )

  // Project sessions
  const projectSessions = useMemo(
    () => sessions.filter((s) => s.projectId === activeProject?.id),
    [sessions, activeProject?.id]
  )

  // Active workflow runs for this project
  const activeRuns = useMemo(() => {
    const projectSessionIds = new Set(projectSessions.map((s) => s.id))
    return Object.values(runsBySession).filter(
      (run) => projectSessionIds.has(run.sessionId) && !isTerminalRunStatus(run.status)
    )
  }, [runsBySession, projectSessions])

  // Fetch run history
  useEffect(() => {
    if (!activeProject) return
    window.electronAPI.getRunIndex(activeProject.id).then(setRunHistory).catch(() => {})
  }, [activeProject?.id])

  // Re-fetch when a run completes
  const completedCount = useMemo(
    () => Object.values(runsBySession).filter((r) => isTerminalRunStatus(r.status)).length,
    [runsBySession]
  )
  useEffect(() => {
    if (!activeProject || completedCount === 0) return
    window.electronAPI.getRunIndex(activeProject.id).then(setRunHistory).catch(() => {})
  }, [completedCount, activeProject?.id])

  // Project scripts
  const projectScripts = useMemo(() => {
    if (!activeProject) return []
    const enabledIds = new Set(activeProject.enabledScriptIds)
    return enabledIds.size > 0
      ? scripts.filter((s) => enabledIds.has(s.id))
      : scripts.filter((s) => s.projectId === activeProject.id)
  }, [scripts, activeProject])

  // Most recently run script
  const lastRunScript = useMemo(() => {
    const withRuns = projectScripts.filter((s) => s.lastRunAt)
    if (withRuns.length === 0) return null
    return withRuns.sort((a, b) => new Date(b.lastRunAt!).getTime() - new Date(a.lastRunAt!).getTime())[0]
  }, [projectScripts])

  // Recent runs (last 8, newest first)
  const recentRuns = useMemo(
    () => [...runHistory].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, 8),
    [runHistory]
  )

  // Recent commands (last 5)
  const recentCommands = useMemo(
    () => (activeProject?.recentCommands ?? []).slice(-5).reverse(),
    [activeProject?.recentCommands]
  )

  const handleSidebarTab = async (tab: string): Promise<void> => {
    if (!activeProject) return
    const updated = await window.electronAPI.updateProject(activeProject.id, {
      workspaceLayout: { sidebarTab: tab as 'logs' }
    })
    if (updated) updateProjectInStore(updated)
  }

  if (!activeProject) return <div />

  return (
    <div className="h-full overflow-y-auto p-6 scrollbar-none">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Active Runs Banner */}
        {activeRuns.length > 0 && (
          <section className="space-y-2">
            {activeRuns.map((run) => (
              <div
                key={run.runId}
                className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3"
              >
                <Loader2 size={16} className="text-accent-light animate-spin shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-200 truncate">{run.script.name}</div>
                  <div className="text-xs text-gray-500">
                    {t('activeRuns.stepProgress', {
                      current: run.currentStepIndex + 1,
                      total: run.steps.length
                    })}
                    {run.status === 'awaiting_approval' && (
                      <span className="ml-2 text-caution">{t('activeRuns.awaitingApproval')}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveSessionId(run.sessionId)
                    setTerminalVisible(true)
                  }}
                  className="tv-btn-secondary text-xs"
                >
                  <Terminal size={12} />
                  {t('activeRuns.jumpToTerminal')}
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={onNewTerminal}
              className="flex flex-col items-center gap-2 rounded-xl border border-surface-border bg-surface-light/50 p-4 text-gray-400 hover:border-accent/40 hover:text-accent-light hover:bg-surface-light transition-colors"
            >
              <Terminal size={20} />
              <span className="text-xs font-medium">{t('quickActions.newTerminal')}</span>
            </button>

            <button
              onClick={() => {
                if (lastRunScript) setActiveScript(lastRunScript)
              }}
              disabled={!lastRunScript}
              className="flex flex-col items-center gap-2 rounded-xl border border-surface-border bg-surface-light/50 p-4 text-gray-400 hover:border-accent/40 hover:text-accent-light hover:bg-surface-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-surface-border disabled:hover:text-gray-400"
            >
              <Play size={20} />
              <span className="text-xs font-medium truncate w-full text-center">
                {lastRunScript ? lastRunScript.name : t('quickActions.noRecentScripts')}
              </span>
            </button>

            <button
              onClick={() => window.electronAPI.openInExplorer(resolveProjectWorkingDirectory(activeProject))}
              className="flex flex-col items-center gap-2 rounded-xl border border-surface-border bg-surface-light/50 p-4 text-gray-400 hover:border-accent/40 hover:text-accent-light hover:bg-surface-light transition-colors"
            >
              <FolderOpen size={20} />
              <span className="text-xs font-medium">{t('quickActions.openFolder')}</span>
            </button>
          </div>
        </section>

        {/* Recent Runs */}
        {recentRuns.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="tv-section-label">{t('sections.recentRuns')}</h3>
              <button
                onClick={() => void handleSidebarTab('logs')}
                className="text-[11px] text-gray-500 hover:text-accent-light transition-colors flex items-center gap-1"
              >
                {t('actions.viewAll')} <ChevronRight size={10} />
              </button>
            </div>
            <div className="rounded-xl border border-surface-border bg-surface-light/30 divide-y divide-surface-border">
              {recentRuns.map((run) => (
                <div
                  key={run.runId}
                  className="flex items-center gap-2 px-3 py-2.5 first:rounded-t-xl last:rounded-b-xl hover:bg-surface-light/50 transition-colors group"
                >
                  <button
                    onClick={() => void handleSidebarTab('logs')}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    {statusIcon(run.status)}
                    <span className="text-sm text-gray-200 truncate flex-1 min-w-0">{run.scriptName}</span>
                    <span className="text-[11px] text-gray-500 shrink-0">
                      {formatDuration(run.startedAt, run.endedAt)}
                    </span>
                    <span className="text-[11px] text-gray-600 shrink-0 w-16 text-right">
                      {displayRelativeTime(run.startedAt)}
                    </span>
                  </button>
                  {canRunScript(run.scriptId) && (
                    <button
                      onClick={() => void runScript(run.scriptId)}
                      disabled={runningScriptId === run.scriptId}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-gray-500 hover:text-accent-light hover:bg-accent/10 transition-all shrink-0"
                      title={t('actions.rerun', { name: run.scriptName })}
                    >
                      {runningScriptId === run.scriptId
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Play size={12} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Scripts */}
        {projectScripts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="tv-section-label">{t('sections.scripts')}</h3>
              <button
                onClick={() => void handleSidebarTab('scripts')}
                className="text-[11px] text-gray-500 hover:text-accent-light transition-colors flex items-center gap-1"
              >
                {t('actions.viewAll')} <ChevronRight size={10} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {projectScripts.slice(0, 6).map((script) => (
                <button
                  key={script.id}
                  onClick={() => setActiveScript(script)}
                  className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-light/30 px-3 py-2.5 text-left hover:border-accent/30 hover:bg-surface-light/50 transition-colors group"
                >
                  <ScrollText size={14} className="text-gray-500 group-hover:text-accent-light shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200 truncate">{script.name}</div>
                    <div className="text-[11px] text-gray-500">
                      {t('scripts.step', { count: script.steps.length })}
                      {script.lastRunAt && (
                        <span className="ml-2">{displayRelativeTime(script.lastRunAt)}</span>
                      )}
                    </div>
                  </div>
                  <Play size={12} className="text-gray-600 group-hover:text-accent-light shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Recent Commands */}
        {recentCommands.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="tv-section-label">{t('sections.recentCommands')}</h3>
              <button
                onClick={() => void handleSidebarTab('commands')}
                className="text-[11px] text-gray-500 hover:text-accent-light transition-colors flex items-center gap-1"
              >
                {t('actions.viewAll')} <ChevronRight size={10} />
              </button>
            </div>
            <div className="rounded-xl border border-surface-border bg-surface-light/30 divide-y divide-surface-border">
              {recentCommands.map((recent, index) => {
                const command = commands.find((c) => c.id === recent.commandId)
                return (
                  <button
                    key={`${recent.commandId}-${index}`}
                    onClick={() => {
                      if (command) setActiveCommand(command)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-light/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    <TerminalSquare size={13} className="text-gray-500 shrink-0" />
                    <code className="text-xs font-mono text-gray-300 truncate flex-1 min-w-0">
                      {recent.commandString}
                    </code>
                    <span className="text-[11px] text-gray-600 shrink-0">
                      {displayRelativeTime(recent.timestamp)}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Empty state when nothing to show */}
        {recentRuns.length === 0 && projectScripts.length === 0 && recentCommands.length === 0 && activeRuns.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-light">
              <TerminalSquare size={22} />
            </div>
            <h3 className="text-sm font-medium text-gray-300">{t('empty.title')}</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
              {t('empty.description')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
