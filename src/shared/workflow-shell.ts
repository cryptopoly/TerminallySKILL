import { isPowerShell } from './local-shell'

/**
 * Shells whose exit status a step-marker command can report: zsh and bash through `printf` + `$?`,
 * PowerShell through `$?` + `$LASTEXITCODE`. Other shells (fish, sh) fall back to the prompt-ready exit code.
 */
export function shellSupportsWorkflowStepMarkers(shell: string): boolean {
  return /(^|[\\/])(zsh|bash)(\.exe)?$/.test(shell) || isPowerShell(shell)
}

/**
 * Command line that reports the exit status of the command just run, tagged with the run
 * and step it belongs to. Run ids are random per run, so output printed by the command
 * itself cannot forge a result for a step.
 */
export function buildWorkflowStepMarkerCommand(runId: string, stepId: string, shell: string): string | null {
  const safe = /^[A-Za-z0-9._-]+$/
  if (!safe.test(runId) || !safe.test(stepId)) return null
  if (isPowerShell(shell)) {
    // $? and $LASTEXITCODE are read as arguments, before anything else runs: a failed native command
    // reports its own code, a failed cmdlet 1. Windows PowerShell 5.1 has no `e escape, hence [char]27.
    return (
      `& { param($ok, $code) [Console]::Write([string][char]27 + ']7337;workflow-step;${runId};${stepId};' + ` +
      `$(if ($ok) { 0 } elseif ($code) { $code } else { 1 }) + [char]7) } $? $LASTEXITCODE`
    )
  }
  return `printf '\\033]7337;workflow-step;%s;%s;%d\\007' '${runId}' '${stepId}' $?`
}

export interface WorkflowStepResultEvent {
  runId: string
  stepId: string
  exitCode: number
}
