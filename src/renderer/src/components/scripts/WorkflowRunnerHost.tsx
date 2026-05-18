import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRunScript } from '../../hooks/useRunScript'
import clsx from 'clsx'
import { AlertTriangle, CheckCircle2, Loader2, PauseCircle, Play, Square, XCircle } from 'lucide-react'
import {
  isTerminalRunStatus,
  useWorkflowRunnerStore,
  type WorkflowActiveRun,
  type WorkflowActiveRunStep,
  type WorkflowRunStatus,
  type WorkflowSessionState
} from '../../store/workflow-runner-store'
import { useScriptStore } from '../../store/script-store'
import { useTerminalStore } from '../../store/terminal-store'
import type { ShellPromptReadyEvent } from '../../../../shared/shell-integration'
import { useProjectStore } from '../../store/project-store'
import { buildEnvOverrides } from '../../../../shared/project-schema'
import type { RunRecord, RunStepRecord, TerminalSessionInfo } from '../../../../shared/run-schema'
import { buildProjectWorkspaceCommandString } from '../../../../shared/workspace-target'
import { formatWorkflowRunError } from '../../lib/workflow-run-errors'

type ScriptTranslator = (key: string, options?: Record<string, unknown>) => string

function getStatusLabel(status: WorkflowRunStatus, t: ScriptTranslator): string {
  switch (status) {
    case 'waiting_for_shell':
      return t('runner.status.waitingForShell')
    case 'waiting_for_delay':
      return t('runner.status.waitingForDelay')
    case 'awaiting_approval':
      return t('runner.status.awaitingApproval')
    case 'running_command':
      return t('runner.status.runningStep')
    case 'completed':
      return t('runner.status.completed')
    case 'failed':
      return t('runner.status.failed')
    case 'cancelled':
      return t('runner.status.cancelled')
    default:
      return t('runner.status.running')
  }
}

export function WorkflowRunnerEngine(): JSX.Element {
  const runsBySession = useWorkflowRunnerStore((s) => s.runsBySession)
  const sessionStates = useWorkflowRunnerStore((s) => s.sessionStates)
  const { markSessionReady, markSessionExecuting, markSessionClosed, handleStepResult } = useWorkflowRunnerStore()

  useEffect(() => {
    const unsubReady = window.electronAPI.onShellReady((sessionId) => {
      markSessionReady(sessionId)
    })
    const unsubExit = window.electronAPI.onTerminalExit((sessionId) => {
      markSessionClosed(sessionId)
    })
    // Listen for prompt-ready events with exit codes to detect workflow step completion
    const unsubShellEvent = window.electronAPI.onShellEvent((sessionId, event) => {
      if (event.type !== 'prompt-ready') return
      const promptEvent = event as ShellPromptReadyEvent
      if (promptEvent.exitCode === null) return

      const run = useWorkflowRunnerStore.getState().runsBySession[sessionId]
      if (!run || isTerminalRunStatus(run.status) || run.status !== 'running_command') return

      const currentStep = run.steps[run.currentStepIndex]
      if (!currentStep || currentStep.type !== 'command') return

      handleStepResult(sessionId, {
        runId: run.runId,
        stepId: currentStep.stepId,
        exitCode: promptEvent.exitCode
      })
    })

    return () => {
      unsubReady()
      unsubExit()
      unsubShellEvent()
    }
  }, [handleStepResult, markSessionClosed, markSessionReady])

  return (
    <>
      {Object.values(runsBySession).map((activeRun) => (
        <WorkflowRunController
          key={activeRun.runId}
          activeRun={activeRun}
          sessionState={sessionStates[activeRun.sessionId] ?? 'unknown'}
          markSessionExecuting={markSessionExecuting}
        />
      ))}
    </>
  )
}

