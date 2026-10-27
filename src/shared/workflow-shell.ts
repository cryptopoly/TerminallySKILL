/**
 * Shells whose integration hooks we install, and whose `printf` + `$?` we can rely on.
 * Other shells (fish, PowerShell, sh) fall back to the prompt-ready exit code.
 */
export function shellSupportsWorkflowStepMarkers(shell: string): boolean {
  return /(^|[\\/])(zsh|bash)(\.exe)?$/.test(shell)
}

/**
 * Command line that reports the exit status of the command just run, tagged with the run
 * and step it belongs to. Run ids are random per run, so output printed by the command
 * itself cannot forge a result for a step.
 */
export function buildWorkflowStepMarkerCommand(runId: string, stepId: string): string | null {
  const safe = /^[A-Za-z0-9._-]+$/
  if (!safe.test(runId) || !safe.test(stepId)) return null
  return `printf '\\033]7337;workflow-step;%s;%s;%d\\007' '${runId}' '${stepId}' $?`
}

export interface WorkflowStepResultEvent {
  runId: string
  stepId: string
  exitCode: number
}
