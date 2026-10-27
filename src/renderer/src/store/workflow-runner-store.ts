import { create } from 'zustand'
import type { Script } from '../../../shared/script-schema'
import type { ScriptRunStep, WorkflowInputValues } from '../../../shared/workflow-execution'
import { buildScriptRunSteps } from '../../../shared/workflow-execution'
import type { WorkflowStepResultEvent } from '../../../shared/workflow-shell'

export type WorkflowSessionState = 'unknown' | 'idle' | 'executing' | 'closed'
export type WorkflowRunStatus =
  | 'running'
  | 'waiting_for_shell'
  | 'waiting_for_delay'
  | 'awaiting_approval'
  | 'running_command'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type WorkflowRunStepStatus = 'pending' | 'running' | 'completed' | 'failed'

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

export type WorkflowActiveRunStep = DistributiveOmit<ScriptRunStep, 'id'> & {
  stepId: string
  status: WorkflowRunStepStatus
  attempts: number
  exitCode: number | null
  startedAt: string | null
  endedAt: string | null
}

export interface WorkflowActiveRun {
  runId: string
  script: Script
  sessionId: string
  startedAt: string
  endedAt: string | null
  inputValues: WorkflowInputValues
  fromIndex: number
  singleOnly: boolean
  currentStepIndex: number
  status: WorkflowRunStatus
  error: string | null
  steps: WorkflowActiveRunStep[]
}

interface WorkflowRunnerStore {
  runsBySession: Record<string, WorkflowActiveRun>
  sessionStates: Record<string, WorkflowSessionState>
  startRun: (params: {
    script: Script
    sessionId: string
    inputValues: WorkflowInputValues
    fromIndex?: number
    singleOnly?: boolean
  }) => WorkflowActiveRun | null
  markSessionReady: (sessionId: string) => void
  markSessionExecuting: (sessionId: string) => void
  markSessionClosed: (sessionId: string) => void
  markWaitingForShell: (sessionId: string) => void
  markWaitingForDelay: (sessionId: string) => void
  markCurrentCommandRunning: (sessionId: string) => void
  completeCurrentNoteStep: (sessionId: string) => void
  awaitCurrentApproval: (sessionId: string) => void
  completeCurrentApprovalStep: (sessionId: string) => void
  approveCurrentStep: (sessionId: string) => void
  handleStepResult: (sessionId: string, result: WorkflowStepResultEvent) => void
  completeRun: (sessionId: string) => void
  failRun: (sessionId: string, message: string) => void
  cancelRun: (sessionId: string, message?: string) => void
  dismissRun: (sessionId: string) => void
}

