import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import type { RunRecord, RunsData } from '../shared/run-schema'
import type { RunStatusFilter } from '../shared/run-history'
import { registerTerminalSession, resetTerminalSessionRegistry } from './terminal-session-registry'

const { mockGetPath } = vi.hoisted(() => ({
  mockGetPath: vi.fn()
}))

vi.mock('electron', () => ({
  app: {
    getPath: mockGetPath
  }
}))

import { attachLogToRuns, getRunIndex, resetRunManagerCache, searchRuns, upsertRunRecord } from './run-manager'

describe('run-manager', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'tv-runs-'))
    mockGetPath.mockReturnValue(tempDir)
    resetRunManagerCache()
    resetTerminalSessionRegistry()
  })

  afterEach(async () => {
    resetRunManagerCache()
    resetTerminalSessionRegistry()
    mockGetPath.mockReset()
    await rm(tempDir, { recursive: true, force: true })
  })

  it('upserts runs and returns them newest-first per project', async () => {
    const first: RunRecord = {
      runId: 'run-1',
      source: 'workflow',
      sessionId: 'term-1',
      scriptId: 'script-1',
      scriptName: 'Deploy',
      projectId: 'proj-1',
      projectName: 'Alpha',
      cwd: '/repo',
      shell: '/bin/zsh',
      logFilePath: null,
      startedAt: '2026-03-08T18:00:00.000Z',
      endedAt: null,
      status: 'running',
      error: null,
      inputValues: { channel: 'beta' },
      steps: [
        {
          stepId: 'step-1',
          sourceIndex: 0,
          type: 'command',
          label: 'Build',
          status: 'running',
          attempts: 1,
          exitCode: null,
          startedAt: '2026-03-08T18:00:01.000Z',
          endedAt: null,
          commandString: 'npm run build',
          continueOnError: false,
          delayMs: 0,
          retryCount: 0
        }
      ]
    }

    const second: RunRecord = {
      ...first,
      runId: 'run-2',
      sessionId: 'term-2',
      startedAt: '2026-03-08T18:05:00.000Z',
      status: 'completed',
      endedAt: '2026-03-08T18:06:00.000Z',
      steps: [
        {
          ...first.steps[0],
          status: 'completed',
          exitCode: 0,
          endedAt: '2026-03-08T18:05:30.000Z'
        }
      ]
    }

    await upsertRunRecord(first)
    await upsertRunRecord(second)
    await upsertRunRecord({
      ...first,
      status: 'failed',
      endedAt: '2026-03-08T18:01:00.000Z',
      error: 'Build failed.',
      steps: [
        {
          ...first.steps[0],
          status: 'failed',
          exitCode: 1,
          endedAt: '2026-03-08T18:00:20.000Z'
        }
      ]
    })

    const index = await getRunIndex('proj-1')
    expect(index).toHaveLength(2)
    expect(index[0].runId).toBe('run-2')
    expect(index[1].runId).toBe('run-1')
    expect(index[1].status).toBe('failed')
    expect(index[1].error).toBe('Build failed.')
    expect(index[1].steps[0]).toMatchObject({
      status: 'failed',
      exitCode: 1
    })
  })

  it('attaches saved logs back onto runs for the same terminal session', async () => {
    await upsertRunRecord({
      runId: 'run-1',
      source: 'workflow',
      sessionId: 'term-1',
      scriptId: 'script-1',
      scriptName: 'Deploy',
      projectId: 'proj-1',
      projectName: 'Alpha',
      cwd: '/repo',
      shell: '/bin/zsh',
      logFilePath: null,
      startedAt: '2026-03-08T18:00:00.000Z',
      endedAt: '2026-03-08T18:01:00.000Z',
      status: 'completed',
      error: null,
      inputValues: {},
      steps: []
    })

    await attachLogToRuns('term-1', '/tmp/logs/term-1.log')

    const index = await getRunIndex('proj-1')
    expect(index[0].logFilePath).toBe('/tmp/logs/term-1.log')
  })

  it('searches runs by query and status filter', async () => {
    const base: RunRecord = {
      runId: 'run-1',
      source: 'workflow',
      sessionId: 'term-1',
      scriptId: 'script-1',
      scriptName: 'Deploy',
      projectId: 'proj-1',
      projectName: 'Alpha',
      cwd: '/repo',
      shell: '/bin/zsh',
      logFilePath: null,
      startedAt: '2026-03-08T18:00:00.000Z',
      endedAt: '2026-03-08T18:01:00.000Z',
      status: 'completed',
      error: null,
      inputValues: {},
      steps: [
        {
          stepId: 'step-1',
          sourceIndex: 0,
          type: 'command',
          label: 'Deploy',
          status: 'completed',
          attempts: 1,
          exitCode: 0,
          startedAt: '2026-03-08T18:00:01.000Z',
          endedAt: '2026-03-08T18:00:20.000Z',
          commandString: 'npm run deploy',
          continueOnError: false,
          delayMs: 0,
          retryCount: 0
        }
      ]
    }

    await upsertRunRecord(base)
    await upsertRunRecord({
      ...base,
      runId: 'run-2',
      sessionId: 'term-2',
      status: 'failed',
      error: 'Smoke failed',
      startedAt: '2026-03-08T18:05:00.000Z',
      steps: [
        {
          ...base.steps[0],
          status: 'failed',
          exitCode: 1,
          commandString: 'npm run smoke'
        }
      ]
    })
    await upsertRunRecord({
      ...base,
      runId: 'run-3',
      sessionId: 'term-3',
      status: 'waiting_for_shell',
      endedAt: null,
      startedAt: '2026-03-08T18:06:00.000Z'
    })

    const failed = await searchRuns('proj-1', '', 'failed')
    const searched = await searchRuns('proj-1', 'smoke', 'all')
    const running = await searchRuns('proj-1', '', 'running' satisfies RunStatusFilter)

    expect(failed.map((run) => run.runId)).toEqual(['run-2'])
    expect(searched.map((run) => run.runId)).toEqual(['run-2'])
    expect(running.map((run) => run.runId)).toEqual(['run-3'])
  })

  it('backfills legacy run files with stable defaults', async () => {
    registerTerminalSession('term-9')

    const legacy: RunsData = {
      runs: [
        {
          runId: 'run-legacy',
          source: 'workflow',
          sessionId: 'term-9',
          scriptId: 'script-9',
          scriptName: 'Legacy Deploy',
          projectId: null,
          projectName: null,
          cwd: '/legacy',
          shell: null,
          logFilePath: null,
          startedAt: '2026-03-08T17:00:00.000Z',
          endedAt: null,
          status: 'running',
          error: null,
          inputValues: {},
          steps: [
            {
              stepId: 'step-1',
              sourceIndex: 0,
              type: 'command',
              label: 'Run',
              status: 'pending',
              attempts: 0,
              exitCode: null,
              commandString: 'npm test'
            } as RunRecord['steps'][number]
          ]
        }
      ]
    }

    const dataDir = join(tempDir, 'data')
    await mkdir(dataDir, { recursive: true })
    await writeFile(join(dataDir, 'runs.json'), JSON.stringify(legacy, null, 2), 'utf-8')

    const index = await getRunIndex(null)
    expect(index).toHaveLength(1)
    expect(index[0].steps[0]).toEqual({
      stepId: 'step-1',
      sourceIndex: 0,
      type: 'command',
      label: 'Run',
      status: 'pending',
      attempts: 0,
      exitCode: null,
      startedAt: null,
      endedAt: null,
      commandString: 'npm test',
      continueOnError: false,
      delayMs: 0,
      retryCount: 0
    })
  })

  it('recovers stale unfinished runs when their terminal session is no longer active', async () => {
    const stale: RunsData = {
      runs: [
        {
          runId: 'run-stale',
          source: 'workflow',
          sessionId: 'term-9',
          scriptId: 'script-9',
          scriptName: 'Start app',
          projectId: 'proj-1',
          projectName: 'StuffDiver',
          cwd: '/repo',
          shell: '/bin/zsh',
          logFilePath: null,
          startedAt: '2026-03-15T19:31:17.602Z',
          endedAt: null,
          status: 'running_command',
          error: null,
          inputValues: {},
          steps: [
            {
              stepId: 'step-1',
              sourceIndex: 0,
              type: 'command',
              label: 'Install dependencies',
              status: 'completed',
              attempts: 1,
              exitCode: 0,
              startedAt: '2026-03-15T19:31:18.102Z',
              endedAt: '2026-03-15T19:31:19.418Z',
              commandString: 'npm install',
              continueOnError: false,
              delayMs: 0,
              retryCount: 0
            },
            {
              stepId: 'step-2',
              sourceIndex: 1,
              type: 'command',
              label: 'Run start',
              status: 'running',
              attempts: 1,
              exitCode: null,
              startedAt: '2026-03-15T19:31:19.420Z',
              endedAt: null,
              commandString: 'npm run start',
              continueOnError: false,
              delayMs: 0,
              retryCount: 0
            }
          ]
        }
      ]
    }

    const dataDir = join(tempDir, 'data')
    await mkdir(dataDir, { recursive: true })
    await writeFile(join(dataDir, 'runs.json'), JSON.stringify(stale, null, 2), 'utf-8')

    const index = await getRunIndex('proj-1')
    expect(index).toHaveLength(1)
    expect(index[0].status).toBe('failed')
    expect(index[0].endedAt).toBe('2026-03-15T19:31:19.420Z')
    expect(index[0].error).toBe(
      'Recovered unfinished run after the terminal session was no longer active.'
    )
    expect(index[0].steps[1]).toMatchObject({
      status: 'failed',
      startedAt: '2026-03-15T19:31:19.420Z',
      endedAt: '2026-03-15T19:31:19.420Z'
    })
  })

  it('recovers the actually running step even when an earlier continue-on-error step already failed', async () => {
    const stale: RunsData = {
      runs: [
        {
          runId: 'run-stale-continue',
          source: 'workflow',
          sessionId: 'term-9',
          scriptId: 'script-9',
          scriptName: 'Deploy',
          projectId: 'proj-1',
          projectName: 'Alpha',
          cwd: '/repo',
          shell: '/bin/zsh',
          logFilePath: null,
          startedAt: '2026-03-15T19:31:17.602Z',
          endedAt: null,
          status: 'running_command',
          error: null,
          inputValues: {},
          steps: [
            {
              stepId: 'step-1',
              sourceIndex: 0,
              type: 'command',
              label: 'Lint',
              status: 'failed',
              attempts: 1,
              exitCode: 1,
              startedAt: '2026-03-15T19:31:18.102Z',
              endedAt: '2026-03-15T19:31:19.418Z',
              commandString: 'npm run lint',
              continueOnError: true,
              delayMs: 0,
              retryCount: 0
            },
            {
              stepId: 'step-2',
              sourceIndex: 1,
              type: 'command',
              label: 'Build',
              status: 'running',
              attempts: 1,
              exitCode: null,
              startedAt: '2026-03-15T19:31:19.420Z',
              endedAt: null,
              commandString: 'npm run build',
              continueOnError: false,
              delayMs: 0,
              retryCount: 0
            },
            {
              stepId: 'step-3',
              sourceIndex: 2,
              type: 'command',
              label: 'Ship',
              status: 'pending',
              attempts: 0,
              exitCode: null,
              startedAt: null,
              endedAt: null,
              commandString: 'npm run ship',
              continueOnError: false,
              delayMs: 0,
              retryCount: 0
            }
          ]
        }
      ]
    }

    const dataDir = join(tempDir, 'data')
    await mkdir(dataDir, { recursive: true })
    await writeFile(join(dataDir, 'runs.json'), JSON.stringify(stale, null, 2), 'utf-8')

    const index = await getRunIndex('proj-1')
    expect(index).toHaveLength(1)
    expect(index[0].steps[0]).toMatchObject({
      status: 'failed',
      endedAt: '2026-03-15T19:31:19.418Z'
    })
    expect(index[0].steps[1]).toMatchObject({
      status: 'failed',
      startedAt: '2026-03-15T19:31:19.420Z',
      endedAt: '2026-03-15T19:31:19.420Z'
    })
    expect(index[0].steps[2]).toMatchObject({
      status: 'pending',
      endedAt: null
    })
  })

  it('preserves loaded runs in memory when persisting recovered history fails', async () => {
    const stale: RunsData = {
      runs: [
        {
          runId: 'run-stale-write',
          source: 'workflow',
          sessionId: 'term-10',
          scriptId: 'script-10',
          scriptName: 'Start app',
          projectId: 'proj-1',
          projectName: 'StuffDiver',
          cwd: '/repo',
          shell: '/bin/zsh',
          logFilePath: null,
          startedAt: '2026-03-15T19:31:17.602Z',
          endedAt: null,
          status: 'running_command',
          error: null,
          inputValues: {},
          steps: [
            {
              stepId: 'step-1',
              sourceIndex: 0,
              type: 'command',
              label: 'Run start',
              status: 'running',
              attempts: 1,
              exitCode: null,
              startedAt: '2026-03-15T19:31:19.420Z',
              endedAt: null,
              commandString: 'npm run start',
              continueOnError: false,
              delayMs: 0,
              retryCount: 0
            }
          ]
        }
      ]
    }

    const dataDir = join(tempDir, 'data')
    await mkdir(dataDir, { recursive: true })
    const runsPath = join(dataDir, 'runs.json')
    await writeFile(runsPath, JSON.stringify(stale, null, 2), 'utf-8')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Atomic save writes to a sibling .tmp file first, so blocking writes needs
    // the parent directory to be unwritable, not just the target file.
    await chmod(dataDir, 0o555)

    try {
      const firstLoad = await getRunIndex('proj-1')
      const secondLoad = await getRunIndex('proj-1')

      expect(firstLoad).toHaveLength(1)
      expect(firstLoad[0].status).toBe('failed')
      expect(secondLoad).toHaveLength(1)
      expect(secondLoad[0].status).toBe('failed')
      expect(errorSpy).toHaveBeenCalled()
    } finally {
      await chmod(dataDir, 0o755)
      errorSpy.mockRestore()
    }
  })

  it('keeps unfinished runs marked running while their terminal session is still active', async () => {
    registerTerminalSession('term-9')

    await upsertRunRecord({
      runId: 'run-live',
      source: 'workflow',
      sessionId: 'term-9',
      scriptId: 'script-9',
      scriptName: 'Start app',
      projectId: 'proj-1',
      projectName: 'StuffDiver',
      cwd: '/repo',
      shell: '/bin/zsh',
      logFilePath: null,
      startedAt: '2026-03-15T19:31:17.602Z',
      endedAt: null,
      status: 'running_command',
      error: null,
      inputValues: {},
      steps: []
    })

    const index = await getRunIndex('proj-1')
    expect(index).toHaveLength(1)
    expect(index[0].status).toBe('running_command')
    expect(index[0].endedAt).toBeNull()
  })
})
