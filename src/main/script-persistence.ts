import type { Script, ScriptApprovalStep, ScriptCommandStep, ScriptNoteStep, ScriptStep } from '../shared/script-schema'
import type { TVFlowFile } from '../shared/tvflow-schema'
import {
  scriptToWorkflowDefinition,
  tvFlowToWorkflowDefinition,
  workflowDefinitionToScript,
  workflowDefinitionToTVFlow
} from '../shared/workflow-adapter'
import { normalizeWorkflowInputDefinitions } from '../shared/workflow-validation'
import type { WorkflowInputDefinition } from '../shared/workflow-schema'

type PartialScript = Partial<Script> & Pick<Script, 'id' | 'name' | 'projectId'>

// Raw persisted input: any variant's fields may be present, none are trusted
interface RawWorkflowInput {
  id?: string
  label?: string
  description?: string
  type?: WorkflowInputDefinition['type']
  required?: boolean
  defaultValue?: unknown
  placeholder?: string
  min?: number
  max?: number
  step?: number
  options?: unknown
  allowCustomValue?: boolean
}

function backfillWorkflowInput(raw: RawWorkflowInput, index: number): WorkflowInputDefinition {
  const type = raw.type ?? 'string'

  if (type === 'number') {
    return {
      id: raw.id ?? `input_${index + 1}`,
      label: raw.label ?? `Input ${index + 1}`,
      description: raw.description ?? '',
      type: 'number',
      required: raw.required ?? false,
      defaultValue: typeof raw.defaultValue === 'number' ? raw.defaultValue : undefined,
      min: typeof raw.min === 'number' ? raw.min : undefined,
      max: typeof raw.max === 'number' ? raw.max : undefined,
      step: typeof raw.step === 'number' ? raw.step : undefined
    }
  }

  if (type === 'boolean') {
    return {
      id: raw.id ?? `input_${index + 1}`,
      label: raw.label ?? `Input ${index + 1}`,
      description: raw.description ?? '',
      type: 'boolean',
      required: raw.required ?? false,
      defaultValue: typeof raw.defaultValue === 'boolean' ? raw.defaultValue : undefined
    }
  }

  if (type === 'choice') {
    return {
      id: raw.id ?? `input_${index + 1}`,
      label: raw.label ?? `Input ${index + 1}`,
      description: raw.description ?? '',
      type: 'choice',
      required: raw.required ?? false,
      defaultValue: typeof raw.defaultValue === 'string' ? raw.defaultValue : undefined,
      options: Array.isArray(raw.options)
        ? raw.options
            .filter(
              (
                option
              ): option is {
                label: string
                value: string
              } =>
                typeof option === 'object' &&
                option !== null &&
                typeof option.label === 'string' &&
                typeof option.value === 'string'
            )
        : [],
      allowCustomValue: raw.allowCustomValue ?? false
    }
  }

  return {
    id: raw.id ?? `input_${index + 1}`,
    label: raw.label ?? `Input ${index + 1}`,
    description: raw.description ?? '',
    type: 'string',
    required: raw.required ?? false,
    defaultValue: typeof raw.defaultValue === 'string' ? raw.defaultValue : undefined,
    placeholder: raw.placeholder ?? ''
  }
}

function backfillScriptStep(step: Partial<ScriptStep>, index: number): ScriptStep {
  const id = step.id ?? `step-${index + 1}`

  if (step.type === 'approval') {
    return {
      id,
      type: 'approval',
      label: step.label ?? 'Approval required',
      enabled: step.enabled ?? true,
      message: typeof step.message === 'string' ? step.message : '',
      requireConfirmation: step.requireConfirmation ?? true
    }
  }

  if (step.type === 'note') {
    return {
      id,
      type: 'note',
      label: step.label ?? 'Note',
      enabled: step.enabled ?? true,
      content: typeof step.content === 'string' ? step.content : ''
    }
  }

  return {
    id,
    type: 'command',
    commandString: typeof step.commandString === 'string' ? step.commandString : '',
    commandId: typeof step.commandId === 'string' || step.commandId === null ? step.commandId : null,
    label:
      typeof step.label === 'string' && step.label.length > 0
        ? step.label
        : typeof step.commandString === 'string'
          ? step.commandString
          : 'Command',
    continueOnError: step.continueOnError ?? false,
    delayMs: typeof step.delayMs === 'number' ? step.delayMs : 0,
    enabled: step.enabled ?? true,
    retryCount: typeof step.retryCount === 'number' ? step.retryCount : 0
  }
}

