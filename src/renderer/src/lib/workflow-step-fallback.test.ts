import { describe, expect, it } from 'vitest'
import { isStillWaiting, snapshotWaitingStep } from './workflow-step-fallback'
import type { WorkflowActiveRun } from '../store/workflow-runner-store'

function run(overrides: Partial<WorkflowActiveRun> = {}, stepOverrides: Record<string, unknown> = {}): WorkflowActiveRun {
  return {
    runId: 'run-1',
    sessionId: 's1',
    currentStepIndex: 0,
    status: 'running_command',
    stepMarkers: true,
    steps: [{ stepId: 'a', type: 'command', status: 'running', attempts: 1, ...stepOverrides }],
    ...overrides
  } as unknown as WorkflowActiveRun
}

describe('workflow step fallback', () => {
  it('snapshots only a running command step', () => {
    expect(snapshotWaitingStep(run())).toEqual({ runId: 'run-1', stepId: 'a', attempts: 1 })
    expect(snapshotWaitingStep(undefined)).toBeNull()
    expect(snapshotWaitingStep(run({ status: 'waiting_for_shell' }))).toBeNull()
    expect(snapshotWaitingStep(run({}, { type: 'note' }))).toBeNull()
    expect(snapshotWaitingStep(run({}, { status: 'completed' }))).toBeNull()
  })

  it('is still waiting only for the same attempt of the same step', () => {
    const snapshot = snapshotWaitingStep(run())!
    expect(isStillWaiting(run(), snapshot)).toBe(true)
    // the marker arrived and the step finished
    expect(isStillWaiting(run({}, { status: 'completed' }), snapshot)).toBe(false)
    // the next step started
    expect(isStillWaiting(run({}, { stepId: 'b' }), snapshot)).toBe(false)
    // the step was retried
    expect(isStillWaiting(run({}, { attempts: 2 }), snapshot)).toBe(false)
    expect(isStillWaiting(run({ runId: 'run-2' }), snapshot)).toBe(false)
    expect(isStillWaiting(undefined, snapshot)).toBe(false)
  })
})
