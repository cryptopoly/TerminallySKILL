import type { WorkflowActiveRun } from '../store/workflow-runner-store'

/**
 * A step's tagged result marker is typed into the shell right after the step's command. Commands that
 * flush the terminal's pending input (sudo, apt) throw that marker away, so the step would never report
 * a result. When the shell shows its prompt and no marker has arrived after this long, the prompt's own
 * exit code is used instead. A marker that survives runs within milliseconds of the prompt.
 */
export const STEP_MARKER_GRACE_MS = 1000

export interface WaitingStepSnapshot {
  runId: string
  stepId: string
  attempts: number
}

/** The command step a prompt-ready event should be checked against, or null when nothing is waiting. */
export function snapshotWaitingStep(run: WorkflowActiveRun | undefined): WaitingStepSnapshot | null {
  if (!run || run.status !== 'running_command') return null
  const step = run.steps[run.currentStepIndex]
  if (!step || step.type !== 'command' || step.status !== 'running') return null
  return { runId: run.runId, stepId: step.stepId, attempts: step.attempts }
}

/** True when the same attempt of the same step is still waiting for a result. */
export function isStillWaiting(run: WorkflowActiveRun | undefined, snapshot: WaitingStepSnapshot): boolean {
  const current = snapshotWaitingStep(run)
  return (
    current !== null &&
    current.runId === snapshot.runId &&
    current.stepId === snapshot.stepId &&
    current.attempts === snapshot.attempts
  )
}