export function backfillScript(raw: PartialScript, fallbackTimestamp = new Date().toISOString()): Script {
  const inputs = Array.isArray(raw.inputs)
    ? normalizeWorkflowInputDefinitions(
        raw.inputs.map((input, index) => backfillWorkflowInput(input, index))
      )
    : []

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? '',
    inputs,
    steps: Array.isArray(raw.steps)
      ? raw.steps.map((step, index) => backfillScriptStep(step, index))
      : [],
    projectId: raw.projectId ?? null,
    sourceScriptId:
      typeof raw.sourceScriptId === 'string' || raw.sourceScriptId === null
        ? raw.sourceScriptId
        : null,
    tags: raw.tags ?? [],
    createdAt: raw.createdAt ?? fallbackTimestamp,
    updatedAt: raw.updatedAt ?? raw.createdAt ?? fallbackTimestamp,
    lastRunAt: raw.lastRunAt ?? null
  }
}

export function backfillScriptsData(
  raw: Partial<{ scripts: PartialScript[] }>,
  fallbackTimestamp = new Date().toISOString()
): { scripts: Script[] } {
  return {
    scripts: Array.isArray(raw.scripts)
      ? raw.scripts.map((script) => backfillScript(script, fallbackTimestamp))
      : []
  }
}

export function createScriptRecord(
  params: {
    name: string
    projectId: string | null
    description?: string
  },
  now: string,
  makeId: () => string
): Script {
  return {
    id: makeId(),
    name: params.name,
    description: params.description || '',
    inputs: [],
    steps: [createScriptStepRecord('', null, 'Step 1', makeId)],
    projectId: params.projectId,
    sourceScriptId: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
    lastRunAt: null
  }
}

export function createScriptStepRecord(
  commandString: string,
  commandId: string | null,
  label: string | undefined,
  makeId: () => string
): ScriptCommandStep {
  return {
    id: makeId(),
    type: 'command',
    commandString,
    commandId,
    label: label || commandString,
    continueOnError: false,
    delayMs: 0,
    enabled: true,
    retryCount: 0
  }
}

export function createScriptApprovalStepRecord(
  message: string,
  label: string | undefined,
  makeId: () => string
): ScriptApprovalStep {
  return {
    id: makeId(),
    type: 'approval',
    label: label || 'Approval required',
    enabled: true,
    message,
    requireConfirmation: true
  }
}

export function createScriptNoteStepRecord(
  content: string,
  label: string | undefined,
  makeId: () => string
): ScriptNoteStep {
  return {
    id: makeId(),
    type: 'note',
    label: label || 'Note',
    enabled: true,
    content
  }
}

export function duplicateScriptRecord(
  original: Script,
  now: string,
  makeId: () => string,
  options?: {
    name?: string
    projectId?: string | null
    sourceScriptId?: string | null
  }
): Script {
  return {
    ...JSON.parse(JSON.stringify(original)),
    id: makeId(),
    name: options?.name ?? `${original.name} (Copy)`,
    projectId: options?.projectId ?? original.projectId,
    sourceScriptId:
      options && 'sourceScriptId' in options
        ? options.sourceScriptId ?? null
        : original.sourceScriptId ?? null,
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
    steps: original.steps.map((step) => ({
      ...step,
      id: makeId()
    }))
  }
}

export function exportScriptToFlow(script: Script, exportedAt: string): TVFlowFile {
  return workflowDefinitionToTVFlow(scriptToWorkflowDefinition(script), exportedAt)
}

export function importScriptFromFlow(
  flow: TVFlowFile,
  projectId: string | null,
  now: string,
  makeId: () => string
): Script {
  return workflowDefinitionToScript(tvFlowToWorkflowDefinition(flow), projectId, now, makeId)
}
