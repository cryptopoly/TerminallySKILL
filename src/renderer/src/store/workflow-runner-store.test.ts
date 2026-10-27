import { beforeEach, describe, expect, it } from 'vitest'
import type { Script } from '../../../shared/script-schema'
import { useWorkflowRunnerStore } from './workflow-runner-store'

const baseScript: Script = {
  id: 'script-1',
  name: 'Deploy',
  description: 'deploy the app',
  inputs: [],
  steps: [
    {
      id: 'step-1',
      type: 'command',
      label: 'Build',
      enabled: true,
      commandString: 'npm run build',
      commandId: null,
      continueOnError: false,
      delayMs: 0,
      retryCount: 0
    }
  ],
  projectId: null,
  sourceScriptId: null,
  tags: [],
  createdAt: '2026-03-08T18:00:00.000Z',
  updatedAt: '2026-03-08T18:00:00.000Z',
  lastRunAt: null
}

function resetWorkflowRunnerStore(): void {
  useWorkflowRunnerStore.setState({
    runsBySession: {},
    sessionStates: {}
  })
}

function getRun(sessionId: string) {
  return useWorkflowRunnerStore.getState().runsBySession[sessionId]!
}

describe('workflow-runner-store', () => {
  beforeEach(() => {
    resetWorkflowRunnerStore()
  })

  it('allows concurrent runs in different sessions but blocks overlap in the same session', () => {
    const firstRun = useWorkflowRunnerStore.getState().startRun({
      script: baseScript,
      sessionId: 'term-1',
      inputValues: {}
    })

    const blockedRun = useWorkflowRunnerStore.getState().startRun({
      script: baseScript,
      sessionId: 'term-1',
      inputValues: {}
    })

    const secondSessionRun = useWorkflowRunnerStore.getState().startRun({
      script: baseScript,
      sessionId: 'term-2',
      inputValues: {}
    })

    expect(firstRun).not.toBeNull()
    expect(blockedRun).toBeNull()
    expect(secondSessionRun).not.toBeNull()
    expect(Object.keys(useWorkflowRunnerStore.getState().runsBySession)).toEqual(['term-1', 'term-2'])
  })

  it('retries command steps before succeeding', () => {
    useWorkflowRunnerStore.getState().startRun({
      script: {
        ...baseScript,
        steps: [
          {
            ...baseScript.steps[0],
            retryCount: 1
          }
        ]
      },
      sessionId: 'term-1',
      inputValues: {}
    })

    useWorkflowRunnerStore.getState().markCurrentCommandRunning('term-1')
    let run = getRun('term-1')

    useWorkflowRunnerStore.getState().handleStepResult('term-1', {
      runId: run.runId,
      stepId: run.steps[0].stepId,
      exitCode: 1
    })

    run = getRun('term-1')
    expect(run.status).toBe('running')
    expect(run.currentStepIndex).toBe(0)
    expect(run.steps[0].status).toBe('pending')
    expect(run.steps[0].attempts).toBe(1)
    expect(run.steps[0].exitCode).toBe(1)
    expect(run.error).toContain('Retrying')

    useWorkflowRunnerStore.getState().markCurrentCommandRunning('term-1')
    run = getRun('term-1')
    expect(run.steps[0].attempts).toBe(2)
    expect(run.steps[0].exitCode).toBeNull()

    useWorkflowRunnerStore.getState().handleStepResult('term-1', {
      runId: run.runId,
      stepId: run.steps[0].stepId,
      exitCode: 0
    })

    run = getRun('term-1')
    expect(run.status).toBe('running')
    expect(run.currentStepIndex).toBe(1)
    expect(run.steps[0].status).toBe('completed')
    expect(run.steps[0].exitCode).toBe(0)
  })

  it('routes step results to the matching session', () => {
    useWorkflowRunnerStore.getState().startRun({
      script: baseScript,
      sessionId: 'term-1',
      inputValues: {}
    })
    useWorkflowRunnerStore.getState().startRun({
      script: baseScript,
      sessionId: 'term-2',
      inputValues: {}
    })

    useWorkflowRunnerStore.getState().markCurrentCommandRunning('term-1')
    useWorkflowRunnerStore.getState().markCurrentCommandRunning('term-2')

    const run1 = getRun('term-1')
    const run2 = getRun('term-2')

    useWorkflowRunnerStore.getState().handleStepResult('term-2', {
      runId: run2.runId,
      stepId: run2.steps[0].stepId,
      exitCode: 0
    })

    expect(getRun('term-1').status).toBe('running_command')
    expect(getRun('term-1').currentStepIndex).toBe(0)
    expect(getRun('term-2').currentStepIndex).toBe(1)
    expect(getRun('term-2').steps[0].status).toBe('completed')
    expect(getRun('term-1').runId).toBe(run1.runId)
  })

  it('pauses on approval steps until they are approved', () => {
    useWorkflowRunnerStore.getState().startRun({
      script: {
        ...baseScript,
        steps: [
          {
            id: 'step-note',
            type: 'note',
            label: 'Review notes',
            enabled: true,
            content: 'Check the release notes'
          },
          {
            id: 'step-approval',
            type: 'approval',
            label: 'Confirm deploy',
            enabled: true,
            message: 'Ready to deploy?',
            requireConfirmation: true
          },
          baseScript.steps[0]
        ]
      },
      sessionId: 'term-1',
      inputValues: {}
    })

    useWorkflowRunnerStore.getState().completeCurrentNoteStep('term-1')
    useWorkflowRunnerStore.getState().awaitCurrentApproval('term-1')

    let run = getRun('term-1')
    expect(run.status).toBe('awaiting_approval')
    expect(run.currentStepIndex).toBe(1)
    expect(run.steps[1].status).toBe('running')

    useWorkflowRunnerStore.getState().approveCurrentStep('term-1')
    run = getRun('term-1')
    expect(run.status).toBe('running')
    expect(run.currentStepIndex).toBe(2)
    expect(run.steps[1].status).toBe('completed')
  })

  it('can auto-complete non-blocking approval checkpoints', () => {
    useWorkflowRunnerStore.getState().startRun({
      script: {
        ...baseScript,
        steps: [
          {
            id: 'step-approval',
            type: 'approval',
            label: 'Checkpoint',
            enabled: true,
            message: 'Heads up before deploy',
            requireConfirmation: false
          },
          baseScript.steps[0]
        ]
      },
      sessionId: 'term-1',
      inputValues: {}
    })

    useWorkflowRunnerStore.getState().completeCurrentApprovalStep('term-1')

    const run = getRun('term-1')
    expect(run.status).toBe('running')
    expect(run.currentStepIndex).toBe(1)
    expect(run.steps[0].status).toBe('completed')
  })

  it('marks only the matching session failed when a terminal closes mid-run', () => {
    useWorkflowRunnerStore.getState().startRun({
      script: baseScript,
      sessionId: 'term-1',
      inputValues: {}
    })
    useWorkflowRunnerStore.getState().startRun({
      script: baseScript,
      sessionId: 'term-2',
      inputValues: {}
    })

    useWorkflowRunnerStore.getState().markSessionClosed('term-1')

    expect(getRun('term-1').status).toBe('failed')
    expect(getRun('term-1').error).toContain('Terminal session closed')
    expect(getRun('term-1').steps[0].status).toBe('failed')
    expect(getRun('term-2').status).toBe('running')
    expect(getRun('term-2').steps[0].status).toBe('pending')
  })
})
