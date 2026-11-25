import { describe, expect, it } from 'vitest'
import {
  buildWorkflowStepMarkerCommand,
  isWorkflowStepMarkerLine,
  resolveWorkflowStepResult,
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
    expect(buildWorkflowStepMarkerCommand('wf-abc-123', 'step-1', '/bin/zsh', 3)).toBe(
      "printf '\\033]7337;workflow-step;%s;%s;%d\\007' 'wf-abc-123' 'step-1' $?"
    )
  })

  it('builds a short PowerShell step line that fits one row and reads $? and $LASTEXITCODE as arguments', () => {
    const runId = 'wf-8076a9ea-413a-46d5-824e-416527cfbab5'
    const command = buildWorkflowStepMarkerCommand(runId, '68d24924-afa5-4a62-b31d-11dac1bf84aa', 'powershell.exe', 2)
    expect(command).toBe('__TvStep 27cfbab5 2 $? $LASTEXITCODE')
    // With a prompt like "PS C:\Users\runneradmin> " it stays well inside an 80-column row
    expect(`PS C:\\Users\\runneradmin> ${command}`.length).toBeLessThan(80)
    expect(isWorkflowStepMarkerLine(command!)).toBe(true)
    expect(buildWorkflowStepMarkerCommand(runId, 's', 'pwsh', -1)).toBeNull()
  })

  it('maps a PowerShell result back to the run and step it belongs to', () => {
    const run = { runId: 'wf-8076a9ea-413a-46d5-824e-416527cfbab5', steps: [{ stepId: 'a' }, { stepId: 'b' }, { stepId: 'c' }] }
    expect(resolveWorkflowStepResult(run, { runId: '27cfbab5', stepId: '2', exitCode: 3 })).toEqual({
      runId: run.runId,
      stepId: 'c',
      exitCode: 3
    })
    // Another run's line, a step that does not exist, and zsh/bash results pass through unchanged
    expect(resolveWorkflowStepResult(run, { runId: 'deadbeef', stepId: '2', exitCode: 0 })).toEqual({ runId: 'deadbeef', stepId: '2', exitCode: 0 })
    expect(resolveWorkflowStepResult(run, { runId: '27cfbab5', stepId: '9', exitCode: 0 }).stepId).toBe('9')
    const full = { runId: run.runId, stepId: 'b', exitCode: 1 }
    expect(resolveWorkflowStepResult(run, full)).toBe(full)
    expect(resolveWorkflowStepResult(undefined, full)).toBe(full)
  })

  it('recognises the lines it types, in either shell', () => {
    expect(isWorkflowStepMarkerLine("printf '\\033]7337;workflow-step;%s;%s;%d\\007' 'wf-1' 's' $?")).toBe(true)
    expect(isWorkflowStepMarkerLine('__TvStep 27cfbab5 0 $? $LASTEXITCODE')).toBe(true)
    expect(isWorkflowStepMarkerLine('echo __TvStep')).toBe(false)
    expect(isWorkflowStepMarkerLine('npm test')).toBe(false)
  })

  it('refuses ids that would need shell quoting', () => {
    expect(buildWorkflowStepMarkerCommand("wf';rm -rf /", 'step-1', '/bin/zsh', 0)).toBeNull()
    expect(buildWorkflowStepMarkerCommand('wf-1', "s';Remove-Item C:\\", 'powershell.exe', 0)).toBeNull()
  })
})