function WorkflowRunController({
  activeRun,
  sessionState,
  markSessionExecuting
}: {
  activeRun: WorkflowActiveRun
  sessionState: WorkflowSessionState
  markSessionExecuting: (sessionId: string) => void
}): null {
  const projects = useProjectStore((s) => s.projects)
  const {
    markWaitingForShell,
    markWaitingForDelay,
    markCurrentCommandRunning,
    completeCurrentNoteStep,
    awaitCurrentApproval,
    completeCurrentApprovalStep,
    completeRun
  } = useWorkflowRunnerStore()
  const completedRunIdRef = useRef<string | null>(null)
  const [sessionInfo, setSessionInfo] = useState<TerminalSessionInfo | null>(null)

  const currentStep = activeRun.steps[activeRun.currentStepIndex] ?? null
  const runProject = useMemo(
    () =>
      projects.find(
        (project) => project.id === (sessionInfo?.projectId ?? activeRun.script.projectId ?? '')
      ) ?? null,
    [activeRun.script.projectId, projects, sessionInfo?.projectId]
  )

  useEffect(() => {
    let cancelled = false
    void window.electronAPI.getSessionInfo(activeRun.sessionId).then((info) => {
      if (!cancelled) {
        setSessionInfo(info)
      }
    })

    return () => {
      cancelled = true
    }
  }, [activeRun.runId, activeRun.sessionId])

  useEffect(() => {
    void window.electronAPI.upsertRunRecord(buildRunRecord(activeRun, sessionInfo))
  }, [activeRun, sessionInfo])

  useEffect(() => {
    if (activeRun.status !== 'completed') {
      completedRunIdRef.current = null
      return
    }

    if (completedRunIdRef.current === activeRun.runId) return
    completedRunIdRef.current = activeRun.runId

    if (activeRun.fromIndex === 0 && !activeRun.singleOnly) {
      void window.electronAPI.markScriptRun(activeRun.script.id)
      const currentScript = useScriptStore.getState().scripts.find((script) => script.id === activeRun.script.id)
      if (currentScript) {
        useScriptStore.getState().updateScriptInStore({
          ...currentScript,
          lastRunAt: new Date().toISOString()
        })
      }
    }
  }, [activeRun])

  const dispatchCurrentCommand = useCallback(() => {
    if (!currentStep || currentStep.type !== 'command') return

    useTerminalStore.getState().setTerminalVisible(true)
    if (currentStep.attempts === 0) {
      useTerminalStore.getState().addToHistory(currentStep.commandString)
    }

    markCurrentCommandRunning(activeRun.sessionId)
    markSessionExecuting(activeRun.sessionId)

    const envOverrides = runProject ? buildEnvOverrides(runProject.envVars) : undefined
    const command = buildProjectWorkspaceCommandString(runProject, currentStep.commandString, envOverrides)
    window.electronAPI.writeToTerminal(activeRun.sessionId, command + '\n')
  }, [activeRun.runId, activeRun.sessionId, currentStep, markCurrentCommandRunning, markSessionExecuting, runProject])

  useEffect(() => {
    if (isTerminalRunStatus(activeRun.status) || activeRun.status === 'awaiting_approval') {
      return
    }

    if (!currentStep) {
      completeRun(activeRun.sessionId)
      return
    }

    if (activeRun.status === 'running_command') {
      return
    }

    if (currentStep.status !== 'pending') {
      return
    }

    if (currentStep.type === 'note') {
      completeCurrentNoteStep(activeRun.sessionId)
      return
    }

    if (currentStep.type === 'approval') {
      if (currentStep.requireConfirmation) {
        awaitCurrentApproval(activeRun.sessionId)
      } else {
        completeCurrentApprovalStep(activeRun.sessionId)
      }
      return
    }

    if (sessionState !== 'idle') {
      markWaitingForShell(activeRun.sessionId)
      return
    }

    if (currentStep.delayMs > 0) {
      if (activeRun.status !== 'waiting_for_delay') {
        markWaitingForDelay(activeRun.sessionId)
        return
      }

      const timeoutId = window.setTimeout(() => {
        dispatchCurrentCommand()
      }, currentStep.delayMs)

      return () => window.clearTimeout(timeoutId)
    }

    dispatchCurrentCommand()
  }, [
    activeRun,
    awaitCurrentApproval,
    completeCurrentApprovalStep,
    completeCurrentNoteStep,
    completeRun,
    currentStep,
    dispatchCurrentCommand,
    markWaitingForDelay,
    markWaitingForShell,
    sessionState
  ])

  return null
}

