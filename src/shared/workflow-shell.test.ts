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
  it('only claims shells whose integration we install', () => {
    expect(shellSupportsWorkflowStepMarkers('/bin/zsh')).toBe(true)
    expect(shellSupportsWorkflowStepMarkers('/usr/local/bin/bash')).toBe(true)
    expect(shellSupportsWorkflowStepMarkers('/usr/bin/fish')).toBe(false)
    expect(shellSupportsWorkflowStepMarkers('powershell.exe')).toBe(false)
  })

  it('builds a printf that reports the previous exit status for the run and step', () => {
    const command = buildWorkflowStepMarkerCommand('wf-abc-123', 'step-1')
    expect(command).toContain("'wf-abc-123' 'step-1' $?")
    expect(command).toContain('7337;workflow-step;%s;%s;%d')
  })

  it('refuses ids that would need shell quoting', () => {
    expect(buildWorkflowStepMarkerCommand("wf';rm -rf /", 'step-1')).toBeNull()
  })
})
