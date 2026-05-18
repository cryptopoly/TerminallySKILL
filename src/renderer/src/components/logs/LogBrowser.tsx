import { useEffect, useCallback, useMemo, useState, useRef, type MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useRunScript } from '../../hooks/useRunScript'
import { createPortal } from 'react-dom'
import {
  Search,
  ArrowLeft,
  ArrowLeftRight,
  Trash2,
  ScrollText,
  Clock,
  Terminal,
  FolderOpen,
  Sparkles,
  Loader2,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  X,
  XCircle,
  Info,
  Copy,
  SendHorizontal,
  Play
} from 'lucide-react'
import { useLogStore } from '../../store/log-store'
import { useProjectStore } from '../../store/project-store'
import { useSettingsStore } from '../../store/settings-store'
import { HelpTip } from '../ui/HelpTip'
import type { SessionLogMeta, LogSearchResult } from '../../../../shared/log-schema'
import type { RunRecord, RunStatus, RunStepRecord } from '../../../../shared/run-schema'
import { findTextMatches, getWrappedMatchIndex } from '../../lib/log-search'
import { buildExitDiagnostics, type ExitDiagnostics } from '../../lib/exit-diagnostics'
import {
  buildRunComparisonRows,
  buildRunComparisonSummary,
  findPreviousComparableRun,
  type RunComparisonRow
} from '../../../../shared/run-history'
import { formatDateTime } from '../../i18n/format'
import { formatWorkflowRunError } from '../../lib/workflow-run-errors'

type LogTranslator = (key: string, options?: Record<string, unknown>) => string

export function LogBrowser(): JSX.Element {
  const { t } = useTranslation('logs')
  const activeProject = useProjectStore((s) => s.activeProject)
  const [runs, setRuns] = useState<RunRecord[]>([])
  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null)
  const [comparedRuns, setComparedRuns] = useState<[RunRecord, RunRecord] | null>(null)
  const {
    logs,
    loading,
    selectedLog,
    selectedLogContent,
    searchQuery,
    setLogs,
    setLoading,
    setSelectedLog,
    setSelectedLogContent,
    setSearchQuery
  } = useLogStore()

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const [entries, runEntries] = await Promise.all([
        window.electronAPI.getLogIndex(activeProject?.id ?? null),
        window.electronAPI.getRunIndex(activeProject?.id ?? null)
      ])
      setLogs(entries)
      setRuns(runEntries)
    } catch {
      setLogs([])
      setRuns([])
    }
    setLoading(false)
  }, [activeProject?.id, setLogs, setLoading])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleSelectLog = useCallback(
    async (log: SessionLogMeta) => {
      setComparedRuns(null)
      setSelectedRun(null)
      setSelectedLog(log)
      try {
        const content = await window.electronAPI.readLogContent(log.logFilePath)
        setSelectedLogContent(content)
      } catch {
        setSelectedLogContent(t('list.readError'))
      }
    },
    [setSelectedLog, setSelectedLogContent, t]
  )

  const handleBack = useCallback(() => {
    setComparedRuns(null)
    setSelectedRun(null)
    setSelectedLog(null)
    setSelectedLogContent(null)
  }, [setSelectedLog, setSelectedLogContent])

  const handleDelete = useCallback(
    async (log: SessionLogMeta) => {
      await window.electronAPI.deleteLog(log.logFilePath)
      setSelectedRun(null)
      setSelectedLog(null)
      setSelectedLogContent(null)
      loadHistory()
    },
    [setSelectedLog, setSelectedLogContent, loadHistory]
  )

  const handleOpenLogsFolder = useCallback(async () => {
    const logBasePath = await window.electronAPI.getLogBasePath(activeProject?.id ?? null)
    await window.electronAPI.openInExplorer(logBasePath)
  }, [activeProject?.id])

  const handleOpenRunLog = useCallback(
    async (run: RunRecord) => {
      if (!run.logFilePath) return

      const allLogs = await window.electronAPI.getLogIndex(activeProject?.id ?? null)
      const linkedLog = allLogs.find((log) => log.logFilePath === run.logFilePath)
      if (!linkedLog) return

      setLogs(allLogs)
      await handleSelectLog(linkedLog)
    },
    [activeProject?.id, handleSelectLog, setLogs]
  )

  const compareTarget = useMemo(
    () => (selectedRun ? findPreviousComparableRun(runs, selectedRun) : null),
    [runs, selectedRun]
  )

  if (selectedRun) {
    return (
      <>
        <RunDetail
          run={selectedRun}
          compareTarget={compareTarget}
          onBack={handleBack}
          onCompare={(baseline, candidate) => setComparedRuns([baseline, candidate])}
          onOpenLinkedLog={handleOpenRunLog}
        />
        {comparedRuns && (
          <RunCompareDialog
            baseline={comparedRuns[0]}
            candidate={comparedRuns[1]}
            onClose={() => setComparedRuns(null)}
          />
        )}
      </>
    )
  }

  if (selectedLog && selectedLogContent !== null) {
    return (
      <LogDetail
        log={selectedLog}
        content={selectedLogContent}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onBack={handleBack}
        onDelete={handleDelete}
      />
    )
  }

  return (
    <LogList
      runs={runs}
      logs={logs}
      loading={loading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSearch={async (query) => {
        if (!query.trim()) {
          loadHistory()
          return
        }
        setLoading(true)
        try {
          const [results, runEntries] = await Promise.all([
            window.electronAPI.searchLogs(activeProject?.id ?? null, query),
            window.electronAPI.searchRuns(activeProject?.id ?? null, query, 'all')
          ])
          setLogs(results)
          setRuns(runEntries)
        } catch {
          setLogs([])
          setRuns([])
        }
        setLoading(false)
      }}
      onSelectRun={(run) => setSelectedRun(run)}
      onSelect={handleSelectLog}
      onRefresh={loadHistory}
      onOpenLogsFolder={() => void handleOpenLogsFolder()}
    />
  )
}