export function WorkflowRunPanel({
  sessionId,
  className
}: {
  sessionId: string
  className?: string
}): JSX.Element | null {
  const { t } = useTranslation('scripts')
  const activeRun = useWorkflowRunnerStore((s) => s.runsBySession[sessionId] ?? null)
  const { approveCurrentStep, cancelRun, dismissRun } = useWorkflowRunnerStore()

  const progressLabel = activeRun
    ? `${Math.min(activeRun.currentStepIndex + 1, activeRun.steps.length)} / ${activeRun.steps.length}`
    : null
  const statusTone = useMemo(() => {
    if (!activeRun) return 'text-gray-400'
    if (activeRun.status === 'completed') return 'text-safe'
    if (activeRun.status === 'failed' || activeRun.status === 'cancelled') return 'text-destructive'
    if (activeRun.status === 'awaiting_approval') return 'text-caution'
    return 'text-accent-light'
  }, [activeRun])

  if (!activeRun) return null

  return (
    <aside className={clsx('flex h-full flex-col overflow-hidden bg-surface', className)}>
      <div className="px-4 py-3 border-b border-surface-border flex items-start justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-200 truncate">{activeRun.script.name}</div>
          <div className={`text-xs mt-1 ${statusTone}`}>
            {getStatusLabel(activeRun.status, t)}
            {progressLabel ? ` · ${progressLabel}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeRun.status === 'awaiting_approval' && (
            <button
              onClick={() => approveCurrentStep(sessionId)}
              className="tv-btn-accent h-8 px-3 text-xs"
            >
              <Play size={12} />
              {t('runner.actions.continue')}
            </button>
          )}
          {!isTerminalRunStatus(activeRun.status) ? (
            <button
              onClick={() => {
                if (activeRun.status === 'running_command') {
                  window.electronAPI.writeToTerminal(activeRun.sessionId, '\u0003')
                }
                cancelRun(sessionId)
              }}
              className="tv-btn-ghost h-8 px-3 text-xs"
            >
              <Square size={12} />
              {t('runner.actions.stop')}
            </button>
          ) : (
            <button
              onClick={() => dismissRun(sessionId)}
              className="tv-btn-ghost h-8 px-3 text-xs"
            >
              {t('runner.actions.close')}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {activeRun.steps.map((step, index) => {
          const isCurrent = index === activeRun.currentStepIndex
          const isExpanded = isCurrent && !isTerminalRunStatus(activeRun.status)

          return (
            <div
              key={step.stepId}
              className={clsx(
                'rounded-lg border px-3 text-xs transition-all',
                isCurrent
                  ? 'border-accent/30 bg-accent/5 py-3'
                  : step.status === 'completed'
                    ? 'border-safe/20 bg-safe/5 py-2'
                    : step.status === 'failed'
                      ? 'border-destructive/20 bg-destructive/5 py-2'
                      : 'border-surface-border bg-surface-light py-2'
              )}
            >
              <div className="flex items-center gap-2">
                {isCurrent ? (
                  activeRun.status === 'awaiting_approval' ? (
                    <PauseCircle size={13} className="text-caution shrink-0" />
                  ) : activeRun.status === 'failed' ? (
                    <XCircle size={13} className="text-destructive shrink-0" />
                  ) : activeRun.status === 'completed' ? (
                    <CheckCircle2 size={13} className="text-safe shrink-0" />
                  ) : (
                    <Loader2 size={13} className="text-accent-light animate-spin shrink-0" />
                  )
                ) : step.status === 'completed' ? (
                  <CheckCircle2 size={12} className="text-safe/60 shrink-0" />
                ) : step.status === 'failed' ? (
                  <XCircle size={12} className="text-destructive/60 shrink-0" />
                ) : (
                  <span className="font-mono text-gray-500 w-3 text-center shrink-0">{step.sourceIndex + 1}</span>
                )}
                <span className={clsx('truncate', isCurrent ? 'text-gray-200' : 'text-gray-300')}>
                  {step.label}
                </span>
                {!isCurrent && (
                  <span className="ml-auto uppercase tracking-wide text-[10px] text-gray-500 shrink-0">
                    {step.status}
                  </span>
                )}
                {isCurrent && step.type === 'command' && (
                  <span className="ml-auto text-[10px] text-gray-500 shrink-0">
                    {t('runner.attempt', { current: Math.max(step.attempts, 1), total: step.retryCount + 1 })}
                  </span>
                )}
              </div>

              {isExpanded && (
                <div className="mt-2 text-xs text-gray-400 whitespace-pre-wrap leading-6 break-words">
                  {step.type === 'command'
                    ? step.commandString
                    : step.type === 'approval'
                      ? step.message
                      : step.content}
                </div>
              )}

              {isExpanded && step.type === 'command' && step.exitCode !== null && (
                <div className="mt-1.5 text-[11px] text-gray-500">
                  {t('runner.exit', { code: step.exitCode })}
                </div>
              )}
            </div>
          )
        })}

        {activeRun.error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-gray-400 flex items-start gap-2">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-destructive" />
            <span>{formatWorkflowRunError(activeRun.error, t)}</span>
          </div>
        )}
      </div>
    </aside>
  )
}

function buildRunRecord(
  activeRun: WorkflowActiveRun,
  sessionInfo: TerminalSessionInfo | null
): RunRecord {
  return {
    runId: activeRun.runId,
    source: 'workflow',
    sessionId: activeRun.sessionId,
    scriptId: activeRun.script.id,
    scriptName: activeRun.script.name,
    projectId: sessionInfo?.projectId ?? activeRun.script.projectId,
    projectName: sessionInfo?.projectName ?? null,
    cwd: sessionInfo?.projectWorkingDir ?? sessionInfo?.cwd ?? null,
    shell: sessionInfo?.shell ?? null,
    logFilePath: null,
    startedAt: activeRun.startedAt,
    endedAt: activeRun.endedAt,
    status: activeRun.status,
    error: activeRun.error,
    inputValues: activeRun.inputValues,
    steps: activeRun.steps.map((step) => buildRunStepRecord(step))
  }
}

function buildRunStepRecord(step: WorkflowActiveRunStep): RunStepRecord {
  if (step.type === 'command') {
    return {
      stepId: step.stepId,
      sourceIndex: step.sourceIndex,
      type: 'command',
      label: step.label,
      status: step.status,
      attempts: step.attempts,
      exitCode: step.exitCode,
      startedAt: step.startedAt,
      endedAt: step.endedAt,
      commandString: step.commandString,
      continueOnError: step.continueOnError,
      delayMs: step.delayMs,
      retryCount: step.retryCount
    }
  }

  if (step.type === 'approval') {
    return {
      stepId: step.stepId,
      sourceIndex: step.sourceIndex,
      type: 'approval',
      label: step.label,
      status: step.status,
      attempts: step.attempts,
      exitCode: step.exitCode,
      startedAt: step.startedAt,
      endedAt: step.endedAt,
      message: step.message,
      requireConfirmation: step.requireConfirmation
    }
  }

  return {
    stepId: step.stepId,
    sourceIndex: step.sourceIndex,
    type: 'note',
    label: step.label,
    status: step.status,
    attempts: step.attempts,
    exitCode: step.exitCode,
    startedAt: step.startedAt,
    endedAt: step.endedAt,
    content: step.content
  }
}
