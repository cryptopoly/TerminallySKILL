import { mkdir } from 'fs/promises'
import { join } from 'path'
import { readJsonFile, writeJsonAtomic } from './atomic-write'
import type { RunRecord, RunStepRecord, RunsData } from '../shared/run-schema'
import { filterRuns, type RunStatusFilter } from '../shared/run-history'
import { hasTerminalSession } from './terminal-session-registry'
import { getDataDir } from './user-data-path'
import { getSettings } from './settings-manager'
import { recordMaskedForRun } from './secret-mask-stats'
import {
  addSecretCounts,
  formatSecretMask,
  isPlaceholderValue,
  isSecretFieldName,
  maskSecrets,
  type SecretCounts
} from '../shared/secret-mask'

let cached: RunsData | null = null

// Terminal ids (term-1, term-2...) restart from 1 on every launch, so an id match alone does not
// prove a saved run is still live. A live run must have started after this process did.
const PROCESS_STARTED_AT_MS = Date.now() - process.uptime() * 1000

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
    scheduleId: typeof raw.scheduleId === 'string' ? raw.scheduleId : null,
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
  if (isTerminalRunStatus(run.status)) return run
  if (hasTerminalSession(run.sessionId) && Date.parse(run.startedAt) >= PROCESS_STARTED_AT_MS) return run

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
  cached = await readJsonFile(
    getRunsFile(),
    (value) => {
      const data = value as Partial<RunsData>
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
      return { runs }
    },
    () => ({ runs: [] })
  )

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

/** Mask secrets in the parts of a run record that hold typed or generated text. */
export function maskRunRecord(run: RunRecord): { run: RunRecord; counts: SecretCounts } {
  const counts: SecretCounts = {}
  const mask = (text: string): string => {
    const result = maskSecrets(text)
    addSecretCounts(counts, result.counts)
    return result.text
  }

  const inputValues: RunRecord['inputValues'] = {}
  for (const [name, value] of Object.entries(run.inputValues)) {
    if (typeof value !== 'string') {
      inputValues[name] = value
      continue
    }
    // An input named like a secret (db_password, apiToken) is hidden whatever its shape.
    const fieldKind = isSecretFieldName(name)
    if (fieldKind && !isPlaceholderValue(value)) {
      inputValues[name] = formatSecretMask(fieldKind)
      addSecretCounts(counts, { [fieldKind]: 1 })
    } else {
      inputValues[name] = mask(value)
    }
  }

  const steps = run.steps.map((step): RunStepRecord => {
    const label = mask(step.label)
    if (step.type === 'command') return { ...step, label, commandString: mask(step.commandString) }
    if (step.type === 'approval') return { ...step, label, message: mask(step.message) }
    return { ...step, label, content: mask(step.content) }
  })

  return {
    run: { ...run, error: run.error === null ? null : mask(run.error), inputValues, steps },
    counts
  }
}

export async function upsertRunRecord(run: RunRecord): Promise<RunRecord> {
  const data = await load()
  let nextRun = backfillRunRecord(run, data.runs.length)
  if ((await getSettings()).maskSecrets) {
    const masked = maskRunRecord(nextRun)
    nextRun = masked.run
    recordMaskedForRun(nextRun.runId, masked.counts)
  }
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