// ---------------------------------------------------------------------------
// Log list view
// ---------------------------------------------------------------------------

type ListItem =
  | { kind: 'run'; data: RunRecord; timestamp: number }
  | { kind: 'log'; data: SessionLogMeta; timestamp: number }

function LogList({
  runs,
  logs,
  loading,
  searchQuery,
  onSearchChange,
  onSearch,
  onSelectRun,
  onSelect,
  onRefresh,
  onOpenLogsFolder
}: {
  runs: RunRecord[]
  logs: SessionLogMeta[]
  loading: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  onSearch: (q: string) => void
  onSelectRun: (run: RunRecord) => void
  onSelect: (log: SessionLogMeta) => void
  onRefresh: () => void
  onOpenLogsFolder: () => void
}): JSX.Element {
  const { t } = useTranslation('logs')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showRuns, setShowRuns] = useState(true)
  const [showLogs, setShowLogs] = useState(true)

  const handleChange = (value: string): void => {
    onSearchChange(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onSearch(value), 300)
  }

  const mergedItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = []
    if (showRuns) {
      for (const run of runs) {
        items.push({ kind: 'run', data: run, timestamp: new Date(run.endedAt ?? run.startedAt).getTime() })
      }
    }
    if (showLogs) {
      for (const log of logs) {
        items.push({ kind: 'log', data: log, timestamp: new Date(log.endedAt).getTime() })
      }
    }
    items.sort((a, b) => b.timestamp - a.timestamp)
    return items
  }, [runs, logs, showRuns, showLogs])

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-3 shrink-0 border-b border-surface-border">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none"
          />
          <input
            type="text"
            placeholder={t('list.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => handleChange(e.target.value)}
            className="tv-input-compact pl-8"
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <HelpTip label={t('list.workflowRuns')} description={t('list.workflowRunsDescription')}>
            <button
              onClick={() => setShowRuns((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] transition-colors ${
                showRuns
                  ? 'border-accent/30 bg-accent/10 text-accent-light'
                  : 'border-gray-500/40 bg-surface-light/60 text-gray-500'
              }`}
            >
              <PlayCircle size={12} />
              {t('list.runs')}
            </button>
          </HelpTip>
          <HelpTip label={t('list.terminalLogs')} description={t('list.terminalLogsDescription')}>
            <button
              onClick={() => setShowLogs((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] transition-colors ${
                showLogs
                  ? 'border-accent/30 bg-accent/10 text-accent-light'
                  : 'border-gray-500/40 bg-surface-light/60 text-gray-500'
              }`}
            >
              <Terminal size={12} />
              {t('list.logs')}
            </button>
          </HelpTip>
          <div className="ml-auto pl-2 shrink-0">
            <HelpTip label={t('list.openLogsFolder')} description={t('list.openLogsFolderDescription')}>
              <button
                onClick={onOpenLogsFolder}
                className="tv-btn-secondary text-[11px] shrink-0"
              >
                <FolderOpen size={11} />
                {t('list.openLogsFolder')}
              </button>
            </HelpTip>
          </div>
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {loading ? (
          <div className="text-center text-gray-500 text-sm mt-8">{t('list.loading')}</div>
        ) : mergedItems.length === 0 ? (
          <div className="text-center py-12">
            <ScrollText size={28} className="mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500 text-sm">
              {searchQuery.trim()
                ? t('list.emptyMatching')
                : !showRuns && !showLogs
                  ? t('list.emptyFilters')
                  : t('list.emptyHistory')}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              {searchQuery.trim()
                ? t('list.tryDifferentSearch')
                : !showRuns && !showLogs
                  ? t('list.enableFilter')
                  : t('list.historyHint')}
            </p>
            <button
              onClick={onRefresh}
              className="mt-3 text-xs text-accent-light hover:text-accent transition-colors"
            >
              {t('list.refresh')}
            </button>
          </div>
        ) : (
          <div className="pt-1">
            {mergedItems.map((item) =>
              item.kind === 'run' ? (
                <RunEntry key={`run-${item.data.runId}`} run={item.data} onClick={() => onSelectRun(item.data)} />
              ) : (
                <LogEntry key={`log-${item.data.logFilePath}`} log={item.data} searchQuery={searchQuery} onClick={() => onSelect(item.data)} />
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function RunEntry({
  run,
  onClick
}: {
  run: RunRecord
  onClick: () => void
}): JSX.Element {
  const { t } = useTranslation('logs')
  const settings = useSettingsStore((s) => s.settings)
  const date = new Date(run.endedAt ?? run.startedAt)
  const statusMeta = getRunStatusMeta(run.status, t)
  const completedSteps = run.steps.filter((step) => step.status === 'completed').length

  return (
    <button
      onClick={onClick}
      className="tv-list-card mb-1 w-full text-left px-3 py-2.5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <statusMeta.icon size={12} className={`${statusMeta.tone} shrink-0`} />
            <span className="text-xs font-medium text-gray-200 truncate">{run.scriptName}</span>
            <span className="font-mono text-[10px] text-gray-600">{run.sessionId}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-600">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatDateTime(date, settings)}
            </span>
            <span>
              {t('labels.stepsComplete', { completed: completedSteps, total: run.steps.length })}
            </span>
            {run.projectName && <span className="truncate">{run.projectName}</span>}
          </div>
        </div>
        <span className={`text-[10px] font-mono uppercase ${statusMeta.tone}`}>
          {statusMeta.label}
        </span>
      </div>
    </button>
  )
}

function LogEntry({
  log,
  searchQuery,
  onClick
}: {
  log: SessionLogMeta
  searchQuery: string
  onClick: () => void
}): JSX.Element {
  const { t } = useTranslation('logs')
  const settings = useSettingsStore((s) => s.settings)
  const date = new Date(log.endedAt)
  const timeStr = formatDateTime(date, settings)

  const exitColor =
    log.exitCode === 0
      ? 'text-safe'
      : log.exitCode === null
        ? 'text-gray-500'
        : 'text-destructive'

  const exitLabel =
    log.exitCode === null
      ? t('status.closed')
      : log.exitCode === 0
        ? t('status.ok')
        : t('step.exit', { code: log.exitCode })

  // Format file size
  const sizeStr =
    log.sizeBytes < 1024
      ? `${log.sizeBytes} B`
      : log.sizeBytes < 1024 * 1024
        ? `${(log.sizeBytes / 1024).toFixed(1)} KB`
        : `${(log.sizeBytes / (1024 * 1024)).toFixed(1)} MB`

  const matchLines = 'matchLines' in log && Array.isArray((log as LogSearchResult).matchLines)
    ? (log as LogSearchResult).matchLines.slice(0, 2)
    : []

  return (
    <button
      onClick={onClick}
      className="tv-list-card mb-1 w-full text-left px-3 py-2.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-gray-600 shrink-0" />
          <span className="font-mono text-xs text-gray-300">{log.sessionId}</span>
          {log.projectName && (
            <span className="text-xs text-gray-600 truncate max-w-[80px]">
              {log.projectName}
            </span>
          )}
        </div>
        <span className={`text-[10px] font-mono ${exitColor}`}>{exitLabel}</span>
      </div>
      <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-600">
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {timeStr}
        </span>
        <span>{t('labels.lines', { count: log.lineCount })}</span>
        <span>{sizeStr}</span>
      </div>
      {searchQuery.trim() && matchLines.length > 0 && (
        <div className="mt-2 space-y-1">
          {matchLines.map((line, index) => (
            <div
              key={`${log.logFilePath}-match-${index}`}
              className="rounded-md bg-surface px-2 py-1 text-[11px] text-gray-500 font-mono whitespace-pre-wrap break-words"
            >
              <HighlightedSnippetText line={line} query={searchQuery} />
            </div>
          ))}
        </div>
      )}
    </button>
  )
}

function HighlightedSnippetText({
  line,
  query
}: {
  line: string
  query: string
}): JSX.Element {
  const matches = findTextMatches(line, query, 20)
  if (matches.length === 0) {
    return <>{line}</>
  }

  const segments: JSX.Element[] = []
  let cursor = 0

  matches.forEach((match, index) => {
    if (cursor < match.start) {
      segments.push(<span key={`text-${index}-${cursor}`}>{line.slice(cursor, match.start)}</span>)
    }
    segments.push(
      <mark key={`mark-${index}-${match.start}`} className="rounded px-0.5 bg-caution/40 text-gray-200">
        {line.slice(match.start, match.end)}
      </mark>
    )
    cursor = match.end
  })

  if (cursor < line.length) {
    segments.push(<span key={`tail-${cursor}`}>{line.slice(cursor)}</span>)
  }

  return <>{segments}</>
}

// ---------------------------------------------------------------------------
// Run detail view
// ---------------------------------------------------------------------------

function RunDetail({
  run,
  compareTarget,
  onBack,
  onCompare,
  onOpenLinkedLog
}: {
  run: RunRecord
  compareTarget: RunRecord | null
  onBack: () => void
  onCompare: (baseline: RunRecord, candidate: RunRecord) => void
  onOpenLinkedLog: (run: RunRecord) => void
}): JSX.Element {
  const { t } = useTranslation('logs')
  const settings = useSettingsStore((s) => s.settings)
  const { runScript, runningScriptId, canRunScript } = useRunScript()
  const statusMeta = getRunStatusMeta(run.status, t)
  const started = new Date(run.startedAt)
  const ended = run.endedAt ? new Date(run.endedAt) : null
  const durationStr = ended ? formatDuration(ended.getTime() - started.getTime()) : t('status.inProgress')
  const failedCommandStep = useMemo(
    () =>
      [...run.steps]
        .reverse()
        .find(
          (step): step is Extract<RunStepRecord, { type: 'command' }> =>
            step.type === 'command' && (step.status === 'failed' || (step.exitCode ?? 0) !== 0)
        ) ?? null,
    [run.steps]
  )
  const runDiagnostics = useMemo(
    () =>
      buildExitDiagnostics({
        title: run.scriptName,
        commandString: failedCommandStep?.commandString ?? null,
        exitCode: failedCommandStep?.exitCode ?? null,
        error: run.error,
        shell: run.shell
      }),
    [failedCommandStep?.commandString, failedCommandStep?.exitCode, run.error, run.scriptName, run.shell]
  )

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ArrowLeft size={14} />
          </button>
          <statusMeta.icon size={13} className={statusMeta.tone} />
          <span className="text-sm text-gray-200 font-medium">{run.scriptName}</span>
          <span className={`ml-auto text-xs uppercase ${statusMeta.tone}`}>{statusMeta.label}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-gray-500 ml-7">
          <span>
            {t('labels.started')}: {formatDateTime(started, settings)}
          </span>
          <span>{t('labels.duration')}: {durationStr}</span>
          <span>{t('labels.session')}: {run.sessionId}</span>
          <span>{t('labels.steps')}: {run.steps.length}</span>
          <span>{t('labels.shell')}: {run.shell ?? t('labels.unknown')}</span>
          <span>{run.projectName ?? t('labels.noProject')}</span>
        </div>
        {run.cwd && (
          <div className="flex items-center gap-1 text-[11px] text-gray-600 mt-1 ml-7 font-mono truncate">
            <FolderOpen size={10} className="shrink-0" />
            {run.cwd}
          </div>
        )}
        {Object.keys(run.inputValues).length > 0 && (
          <div className="mt-3 ml-7 rounded-lg border border-surface-border bg-surface px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
              {t('labels.inputs')}
            </div>
            <div className="mt-2 space-y-1 text-xs text-gray-300 font-mono">
              {Object.entries(run.inputValues).map(([key, value]) => (
                <div key={key}>
                  {key}: {value === undefined ? t('labels.unset') : String(value)}
                </div>
              ))}
            </div>
          </div>
        )}
        {run.error && (
          <div className="mt-3 ml-7 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <div className="flex items-start gap-2">
              <span className="flex-1">
                {formatWorkflowRunError(run.error, (key, options) => t(key, { ns: 'scripts', ...options }))}
              </span>
              <ExitDiagnosticsButton diagnostics={runDiagnostics} />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 mt-3 ml-7">
          {canRunScript(run.scriptId) && (
            <button
              onClick={() => void runScript(run.scriptId)}
              disabled={runningScriptId === run.scriptId}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-accent/30 bg-accent/10 text-xs text-accent-light hover:bg-accent/20 hover:border-accent/50 transition-colors"
            >
              {runningScriptId === run.scriptId
                ? <Loader2 size={12} className="animate-spin" />
                : <Play size={12} />}
              {t('actions.rerun')}
            </button>
          )}
          {run.logFilePath && (
            <button
              onClick={() => void onOpenLinkedLog(run)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-surface-border text-xs text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors"
            >
              <Terminal size={12} />
              {t('actions.openLog')}
            </button>
          )}
          {compareTarget && (
            <button
              onClick={() => onCompare(compareTarget, run)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-surface-border text-xs text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors"
            >
              <ArrowLeftRight size={12} />
              {t('actions.comparePrevious')}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {run.steps.map((step) => (
          <RunStepCard key={step.stepId} step={step} />
        ))}
      </div>
    </div>
  )
}

function RunStepCard({ step }: { step: RunStepRecord }): JSX.Element {
  const { t } = useTranslation('logs')
  const statusMeta = getRunStatusMeta(step.status === 'running' ? 'running_command' : step.status, t)
  const durationStr =
    step.startedAt && step.endedAt
      ? formatDuration(new Date(step.endedAt).getTime() - new Date(step.startedAt).getTime())
    : step.startedAt
        ? t('status.inProgress')
        : t('status.notStarted')
  const stepDiagnostics =
    step.type === 'command' && step.exitCode !== null && step.exitCode !== 0
      ? buildExitDiagnostics({
          title: step.label,
          commandString: step.commandString,
          exitCode: step.exitCode
        })
      : null

  return (
    <div className="rounded-xl border border-surface-border bg-surface px-3 py-3">
      <div className="flex items-center gap-2 text-sm text-gray-200">
        <statusMeta.icon size={13} className={statusMeta.tone} />
        <span>{step.label}</span>
        <span className="text-[10px] uppercase tracking-wide text-gray-500">{step.type}</span>
        <span className={`ml-auto text-[10px] uppercase ${statusMeta.tone}`}>{statusMeta.label}</span>
      </div>
      <div className="mt-2 text-xs text-gray-400 whitespace-pre-wrap leading-6">
        {step.type === 'command'
          ? step.commandString
          : step.type === 'approval'
            ? step.message
            : step.content}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-gray-500">
        <span>{t('labels.step')} {step.sourceIndex + 1}</span>
        <span>{t('step.duration', { duration: durationStr })}</span>
        {step.type === 'command' && <span>{t('step.attempts', { count: step.attempts })}</span>}
        {step.exitCode !== null && (
          <span className="inline-flex items-center gap-1.5">
            <span>{t('step.exit', { code: step.exitCode })}</span>
            {stepDiagnostics && <ExitDiagnosticsButton diagnostics={stepDiagnostics} compact />}
          </span>
        )}
        {step.type === 'command' && step.retryCount > 0 && <span>{t('step.retries', { count: step.retryCount })}</span>}
        {step.type === 'command' && step.delayMs > 0 && <span>{t('step.delay', { ms: step.delayMs })}</span>}
        {step.type === 'approval' && (
          <span>{step.requireConfirmation ? t('step.manualConfirmation') : t('step.autoCheckpoint')}</span>
        )}
      </div>
    </div>
  )
}

function RunCompareDialog({
  baseline,
  candidate,
  onClose
}: {
  baseline: RunRecord
  candidate: RunRecord
  onClose: () => void
}): JSX.Element {
  const { t } = useTranslation('logs')
  const settings = useSettingsStore((s) => s.settings)
  const [changedOnly, setChangedOnly] = useState(false)
  const rows = useMemo(() => buildRunComparisonRows(baseline, candidate), [baseline, candidate])
  const summary = useMemo(() => buildRunComparisonSummary(baseline, candidate), [baseline, candidate])
  const visibleRows = changedOnly ? rows.filter((row) => row.changed) : rows

  return (
    <div className="fixed inset-0 z-[130] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[88vh] overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-2xl shadow-black/50 flex flex-col">
        <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={16} className="text-accent-light" />
            <div>
              <div className="text-sm font-semibold text-gray-200">{t('compare.title')}</div>
              <div className="text-xs text-gray-500">
                {baseline.scriptName} · {t('compare.versus', {
                  baseline: formatDateTime(baseline.startedAt, settings),
                  candidate: formatDateTime(candidate.startedAt, settings)
                })}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-lighter text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-surface-border grid grid-cols-4 gap-3 text-xs">
          <CompareSummaryCard label={t('compare.changedSteps')} value={String(summary.changedSteps)} tone="text-accent-light" />
          <CompareSummaryCard
            label={t('compare.regressionsFixes')}
            value={`${summary.regressions} / ${summary.fixes}`}
            tone={summary.regressions > 0 ? 'text-destructive' : 'text-safe'}
          />
          <CompareSummaryCard
            label={t('compare.durationDelta')}
            value={formatDurationDelta(summary.durationDeltaMs, t)}
            tone={
              summary.durationDeltaMs === null
                ? 'text-gray-500'
                : summary.durationDeltaMs > 0
                  ? 'text-caution'
                  : summary.durationDeltaMs < 0
                    ? 'text-safe'
                    : 'text-gray-400'
            }
          />
          <CompareSummaryCard
            label={t('compare.addedRemoved')}
            value={`${summary.addedSteps} / ${summary.removedSteps}`}
            tone="text-gray-300"
          />
        </div>

        <div className="grid grid-cols-2 border-b border-surface-border text-xs">
          <div className="px-4 py-3 border-r border-surface-border">
            <div className="text-gray-400 uppercase tracking-[0.16em] mb-1">{t('compare.previous')}</div>
            <div className="text-gray-200">{baseline.scriptName}</div>
            <div className="text-gray-500 mt-1">
              {getRunStatusMeta(baseline.status, t).label} · {t('labels.stepCount', { count: baseline.steps.length })} ·{' '}
              {baseline.endedAt
                ? formatDuration(new Date(baseline.endedAt).getTime() - new Date(baseline.startedAt).getTime())
                : t('status.inProgress')}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-gray-400 uppercase tracking-[0.16em] mb-1">{t('compare.current')}</div>
            <div className="text-gray-200">{candidate.scriptName}</div>
            <div className="text-gray-500 mt-1">
              {getRunStatusMeta(candidate.status, t).label} · {t('labels.stepCount', { count: candidate.steps.length })} ·{' '}
              {candidate.endedAt
                ? formatDuration(new Date(candidate.endedAt).getTime() - new Date(candidate.startedAt).getTime())
                : t('status.inProgress')}
            </div>
          </div>
        </div>

        <div className="px-4 py-2 border-b border-surface-border flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {t('compare.shown', { visible: visibleRows.length, total: rows.length })}
          </div>
          <button
            onClick={() => setChangedOnly((value) => !value)}
            className={`px-2.5 py-1 rounded-md text-[11px] border transition-colors ${
              changedOnly
                ? 'border-accent/20 bg-accent/10 text-accent-light'
                : 'border-surface-border text-gray-400 hover:text-gray-200'
            }`}
          >
            {changedOnly ? t('compare.showingChangedOnly') : t('compare.showChangedOnly')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {visibleRows.map((row) => {
            const changeMeta = getRunComparisonChangeMeta(row, t)
            return (
            <div
              key={row.key}
              className={`rounded-xl border ${
                row.changed ? 'border-accent/30 bg-accent/5' : 'border-surface-border bg-surface-light'
              }`}
            >
              <div className="px-3 py-2 border-b border-surface-border flex items-center justify-between gap-2 text-[11px]">
                <span className="text-gray-500 uppercase tracking-[0.16em]">
                  {t('compare.stepLabel', { index: row.index + 1 })}
                </span>
                <span className={`${changeMeta.tone} uppercase tracking-[0.16em]`}>
                  {changeMeta.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-0">
                <RunCompareCell step={row.baseline} />
                <RunCompareCell step={row.candidate} bordered />
              </div>
            </div>
            )
          })}
          {visibleRows.length === 0 && (
            <div className="rounded-xl border border-surface-border bg-surface-light px-4 py-8 text-center text-sm text-gray-500">
              {t('compare.noChangedSteps')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CompareSummaryCard({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone: string
}): JSX.Element {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-light px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-gray-500">{label}</div>
      <div className={`mt-1 text-sm font-medium ${tone}`}>{value}</div>
    </div>
  )
}

function RunCompareCell({
  step,
  bordered = false
}: {
  step: RunStepRecord | null
  bordered?: boolean
}): JSX.Element {
  const { t } = useTranslation('logs')
  if (!step) {
    return (
      <div className={`px-4 py-3 text-xs text-gray-600 ${bordered ? 'border-l border-surface-border' : ''}`}>
        {t('compare.noStep')}
      </div>
    )
  }

  const statusMeta = getRunStatusMeta(step.status === 'running' ? 'running_command' : step.status, t)
  const durationStr =
    step.startedAt && step.endedAt
      ? formatDuration(new Date(step.endedAt).getTime() - new Date(step.startedAt).getTime())
      : step.startedAt
        ? t('status.inProgress')
        : t('status.notStarted')

  return (
    <div className={`px-4 py-3 ${bordered ? 'border-l border-surface-border' : ''}`}>
      <div className="flex items-center gap-2 text-sm text-gray-200">
        <statusMeta.icon size={13} className={statusMeta.tone} />
        <span>{step.label}</span>
        <span className="text-[10px] uppercase tracking-wide text-gray-500">{step.type}</span>
      </div>
      <div className="mt-2 text-xs text-gray-400 whitespace-pre-wrap leading-6">
        {step.type === 'command'
          ? step.commandString
          : step.type === 'approval'
            ? step.message
            : step.content}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-gray-500">
        <span>{statusMeta.label}</span>
        <span>{t('step.duration', { duration: durationStr })}</span>
        {step.type === 'command' && <span>{t('step.attempts', { count: step.attempts })}</span>}
        {step.exitCode !== null && <span>{t('step.exit', { code: step.exitCode })}</span>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Log detail view
// ---------------------------------------------------------------------------

function LogDetail({
  log,
  content,
  searchQuery,
  onSearchQueryChange,
  onBack,
  onDelete
}: {
  log: SessionLogMeta
  content: string
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  onBack: () => void
  onDelete: (log: SessionLogMeta) => void
}): JSX.Element {
  const { t } = useTranslation('logs')
  const settings = useSettingsStore((s) => s.settings)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [aiReview, setAIReview] = useState<string | null>(null)
  const [aiReviewMeta, setAIReviewMeta] = useState<{ providerLabel: string; model: string } | null>(null)
  const [aiLoading, setAILoading] = useState(false)
  const [aiError, setAIError] = useState<string | null>(null)
  const [aiFollowUps, setAIFollowUps] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [aiFollowUpInput, setAIFollowUpInput] = useState('')
  const [aiFollowUpLoading, setAIFollowUpLoading] = useState(false)
  const aiReviewTranscriptRef = useRef<string>('')
  const aiFollowUpScrollRef = useRef<HTMLDivElement>(null)
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1)
  const matchRefs = useRef<Array<HTMLElement | null>>([])
  const matches = useMemo(() => findTextMatches(content, searchQuery), [content, searchQuery])
  const contentRef = useRef<HTMLPreElement>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const started = new Date(log.startedAt)
  const ended = new Date(log.endedAt)
  const durationMs = ended.getTime() - started.getTime()
  const durationStr = formatDuration(durationMs)

  const exitColor =
    log.exitCode === 0
      ? 'text-safe'
      : log.exitCode === null
        ? 'text-gray-500'
        : 'text-destructive'

  useEffect(() => {
    setAIReview(null)
    setAIReviewMeta(null)
    setAIError(null)
    setAILoading(false)
  }, [log.logFilePath, content])

  useEffect(() => {
    matchRefs.current = []
    setActiveMatchIndex(matches.length > 0 ? 0 : -1)
  }, [log.logFilePath, matches.length, searchQuery])

  useEffect(() => {
    if (activeMatchIndex < 0) return
    matchRefs.current[activeMatchIndex]?.scrollIntoView({
      block: 'center',
      inline: 'nearest'
    })
  }, [activeMatchIndex])

  const getSelectedText = useCallback((): string => {
    const selection = window.getSelection()
    return selection?.toString().trim() ?? ''
  }, [])

  const runAIReviewSelection = useCallback(async () => {
    const selectedText = getSelectedText()
    if (!selectedText) return

    setAILoading(true)
    setAIError(null)
    setAIFollowUps([])
    setAIFollowUpInput('')
    aiReviewTranscriptRef.current = selectedText
    try {
      const response = await window.electronAPI.runAIAction({
        action: 'output-review',
        source: 'log',
        focus: 'command-block',
        title: t('detail.selectedLogText'),
        transcript: selectedText,
        cwd: log.cwd,
        shell: log.shell,
        exitCode: log.exitCode
      })
      setAIReview(response.content)
      setAIReviewMeta({
        providerLabel: response.providerLabel,
        model: response.model
      })
    } catch (error) {
      setAIError(error instanceof Error ? error.message : String(error))
      setAIReview(null)
      setAIReviewMeta(null)
    } finally {
      setAILoading(false)
    }
  }, [getSelectedText, log.cwd, log.exitCode, log.shell, t])

  const sendAIFollowUp = useCallback(async () => {
    const question = aiFollowUpInput.trim()
    if (!question || aiFollowUpLoading) return

    const currentFollowUps = [...aiFollowUps, { role: 'user' as const, content: question }]
    setAIFollowUps(currentFollowUps)
    setAIFollowUpInput('')
    setAIFollowUpLoading(true)

    const conversation = [
      aiReview ? `AI: ${aiReview}` : null,
      ...currentFollowUps.slice(0, -1).map((m) =>
        m.role === 'user' ? `User: ${m.content}` : `AI: ${m.content}`
      )
    ]
      .filter(Boolean)
      .join('\n\n')

    try {
      const response = await window.electronAPI.runAIAction({
        action: 'chat-followup',
        context: aiReviewTranscriptRef.current,
        conversation,
        question
      })
      setAIFollowUps((prev) => [...prev, { role: 'assistant', content: response.content }])
    } catch (error) {
      setAIFollowUps((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : String(error)}` }
      ])
    } finally {
      setAIFollowUpLoading(false)
      requestAnimationFrame(() => {
        aiFollowUpScrollRef.current?.scrollTo({ top: aiFollowUpScrollRef.current.scrollHeight, behavior: 'smooth' })
      })
    }
  }, [aiFollowUpInput, aiFollowUpLoading, aiFollowUps, aiReview])

  const handleContentContextMenu = useCallback((e: React.MouseEvent) => {
    const selectedText = getSelectedText()
    if (!selectedText) return
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [getSelectedText])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ArrowLeft size={14} />
          </button>
          <Terminal size={13} className="text-gray-500" />
          <span className="font-mono text-sm text-gray-300">{log.sessionId}</span>
          {log.exitCode !== null && (
            <span className={`ml-auto text-xs ${exitColor}`}>
              {t('labels.exitCode')}: {log.exitCode}
            </span>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-gray-500 ml-7">
          <span>
            {t('labels.started')}: {formatDateTime(started, settings)}
          </span>
          <span>{t('labels.duration')}: {durationStr}</span>
          <span>{t('labels.shell')}: {log.shell}</span>
          <span>{t('labels.lines', { count: log.lineCount })}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gray-600 mt-1 ml-7 font-mono truncate">
          <FolderOpen size={10} className="shrink-0" />
          {log.cwd}
        </div>
        <div className="mt-3 ml-7 rounded-lg border border-surface-border bg-surface px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Search size={12} className="text-gray-600 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && matches.length > 0) {
                  e.preventDefault()
                  setActiveMatchIndex((current) =>
                    getWrappedMatchIndex(current, matches.length, e.shiftKey ? 'previous' : 'next')
                  )
                }
              }}
              placeholder={t('detail.searchPlaceholder')}
              className="flex-1 bg-transparent text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none"
            />
            {matches.length > 0 && (
              <span className="text-[11px] text-gray-500 font-mono shrink-0">
                {activeMatchIndex + 1} / {matches.length}
              </span>
            )}
          </div>
          {searchQuery.trim() && matches.length === 0 && (
            <div className="mt-2 text-[11px] text-gray-500">
              {t('detail.noMatches')}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-[#0d0d1a]" onContextMenu={handleContentContextMenu}>
        <pre ref={contentRef} className="p-3 text-xs font-mono text-gray-400 whitespace-pre-wrap break-words leading-relaxed">
          <HighlightedLogText
            content={content}
            matches={matches}
            activeMatchIndex={activeMatchIndex}
            matchRefs={matchRefs}
          />
        </pre>
      </div>

      {/* Right-click context menu */}
      {contextMenu && createPortal(
        <>
          <div
            className="fixed inset-0 z-[250]"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null) }}
          />
          <div
            className="fixed z-[251] rounded-lg border border-surface-border bg-surface-light shadow-xl shadow-black/40 py-1 min-w-[200px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                setContextMenu(null)
                void runAIReviewSelection()
              }}
              disabled={aiLoading}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-200 hover:bg-surface-lighter transition-colors disabled:opacity-50"
            >
              <Sparkles size={14} className="text-accent-light" />
              {t('actions.aiReviewSelection')}
            </button>
            <button
              onClick={async () => {
                const text = getSelectedText()
                if (text) await window.electronAPI.writeClipboard(text)
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-200 hover:bg-surface-lighter transition-colors"
            >
              <Copy size={14} className="text-gray-400" />
              {t('actions.copy')}
            </button>
          </div>
        </>,
        document.body
      )}

      {/* AI Review Modal */}
      {(aiReview || aiError || aiLoading) && createPortal(
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center overflow-y-auto p-6">
          <div className="w-full max-w-3xl max-h-[calc(100vh-3rem)] rounded-2xl border border-surface-border bg-surface-light shadow-2xl shadow-black/50 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-surface-border shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles size={18} className={aiError ? 'text-destructive' : 'text-accent-light'} />
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-gray-200">{t('detail.aiTitle')}</h3>
                </div>
              </div>
              <button
                onClick={() => {
                  if (aiLoading || aiFollowUpLoading) return
                  setAIReview(null)
                  setAIReviewMeta(null)
                  setAIError(null)
                  setAILoading(false)
                  setAIFollowUps([])
                  setAIFollowUpInput('')
                }}
                disabled={aiLoading || aiFollowUpLoading}
                className="rounded-lg p-2 text-gray-400 hover:text-gray-200 hover:bg-surface transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
            <div ref={aiFollowUpScrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {aiLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
                  <Loader2 size={16} className="animate-spin" />
                  {t('detail.reviewing')}
                </div>
              )}
              {aiError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4">
                  <div className="text-sm text-destructive whitespace-pre-wrap">{aiError}</div>
                </div>
              )}
              {aiReview && <div className="text-sm text-gray-200 whitespace-pre-wrap leading-6">{aiReview}</div>}
              {aiFollowUps.map((msg, i) =>
                msg.role === 'user' ? (
                  <div key={i} className="flex items-start gap-3 justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-accent/15 border border-accent/20 px-4 py-2.5">
                      <div className="text-sm text-gray-200 whitespace-pre-wrap leading-6">{msg.content}</div>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex items-start gap-3">
                    <Sparkles size={16} className="text-accent-light shrink-0 mt-1" />
                    <div className="text-sm text-gray-200 whitespace-pre-wrap leading-6 flex-1">{msg.content}</div>
                  </div>
                )
              )}
              {aiFollowUpLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 size={14} className="animate-spin" />
                  {t('detail.thinking')}
                </div>
              )}
            </div>
            <div className="border-t border-surface-border shrink-0">
              {aiReview && !aiLoading && (
                <div className="px-6 py-3 flex items-center gap-3">
                  <input
                    type="text"
                    value={aiFollowUpInput}
                    onChange={(e) => setAIFollowUpInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void sendAIFollowUp()
                      }
                    }}
                    placeholder={t('detail.followUpPlaceholder')}
                    disabled={aiFollowUpLoading}
                    className="flex-1 bg-surface rounded-lg border border-surface-border px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent/40 disabled:opacity-50"
                  />
                  <button
                    onClick={() => void sendAIFollowUp()}
                    disabled={aiFollowUpLoading || !aiFollowUpInput.trim()}
                    className="rounded-lg p-2 text-accent-light hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SendHorizontal size={16} />
                  </button>
                </div>
              )}
              {aiReviewMeta && (
                <div className="px-6 py-3 border-t border-surface-border">
                  <span className="text-[11px] text-gray-500">
                    {aiReviewMeta.providerLabel} · {aiReviewMeta.model}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Footer */}
      <div className="px-3 py-2 border-t border-surface-border shrink-0 flex justify-end">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-destructive">{t('detail.deleteConfirm')}</span>
            <button
              onClick={() => onDelete(log)}
              className="px-2.5 py-1 text-xs rounded-md bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
            >
              {t('actions.confirm')}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2.5 py-1 text-xs rounded-md text-gray-500 hover:text-gray-300 transition-colors"
            >
              {t('actions.cancel')}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md text-gray-600 hover:text-destructive transition-colors"
          >
            <Trash2 size={12} />
            {t('actions.deleteLog')}
          </button>
        )}
      </div>
    </div>
  )
}

function HighlightedLogText({
  content,
  matches,
  activeMatchIndex,
  matchRefs
}: {
  content: string
  matches: Array<{ start: number; end: number }>
  activeMatchIndex: number
  matchRefs: MutableRefObject<Array<HTMLElement | null>>
}): JSX.Element {
  if (matches.length === 0) {
    return <>{content}</>
  }

  const segments: JSX.Element[] = []
  let cursor = 0

  matches.forEach((match, index) => {
    if (cursor < match.start) {
      segments.push(
        <span key={`text-${match.start}`}>
          {content.slice(cursor, match.start)}
        </span>
      )
    }

    segments.push(
      <mark
        key={`match-${match.start}`}
        ref={(element) => {
          matchRefs.current[index] = element
        }}
        className={`rounded px-0.5 ${
          index === activeMatchIndex
            ? 'bg-accent text-white'
            : 'bg-caution/40 text-gray-200'
        }`}
      >
        {content.slice(match.start, match.end)}
      </mark>
    )

    cursor = match.end
  })

  if (cursor < content.length) {
    segments.push(<span key={`text-tail-${cursor}`}>{content.slice(cursor)}</span>)
  }

  return <>{segments}</>
}

function ExitDiagnosticsButton({
  diagnostics,
  compact = false
}: {
  diagnostics: ExitDiagnostics | null
  compact?: boolean
}): JSX.Element | null {
  const { t } = useTranslation('logs')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ left: number; top: number; width: number }>({
    left: 0,
    top: 0,
    width: 320
  })

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent): void => {
      const target = event.target as Node
      if (!wrapperRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return

    const updatePosition = (): void => {
      if (!buttonRef.current) return

      const rect = buttonRef.current.getBoundingClientRect()
      const pad = 8
      const gap = 8
      const width = Math.min(320, window.innerWidth - pad * 2)
      const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 260
      const preferredLeft = rect.left + rect.width / 2 - width / 2
      const left = Math.max(pad, Math.min(preferredLeft, window.innerWidth - pad - width))
      const spaceBelow = window.innerHeight - rect.bottom - pad
      const spaceAbove = rect.top - pad
      const showAbove = panelHeight > spaceBelow && spaceAbove > spaceBelow
      const top = showAbove
        ? Math.max(pad, rect.top - gap - panelHeight)
        : Math.min(window.innerHeight - pad - panelHeight, rect.bottom + gap)

      setCoords({
        left,
        top: Math.max(pad, top),
        width
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  if (!diagnostics) return null

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`rounded-full border border-surface-border text-gray-500 hover:text-accent-light hover:border-accent/30 transition-colors ${
          compact ? 'p-0.5' : 'p-1'
        }`}
        title={t('diagnostics.likelyCauses')}
      >
        <Info size={compact ? 11 : 12} />
      </button>
      {open && (
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[140] rounded-xl border border-surface-border bg-surface shadow-2xl shadow-black/40"
            style={{
              left: coords.left,
              top: coords.top,
              width: coords.width,
              maxHeight: 'min(420px, calc(100vh - 16px))'
            }}
          >
            <div className="px-3 py-2 border-b border-surface-border">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-light">
                {t('diagnostics.title')}
              </div>
              <div className="mt-1 text-xs text-gray-400 leading-5">
                {diagnostics.summary}
              </div>
            </div>
            <div className="px-3 py-3 space-y-3 overflow-auto">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-gray-500">{t('diagnostics.likelyCauses')}</div>
                <ul className="mt-2 space-y-1.5 text-xs text-gray-300 leading-5 list-disc pl-4">
                  {diagnostics.suspectedIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-gray-500">{t('diagnostics.nextChecks')}</div>
                <ul className="mt-2 space-y-1.5 text-xs text-gray-400 leading-5 list-disc pl-4">
                  {diagnostics.nextChecks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>,
          document.body
        )
      )}
    </div>
  )
}

function formatDuration(durationMs: number): string {
  if (durationMs < 60_000) return `${Math.round(durationMs / 1000)}s`
  if (durationMs < 3_600_000) return `${Math.round(durationMs / 60_000)}m`
  return `${(durationMs / 3_600_000).toFixed(1)}h`
}

function formatDurationDelta(durationMs: number | null, t: LogTranslator): string {
  if (durationMs === null) return t('compare.notAvailable')
  if (durationMs === 0) return t('compare.noChange')
  const prefix = durationMs > 0 ? '+' : '-'
  return `${prefix}${formatDuration(Math.abs(durationMs))}`
}

function getRunStatusMeta(status: RunStatus | RunStepRecord['status'], t?: LogTranslator): {
  label: string
  tone: string
  icon: typeof PlayCircle
} {
  switch (status) {
    case 'completed':
      return { label: t?.('status.completed') ?? 'completed', tone: 'text-safe', icon: CheckCircle2 }
    case 'failed':
      return { label: t?.('status.failed') ?? 'failed', tone: 'text-destructive', icon: XCircle }
    case 'cancelled':
      return { label: t?.('status.cancelled') ?? 'cancelled', tone: 'text-destructive', icon: XCircle }
    case 'awaiting_approval':
      return { label: t?.('status.awaitingApproval') ?? 'awaiting approval', tone: 'text-caution', icon: PauseCircle }
    case 'running':
    case 'running_command':
    case 'waiting_for_shell':
    case 'waiting_for_delay':
      return { label: t?.('status.running') ?? 'running', tone: 'text-accent-light', icon: PlayCircle }
    case 'pending':
      return { label: t?.('status.pending') ?? 'pending', tone: 'text-gray-500', icon: PlayCircle }
    default:
      return { label: status, tone: 'text-gray-500', icon: PlayCircle }
  }
}

function getRunComparisonChangeMeta(row: RunComparisonRow, t: LogTranslator): {
  label: string
  tone: string
} {
  switch (row.changeKind) {
    case 'added':
      return { label: t('compare.added'), tone: 'text-safe' }
    case 'removed':
      return { label: t('compare.removed'), tone: 'text-gray-400' }
    case 'type-changed':
      return { label: t('compare.typeChanged'), tone: 'text-caution' }
    case 'status-changed':
      return { label: t('compare.statusChanged'), tone: 'text-destructive' }
    case 'content-changed':
      return { label: t('compare.contentChanged'), tone: 'text-accent-light' }
    default:
      return { label: t('compare.unchanged'), tone: 'text-gray-500' }
  }
}
