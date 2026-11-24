import { describe, expect, it } from 'vitest'
import {
  buildWorkflowStepMarkerCommand,
  shellSupportsWorkflowStepMarkers,
  type WorkflowStepResultEvent
} from './workflow-shell'

describe('workflow-shell', () => {
  it('exports a WorkflowStepResultEvent type with runId, stepId, and exitCode', () => {
    const event: WorkflowStepResultEvent = {
      runId: 'wf-run-1',
      stepId: 'step-2',
      exitCode: 0
    }

    expect(event.runId).toBe('wf-run-1')
    expect(event.stepId).toBe('step-2')
    expect(event.exitCode).toBe(0)
  })
})

describe('workflow step markers', () => {
  it('only claims shells that can report the exit status of the step', () => {
    expect(shellSupportsWorkflowStepMarkers('/bin/zsh')).toBe(true)
    expect(shellSupportsWorkflowStepMarkers('/usr/local/bin/bash')).toBe(true)
    expect(shellSupportsWorkflowStepMarkers('powershell.exe')).toBe(true)
    expect(shellSupportsWorkflowStepMarkers('C:\\Program Files\\PowerShell\\7\\pwsh.exe')).toBe(true)
    expect(shellSupportsWorkflowStepMarkers('/usr/bin/fish')).toBe(false)
    expect(shellSupportsWorkflowStepMarkers('/bin/sh')).toBe(false)
  })

  it('builds a printf that reports the previous exit status for the run and step', () => {
    expect(buildWorkflowStepMarkerCommand('wf-abc-123', 'step-1', '/bin/zsh')).toBe(
      "printf '\\033]7337;workflow-step;%s;%s;%d\\007' 'wf-abc-123' 'step-1' $?"
    )
  })

  it('builds a Windows PowerShell 5.1 marker that reads $? and $LASTEXITCODE before anything else runs', () => {
    const command = buildWorkflowStepMarkerCommand('wf-abc-123', 'step-1', 'powershell.exe')
    expect(command).toBe(
      "& { param($ok, $code) [Console]::Write([string][char]27 + ']7337;workflow-step;wf-abc-123;step-1;' + " +
        '$(if ($ok) { 0 } elseif ($code) { $code } else { 1 }) + [char]7) } $? $LASTEXITCODE'
    )
    // No `e escape (PowerShell 7 only), no printf
    expect(command).not.toContain('`e')
    expect(command).not.toContain('printf')
  })

  it('refuses ids that would need shell quoting', () => {
    expect(buildWorkflowStepMarkerCommand("wf';rm -rf /", 'step-1', '/bin/zsh')).toBeNull()
    expect(buildWorkflowStepMarkerCommand('wf-1', "s';Remove-Item C:\\", 'powershell.exe')).toBeNull()
  })
})
