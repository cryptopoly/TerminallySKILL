import { describe, expect, it } from 'vitest'
import type { RunCommandStepRecord, RunRecord } from './run-schema'
import {
  buildRunComparisonRows,
  buildRunComparisonSummary,
  filterRuns,
  findPreviousComparableRun
} from './run-history'

function firstCommandStep(run: RunRecord): RunCommandStepRecord {
  const step = run.steps[0]
  if (step?.type !== 'command') throw new Error('fixture: expected a command step first')
  return step
}

function createRun(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    runId: overrides.runId ?? 'run-1',
    source: 'workflow',
    sessionId: overrides.sessionId ?? 'term-1',
    scriptId: overrides.scriptId ?? 'script-1',
    scriptName: overrides.scriptName ?? 'Deploy',
    projectId: overrides.projectId ?? 'proj-1',
    projectName: overrides.projectName ?? 'Alpha',
    cwd: overrides.cwd ?? '/repo',
    shell: overrides.shell ?? '/bin/zsh',
    logFilePath: overrides.logFilePath ?? null,
    startedAt: overrides.startedAt ?? '2026-03-08T10:00:00.000Z',
    endedAt: overrides.endedAt ?? '2026-03-08T10:01:00.000Z',
    status: overrides.status ?? 'completed',
    error: overrides.error ?? null,
    inputValues: overrides.inputValues ?? {},
    steps: overrides.steps ?? [
      {
        stepId: 'step-1',
        sourceIndex: 0,
        type: 'command',
        label: 'Build',
        status: 'completed',
        attempts: 1,
        exitCode: 0,
        startedAt: '2026-03-08T10:00:01.000Z',
        endedAt: '2026-03-08T10:00:20.000Z',
        commandString: 'npm run build',
        continueOnError: false,
        delayMs: 0,
        retryCount: 0
      }
    ]
  }
}

describe('run-history', () => {
  it('filters runs by query and normalized status', () => {
    const completed = createRun({ runId: 'run-1', status: 'completed' })
    const failed = createRun({
      runId: 'run-2',
      status: 'failed',
      error: 'Smoke failed',
      steps: [
        {
          ...firstCommandStep(completed),
          label: 'Smoke',
          status: 'failed',
          exitCode: 1,
          commandString: 'npm run smoke'
        }
      ]
    })
    const running = createRun({ runId: 'run-3', status: 'waiting_for_shell' })

    expect(filterRuns([completed, failed, running], 'smoke', 'all').map((run) => run.runId)).toEqual(['run-2'])
    expect(filterRuns([completed, failed, running], '', 'failed').map((run) => run.runId)).toEqual(['run-2'])
    expect(filterRuns([completed, failed, running], '', 'running').map((run) => run.runId)).toEqual(['run-3'])
  })

  it('finds the previous comparable run by script id and start time', () => {
    const current = createRun({ runId: 'run-3', startedAt: '2026-03-08T12:00:00.000Z' })
    const previous = createRun({ runId: 'run-2', startedAt: '2026-03-08T11:00:00.000Z' })
    const oldest = createRun({ runId: 'run-1', startedAt: '2026-03-08T10:00:00.000Z' })

    expect(findPreviousComparableRun([oldest, current, previous], current)?.runId).toBe('run-2')
  })

  it('builds comparison rows with change kinds', () => {
    const baseline = createRun()
    const candidate = createRun({
      runId: 'run-2',
      steps: [
        {
          ...firstCommandStep(baseline),
          status: 'failed',
          exitCode: 1
        },
        {
          ...firstCommandStep(baseline),
          stepId: 'step-2',
          sourceIndex: 1,
          label: 'Smoke',
          commandString: 'npm run smoke'
        }
      ]
    })

    const rows = buildRunComparisonRows(baseline, candidate)
    expect(rows).toHaveLength(2)
    expect(rows[0].changeKind).toBe('status-changed')
    expect(rows[1].changeKind).toBe('added')
  })

  it('summarizes regressions, fixes, and duration deltas', () => {
    const baseline = createRun({
      endedAt: '2026-03-08T10:01:00.000Z',
      steps: [
        {
          ...firstCommandStep(createRun()),
          status: 'failed',
          exitCode: 1
        }
      ]
    })
    const candidate = createRun({
      runId: 'run-2',
      endedAt: '2026-03-08T10:03:00.000Z',
      steps: [
        {
          ...firstCommandStep(createRun()),
          status: 'completed',
          exitCode: 0
        },
        {
          ...firstCommandStep(createRun()),
          stepId: 'step-2',
          sourceIndex: 1,
          label: 'Smoke',
          commandString: 'npm run smoke'
        }
      ]
    })

    expect(buildRunComparisonSummary(baseline, candidate)).toMatchObject({
      changedSteps: 2,
      addedSteps: 1,
      removedSteps: 0,
      regressions: 0,
      fixes: 1,
      durationDeltaMs: 120000
    })
  })
})