function createRunId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `wf-${crypto.randomUUID()}`
  }
  return `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function isTerminalRunStatus(status: WorkflowRunStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled'
}

function getCurrentStep(run: WorkflowActiveRun): WorkflowActiveRunStep | null {
  return run.steps[run.currentStepIndex] ?? null
}

function nowIso(): string {
  return new Date().toISOString()
}

function updateRunForSession(
  state: WorkflowRunnerStore,
  sessionId: string,
  updater: (run: WorkflowActiveRun) => WorkflowActiveRun | null
): Pick<WorkflowRunnerStore, 'runsBySession'> | WorkflowRunnerStore {
  const run = state.runsBySession[sessionId]
  if (!run) return state

  const nextRun = updater(run)
  if (nextRun === run) return state

  if (!nextRun) {
    const { [sessionId]: _removed, ...remainingRuns } = state.runsBySession
    return { runsBySession: remainingRuns }
  }

  return {
    runsBySession: {
      ...state.runsBySession,
      [sessionId]: nextRun
    }
  }
}

export const useWorkflowRunnerStore = create<WorkflowRunnerStore>((set, get) => ({
  runsBySession: {},
  sessionStates: {},

  startRun: ({ script, sessionId, inputValues, fromIndex = 0, singleOnly = false }) => {
    const existingRun = get().runsBySession[sessionId]
    if (existingRun && !isTerminalRunStatus(existingRun.status)) {
      return null
    }

    const steps = buildScriptRunSteps(script, { fromIndex, singleOnly, inputValues }).map((step) => ({
      ...step,
      stepId: step.id,
      status: 'pending' as WorkflowRunStepStatus,
      attempts: 0,
      exitCode: null,
      startedAt: null,
      endedAt: null
    }))

    if (steps.length === 0) return null

    const run: WorkflowActiveRun = {
      runId: createRunId(),
      script,
      sessionId,
      startedAt: nowIso(),
      endedAt: null,
      inputValues,
      fromIndex,
      singleOnly,
      currentStepIndex: 0,
      status: 'running',
      error: null,
      steps
    }

    set((state) => ({
      runsBySession: {
        ...state.runsBySession,
        [sessionId]: run
      },
      sessionStates: {
        ...state.sessionStates,
        [sessionId]: state.sessionStates[sessionId] ?? 'unknown'
      }
    }))

    return run
  },

  markSessionReady: (sessionId) =>
    set((state) => ({
      sessionStates: {
        ...state.sessionStates,
        [sessionId]: 'idle'
      }
    })),

  markSessionExecuting: (sessionId) =>
    set((state) => ({
      sessionStates: {
        ...state.sessionStates,
        [sessionId]: 'executing'
      }
    })),

  markSessionClosed: (sessionId) =>
    set((state) => {
      const nextSessionStates = state.sessionStates[sessionId] === 'closed'
        ? state.sessionStates
        : {
            ...state.sessionStates,
            [sessionId]: 'closed' as const
          }

      const run = state.runsBySession[sessionId]
      if (!run || isTerminalRunStatus(run.status)) {
        if (nextSessionStates === state.sessionStates) return state
        return { sessionStates: nextSessionStates }
      }

      const currentStep = getCurrentStep(run)
      const endedAt = nowIso()

      return {
        sessionStates: nextSessionStates,
        runsBySession: {
          ...state.runsBySession,
          [sessionId]: {
            ...run,
            status: 'failed',
            endedAt,
            error: 'Terminal session closed before the workflow completed.',
            steps: run.steps.map((step) =>
              currentStep && step.stepId === currentStep.stepId && step.status !== 'completed'
                ? {
                    ...step,
                    status: 'failed',
                    startedAt: step.startedAt ?? endedAt,
                    endedAt
                  }
                : step
            )
          }
        }
      }
    }),

  markWaitingForShell: (sessionId) =>
    set((state) =>
      updateRunForSession(state, sessionId, (run) => {
        if (isTerminalRunStatus(run.status) || run.status === 'waiting_for_shell') {
          return run
        }

        return {
          ...run,
          status: 'waiting_for_shell'
        }
      })
    ),

  markWaitingForDelay: (sessionId) =>
    set((state) =>
      updateRunForSession(state, sessionId, (run) => {
        if (isTerminalRunStatus(run.status) || run.status === 'waiting_for_delay') {
          return run
        }

        return {
          ...run,
          status: 'waiting_for_delay'
        }
      })
    ),

  markCurrentCommandRunning: (sessionId) =>
    set((state) =>
      updateRunForSession(state, sessionId, (run) => {
        const currentStep = getCurrentStep(run)
        if (!currentStep || currentStep.type !== 'command') return run

        const startedAt = nowIso()
        return {
          ...run,
          status: 'running_command',
          error: null,
          steps: run.steps.map((step) =>
            step.stepId === currentStep.stepId
              ? {
                  ...step,
                  status: 'running',
                  attempts: step.attempts + 1,
                  exitCode: null,
                  startedAt,
                  endedAt: null
                }
              : step
          )
        }
      })
    ),

  completeCurrentNoteStep: (sessionId) =>
    set((state) =>
      updateRunForSession(state, sessionId, (run) => {
        const currentStep = getCurrentStep(run)
        if (!currentStep || currentStep.type !== 'note') return run

        const timestamp = nowIso()
        return {
          ...run,
          status: 'running',
          currentStepIndex: run.currentStepIndex + 1,
          steps: run.steps.map((step) =>
            step.stepId === currentStep.stepId
              ? {
                  ...step,
                  status: 'completed',
                  startedAt: step.startedAt ?? timestamp,
                  endedAt: timestamp
                }
              : step
          )
        }
      })
    ),

  awaitCurrentApproval: (sessionId) =>
    set((state) =>
      updateRunForSession(state, sessionId, (run) => {
        const currentStep = getCurrentStep(run)
        if (!currentStep || currentStep.type !== 'approval' || run.status === 'awaiting_approval') {
          return run
        }

        const startedAt = currentStep.startedAt ?? nowIso()
        return {
          ...run,
          status: 'awaiting_approval',
          steps: run.steps.map((step) =>
            step.stepId === currentStep.stepId
              ? { ...step, status: 'running', startedAt, endedAt: null }
              : step
          )
        }
      })
    ),

  completeCurrentApprovalStep: (sessionId) =>
    set((state) =>
      updateRunForSession(state, sessionId, (run) => {
        const currentStep = getCurrentStep(run)
        if (!currentStep || currentStep.type !== 'approval') return run

        const endedAt = nowIso()
        return {
          ...run,
          status: 'running',
          currentStepIndex: run.currentStepIndex + 1,
          error: null,
          steps: run.steps.map((step) =>
            step.stepId === currentStep.stepId
              ? {
                  ...step,
                  status: 'completed',
                  startedAt: step.startedAt ?? endedAt,
                  endedAt
                }
              : step
          )
        }
      })
    ),

  approveCurrentStep: (sessionId) =>
    set((state) =>
      updateRunForSession(state, sessionId, (run) => {
        const currentStep = getCurrentStep(run)
        if (!currentStep || currentStep.type !== 'approval') return run

        const endedAt = nowIso()
        return {
          ...run,
          status: 'running',
          currentStepIndex: run.currentStepIndex + 1,
          error: null,
          steps: run.steps.map((step) =>
            step.stepId === currentStep.stepId
              ? {
                  ...step,
                  status: 'completed',
                  startedAt: step.startedAt ?? endedAt,
                  endedAt
                }
              : step
          )
        }
      })
    ),

  handleStepResult: (sessionId, result) =>
    set((state) =>
      updateRunForSession(state, sessionId, (run) => {
        if (isTerminalRunStatus(run.status) || run.runId !== result.runId) {
          return run
        }

        const currentStep = getCurrentStep(run)
        if (!currentStep || currentStep.type !== 'command' || currentStep.stepId !== result.stepId) {
          return run
        }

        const endedAt = nowIso()
        const hasRetryRemaining = result.exitCode !== 0 && currentStep.attempts <= currentStep.retryCount

        if (result.exitCode === 0) {
          return {
            ...run,
            status: 'running',
            error: null,
            currentStepIndex: run.currentStepIndex + 1,
            steps: run.steps.map((step) =>
              step.stepId === currentStep.stepId
                ? {
                    ...step,
                    status: 'completed',
                    exitCode: result.exitCode,
                    startedAt: step.startedAt ?? endedAt,
                    endedAt
                  }
                : step
            )
          }
        }

        if (hasRetryRemaining) {
          return {
            ...run,
            status: 'running',
            error: `${currentStep.label} failed with exit code ${result.exitCode}. Retrying.`,
            steps: run.steps.map((step) =>
              step.stepId === currentStep.stepId
                ? {
                    ...step,
                    status: 'pending',
                    exitCode: result.exitCode,
                    startedAt: step.startedAt ?? endedAt,
                    endedAt
                  }
                : step
            )
          }
        }

        if (currentStep.continueOnError) {
          return {
            ...run,
            status: 'running',
            error: `${currentStep.label} failed with exit code ${result.exitCode}. Continuing because continue on error is enabled.`,
            currentStepIndex: run.currentStepIndex + 1,
            steps: run.steps.map((step) =>
              step.stepId === currentStep.stepId
                ? {
                    ...step,
                    status: 'failed',
                    exitCode: result.exitCode,
                    startedAt: step.startedAt ?? endedAt,
                    endedAt
                  }
                : step
            )
          }
        }

        return {
          ...run,
          status: 'failed',
          endedAt,
          error: `${currentStep.label} failed with exit code ${result.exitCode}.`,
          steps: run.steps.map((step) =>
            step.stepId === currentStep.stepId
              ? {
                  ...step,
                  status: 'failed',
                  exitCode: result.exitCode,
                  startedAt: step.startedAt ?? endedAt,
                  endedAt
                }
              : step
          )
        }
      })
    ),

  completeRun: (sessionId) =>
    set((state) =>
      updateRunForSession(state, sessionId, (run) => {
        if (isTerminalRunStatus(run.status)) return run

        return {
          ...run,
          status: 'completed',
          endedAt: run.endedAt ?? nowIso(),
          error: null
        }
      })
    ),

  failRun: (sessionId, message) =>
    set((state) =>
      updateRunForSession(state, sessionId, (run) => {
        const endedAt = nowIso()
        return {
          ...run,
          status: 'failed',
          endedAt,
          error: message
        }
      })
    ),

  cancelRun: (sessionId, message = 'Workflow cancelled.') =>
    set((state) =>
      updateRunForSession(state, sessionId, (run) => {
        const currentStep = getCurrentStep(run)
        const endedAt = nowIso()

        return {
          ...run,
          status: 'cancelled',
          endedAt,
          error: message,
          steps: run.steps.map((step) =>
            currentStep && step.stepId === currentStep.stepId && step.status !== 'completed'
              ? {
                  ...step,
                  status: 'failed',
                  startedAt: step.startedAt ?? endedAt,
                  endedAt
                }
              : step
          )
        }
      })
    ),

  dismissRun: (sessionId) =>
    set((state) => updateRunForSession(state, sessionId, () => null))
}))
