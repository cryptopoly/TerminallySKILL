import { isPowerShell } from './local-shell'

/**
 * Shells whose exit status a step-marker command can report: zsh and bash through `printf` + `$?`,
 * PowerShell through `$?` + `$LASTEXITCODE`. Other shells (fish, sh) fall back to the prompt-ready exit code.
 */
export function shellSupportsWorkflowStepMarkers(shell: string): boolean {
  return /(^|[\\/])(zsh|bash)(\.exe)?$/.test(shell) || isPowerShell(shell)
}

/** The run id as PowerShell step lines carry it: its last 8 letters and digits, random per run. */
function shortRunId(runId: string): string {
  return runId.replace(/[^A-Za-z0-9]/g, '').slice(-8)
}

/**
 * Command line that reports the exit status of the command just run, tagged with the run
 * and step it belongs to. Run ids are random per run, so output printed by the command
 * itself cannot forge a result for a step.
 *
 * PowerShell calls __TvStep from its shell integration, which erases the typed line again. The line
 * carries a short run id and the step's position so it stays on one row; resolveWorkflowStepResult
 * maps them back.
 */
export function buildWorkflowStepMarkerCommand(
  runId: string,
  stepId: string,
  shell: string,
  stepIndex: number
): string | null {
  const safe = /^[A-Za-z0-9._-]+$/
  if (!safe.test(runId) || !safe.test(stepId)) return null
  if (isPowerShell(shell)) {
    if (!Number.isInteger(stepIndex) || stepIndex < 0) return null
    // $? and $LASTEXITCODE are read as arguments, before anything else runs
    return `__TvStep ${shortRunId(runId)} ${stepIndex} $? $LASTEXITCODE`
  }
  return `printf '\\033]7337;workflow-step;%s;%s;%d\\007' '${runId}' '${stepId}' $?`
}

/** True for a command line the workflow runner typed to report a step's result, not a step of its own. */
export function isWorkflowStepMarkerLine(command: string): boolean {
  return command.includes('workflow-step;') || /^\s*__TvStep\s/.test(command)
}

/** Maps a PowerShell step result (short run id, step position) back to the run's ids; other results pass through. */
export function resolveWorkflowStepResult(
  run: { runId: string; steps: Array<{ stepId: string }> } | null | undefined,
  result: WorkflowStepResultEvent
): WorkflowStepResultEvent {
  if (!run || result.runId !== shortRunId(run.runId) || !/^\d+$/.test(result.stepId)) return result
  const step = run.steps[Number(result.stepId)]
  return step ? { ...result, runId: run.runId, stepId: step.stepId } : result
}

export interface WorkflowStepResultEvent {
  runId: string
  stepId: string
  exitCode: number
}
