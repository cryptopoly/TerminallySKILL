import { readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { writeJsonAtomic } from './atomic-write'
import type { RunRecord, RunStepRecord, RunsData } from '../shared/run-schema'
import { filterRuns, type RunStatusFilter } from '../shared/run-history'
import { hasTerminalSession } from './terminal-session-registry'
import { getDataDir } from './user-data-path'

let cached: RunsData | null = null

function getRunsFile(): string {
  return join(getDataDir(), 'runs.json')
}

function backfillRunStep(raw: Partial<RunStepRecord>, index: number): RunStepRecord {
  const base = {
    stepId: raw.stepId ?? `step-${index + 1}`,
    sourceIndex: typeof raw.sourceIndex === 'number' ? raw.sourceIndex : index,
    label: typeof raw.label === 'string' ? raw.label : `Step ${index + 1}`,
    status: raw.status ?? 'pending',
    attempts: typeof raw.attempts === 'number' ? raw.attempts : 0,
    exitCode: typeof raw.exitCode === 'number' ? raw.exitCode : null,
    startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : null,
    endedAt: typeof raw.endedAt === 'string' ? raw.endedAt : null
  }

  if (raw.type === 'approval') {
    return {
      ...base,
      type: 'approval',
      message: typeof raw.message === 'string' ? raw.message : '',
      requireConfirmation: raw.requireConfirmation ?? true
    }
  }

  if (raw.type === 'note') {
    return {
      ...base,
      type: 'note',
      content: typeof raw.content === 'string' ? raw.content : ''
    }
  }

  return {
    ...base,
    type: 'command',
    commandString: typeof raw.commandString === 'string' ? raw.commandString : '',
    continueOnError: raw.continueOnError ?? false,
    delayMs: typeof raw.delayMs === 'number' ? raw.delayMs : 0,
    retryCount: typeof raw.retryCount === 'number' ? raw.retryCount : 0
  }
}

function backfillRunRecord(raw: Partial<RunRecord>, index: number): RunRecord {
  const fallbackStartedAt = typeof raw.startedAt === 'string' ? raw.startedAt : new Date().toISOString()

  return {
    runId: raw.runId ?? `run-${index + 1}`,
    source: raw.source ?? 'workflow',
    sessionId: typeof raw.sessionId === 'string' ? raw.sessionId : '',
    scriptId: typeof raw.scriptId === 'string' ? raw.scriptId : '',
    scriptName: typeof raw.scriptName === 'string' ? raw.scriptName : 'Workflow',
    projectId: typeof raw.projectId === 'string' ? raw.projectId : null,
    projectName: typeof raw.projectName === 'string' ? raw.projectName : null,
    cwd: typeof raw.cwd === 'string' ? raw.cwd : null,
    shell: typeof raw.shell === 'string' ? raw.shell : null,
    logFilePath: typeof raw.logFilePath === 'string' ? raw.logFilePath : null,
    startedAt: fallbackStartedAt,
    endedAt: typeof raw.endedAt === 'string' ? raw.endedAt : null,
    status: raw.status ?? 'running',
    error: typeof raw.error === 'string' ? raw.error : null,
    inputValues:
      raw.inputValues && typeof raw.inputValues === 'object'
        ? (raw.inputValues as RunRecord['inputValues'])
        : {},
    steps: Array.isArray(raw.steps)
      ? raw.steps.map((step, stepIndex) => backfillRunStep(step, stepIndex))
      : []
  }
}

function isTerminalRunStatus(status: RunRecord['status']): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled'
}

function getLatestObservedTimestamp(run: RunRecord): string {
  const timestamps = [
    run.startedAt,
    run.endedAt,
    ...run.steps.flatMap((step) => [step.startedAt, step.endedAt])
  ].filter((value): value is string => typeof value === 'string' && value.length > 0)

  return timestamps.sort((a, b) => a.localeCompare(b)).at(-1) ?? run.startedAt
}

function recoverStaleRun(run: RunRecord): RunRecord {
  if (isTerminalRunStatus(run.status) || hasTerminalSession(run.sessionId)) {
    return run
  }

  const endedAt = run.endedAt ?? getLatestObservedTimestamp(run)
  const activeStep =
    run.steps.find((step) => step.status === 'running') ??
    run.steps.find((step) => step.status === 'pending') ??
    null
  const allStepsCompleted = run.steps.length > 0 && run.steps.every((step) => step.status === 'completed')

  if (allStepsCompleted) {
    return {
      ...run,
      endedAt,
      status: 'completed',
      error: null
    }
  }

  return {
    ...run,
    endedAt,
    status: 'failed',
    error:
      run.error ??
      'Recovered unfinished run after the terminal session was no longer active.',
    steps: run.steps.map((step) =>
      activeStep && step.stepId === activeStep.stepId
        ? {
            ...step,
            status: 'failed',
            startedAt: step.startedAt ?? endedAt,
            endedAt: step.endedAt ?? endedAt
          }
        : step
    )
  }
}

async function ensureDataDir(): Promise<void> {
  await mkdir(getDataDir(), { recursive: true })
}

async function load(): Promise<RunsData> {
  if (cached) return cached
  let changed = false
  try {
    const raw = await readFile(getRunsFile(), 'utf-8')
    const data = JSON.parse(raw) as Partial<RunsData>
    const runs = Array.isArray(data.runs)
      ? data.runs.map((run, index) => {
          const backfilled = backfillRunRecord(run, index)
          const recovered = recoverStaleRun(backfilled)
          if (JSON.stringify(backfilled) !== JSON.stringify(recovered)) {
            changed = true
          }
          return recovered
        })
      : []

    cached = {
      runs
    }
  } catch {
    cached = { runs: [] }
    return cached
  }

  if (changed) {
    try {
      await save(cached)
    } catch (error) {
      console.error('[runs] Failed to persist recovered run history:', error)
    }
  }

  return cached
}

async function save(data: RunsData): Promise<void> {
  await ensureDataDir()
  cached = data
  await writeJsonAtomic(getRunsFile(), data)
}

export async function upsertRunRecord(run: RunRecord): Promise<RunRecord> {
  const data = await load()
  const nextRun = backfillRunRecord(run, data.runs.length)
  const index = data.runs.findIndex((entry) => entry.runId === nextRun.runId)

  if (index >= 0) {
    data.runs[index] = {
      ...nextRun,
      logFilePath: nextRun.logFilePath ?? data.runs[index].logFilePath
    }
  } else {
    data.runs.push(nextRun)
  }

  await save(data)
  return nextRun
}

export async function getRunIndex(projectId: string | null): Promise<RunRecord[]> {
  const data = await load()
  return data.runs
    .filter((run) => run.projectId === projectId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export async function searchRuns(
  projectId: string | null,
  query: string,
  statusFilter: RunStatusFilter = 'all'
): Promise<RunRecord[]> {
  const runs = await getRunIndex(projectId)
  return filterRuns(runs, query, statusFilter)
}

export async function attachLogToRuns(sessionId: string, logFilePath: string): Promise<void> {
  const data = await load()
  let changed = false

  data.runs = data.runs.map((run) => {
    if (run.sessionId !== sessionId || run.logFilePath === logFilePath) {
      return run
    }

    changed = true
    return {
      ...run,
      logFilePath
    }
  })

  if (changed) {
    await save(data)
  }
}

export function resetRunManagerCache(): void {
  cached = null
}
