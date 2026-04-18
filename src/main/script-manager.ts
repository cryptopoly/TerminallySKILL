import { readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { writeJsonAtomic } from './atomic-write'
import type { Script, ScriptsData } from '../shared/script-schema'
import type { StarterScriptTemplate } from '../shared/starter-pack-schema'
import type { TVFlowFile } from '../shared/tvflow-schema'
import {
  backfillScriptsData,
  createScriptApprovalStepRecord,
  createScriptNoteStepRecord,
  createScriptRecord,
  createScriptStepRecord,
  duplicateScriptRecord,
  exportScriptToFlow,
  importScriptFromFlow
} from './script-persistence'
import { getDataDir } from './user-data-path'

let cached: ScriptsData | null = null

function getScriptsFile(): string {
  return join(getDataDir(), 'scripts.json')
}

async function ensureDataDir(): Promise<void> {
  await mkdir(getDataDir(), { recursive: true })
}

async function load(): Promise<ScriptsData> {
  if (cached) return cached
  try {
    const raw = await readFile(getScriptsFile(), 'utf-8')
    cached = backfillScriptsData(JSON.parse(raw) as Partial<ScriptsData>)
    return cached
  } catch {
    cached = { scripts: [] }
    return cached
  }
}

async function save(data: ScriptsData): Promise<void> {
  await ensureDataDir()
  cached = data
  await writeJsonAtomic(getScriptsFile(), data)
}

export async function getAllScripts(): Promise<Script[]> {
  const data = await load()
  return data.scripts
}

export async function getScriptsByProject(projectId: string | null): Promise<Script[]> {
  const data = await load()
  return data.scripts.filter((s) => s.projectId === projectId || s.projectId === null)
}

export async function createScript(
  name: string,
  projectId: string | null,
  description?: string
): Promise<Script> {
  const data = await load()
  const script = createScriptRecord(
    { name, projectId, description },
    new Date().toISOString(),
    randomUUID
  )
  data.scripts.push(script)
  await save(data)
  return script
}

export async function createStarterScripts(
  projectId: string,
  templates: StarterScriptTemplate[]
): Promise<Script[]> {
  if (templates.length === 0) return []

  const data = await load()
  const now = new Date().toISOString()
  const scripts = templates.map((template) => {
    const script = createScriptRecord(
      {
        name: template.name,
        projectId,
        description: template.description
      },
      now,
      randomUUID
    )

    script.tags = ['starter-pack']
    script.steps = template.steps.map((step) => {
      const record = createScriptStepRecord(step.commandString, null, step.label, randomUUID)
      record.continueOnError = step.continueOnError ?? false
      return record
    })

    return script
  })

  data.scripts.push(...scripts)
  await save(data)
  return scripts
}

export async function updateScript(
  id: string,
  updates: Partial<Pick<Script, 'name' | 'description' | 'inputs' | 'steps' | 'tags'>>
): Promise<Script | null> {
  const data = await load()
  const script = data.scripts.find((s) => s.id === id)
  if (!script) return null
  Object.assign(script, updates, { updatedAt: new Date().toISOString() })
  await save(data)
  return script
}

export async function deleteScript(id: string): Promise<void> {
  const data = await load()
  data.scripts = data.scripts.filter((s) => s.id !== id)
  await save(data)
}

export async function addStepToScript(
  scriptId: string,
  commandString: string,
  commandId: string | null,
  label?: string
): Promise<Script | null> {
  const data = await load()
  const script = data.scripts.find((s) => s.id === scriptId)
  if (!script) return null

  const step = createScriptStepRecord(commandString, commandId, label, randomUUID)
  script.steps.push(step)
  script.updatedAt = new Date().toISOString()
  await save(data)
  return script
}

export async function addApprovalStepToScript(
  scriptId: string,
  message: string,
  label?: string
): Promise<Script | null> {
  const data = await load()
  const script = data.scripts.find((s) => s.id === scriptId)
  if (!script) return null

  const step = createScriptApprovalStepRecord(message, label, randomUUID)
  script.steps.push(step)
  script.updatedAt = new Date().toISOString()
  await save(data)
  return script
}

export async function addNoteStepToScript(
  scriptId: string,
  content: string,
  label?: string
): Promise<Script | null> {
  const data = await load()
  const script = data.scripts.find((s) => s.id === scriptId)
  if (!script) return null

  const step = createScriptNoteStepRecord(content, label, randomUUID)
  script.steps.push(step)
  script.updatedAt = new Date().toISOString()
  await save(data)
  return script
}

export async function removeStepFromScript(
  scriptId: string,
  stepId: string
): Promise<Script | null> {
  const data = await load()
  const script = data.scripts.find((s) => s.id === scriptId)
  if (!script) return null
  script.steps = script.steps.filter((s) => s.id !== stepId)
  script.updatedAt = new Date().toISOString()
  await save(data)
  return script
}

export async function reorderScriptSteps(
  scriptId: string,
  stepIds: string[]
): Promise<Script | null> {
  const data = await load()
  const script = data.scripts.find((s) => s.id === scriptId)
  if (!script) return null

  const stepMap = new Map(script.steps.map((s) => [s.id, s]))
  script.steps = stepIds.map((id) => stepMap.get(id)!).filter(Boolean)
  script.updatedAt = new Date().toISOString()
  await save(data)
  return script
}

export async function markScriptRun(scriptId: string): Promise<void> {
  const data = await load()
  const script = data.scripts.find((s) => s.id === scriptId)
  if (script) {
    script.lastRunAt = new Date().toISOString()
    await save(data)
  }
}

export async function duplicateScript(scriptId: string): Promise<Script | null> {
  const data = await load()
  const original = data.scripts.find((s) => s.id === scriptId)
  if (!original) return null

  const copy = duplicateScriptRecord(original, new Date().toISOString(), randomUUID)
  data.scripts.push(copy)
  await save(data)
  return copy
}

export async function cloneScriptToProject(
  scriptId: string,
  projectId: string
): Promise<Script | null> {
  const data = await load()
  const original = data.scripts.find((s) => s.id === scriptId)
  if (!original) return null

  const originId = original.sourceScriptId ?? original.id
  const existingClone = data.scripts.find(
    (script) => script.projectId === projectId && script.sourceScriptId === originId
  )
  if (existingClone) {
    return existingClone
  }

  const clone = duplicateScriptRecord(original, new Date().toISOString(), randomUUID, {
    name: original.name,
    projectId,
    sourceScriptId: originId
  })
  data.scripts.push(clone)
  await save(data)
  return clone
}

export async function exportScript(scriptId: string): Promise<TVFlowFile | null> {
  const data = await load()
  const script = data.scripts.find((s) => s.id === scriptId)
  if (!script) return null

  return exportScriptToFlow(script, new Date().toISOString())
}

export async function importScript(
  flow: TVFlowFile,
  projectId: string | null
): Promise<Script> {
  const data = await load()
  const script = importScriptFromFlow(flow, projectId, new Date().toISOString(), randomUUID)

  data.scripts.push(script)
  await save(data)
  return script
}
