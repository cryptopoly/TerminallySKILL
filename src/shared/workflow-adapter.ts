import type { Script, ScriptStep } from './script-schema'
import {
  isLegacyTVFlowFile,
  type TVFlowFile,
  type WorkflowTVFlowFile
} from './tvflow-schema'
import { normalizeWorkflowInputDefinitions } from './workflow-validation'
import type {
  Workflow,
  WorkflowApprovalStepDefinition,
  WorkflowCommandStepDefinition,
  WorkflowDefinition,
  WorkflowNoteStepDefinition,
  WorkflowStep,
  WorkflowStepDefinition
} from './workflow-schema'

function scriptStepToWorkflowStepDefinition(step: ScriptStep): WorkflowStepDefinition {
  if (step.type === 'approval') {
    const definition: WorkflowApprovalStepDefinition = {
      type: 'approval',
      label: step.label,
      enabled: step.enabled,
      message: step.message,
      requireConfirmation: step.requireConfirmation
    }
    return definition
  }

  if (step.type === 'note') {
    const definition: WorkflowNoteStepDefinition = {
      type: 'note',
      label: step.label,
      enabled: step.enabled,
      content: step.content
    }
    return definition
  }

  const definition: WorkflowCommandStepDefinition = {
    type: 'command',
    label: step.label,
    enabled: step.enabled,
    commandString: step.commandString,
    continueOnError: step.continueOnError,
    delayMs: step.delayMs,
    retryCount: step.retryCount
  }
  return definition
}

export function scriptToWorkflowDefinition(script: Script): WorkflowDefinition {
  return {
    name: script.name,
    description: script.description,
    tags: [...script.tags],
    inputs: [...script.inputs],
    steps: script.steps.map(scriptStepToWorkflowStepDefinition)
  }
}

export function scriptToWorkflow(script: Script): Workflow {
  return {
    id: script.id,
    name: script.name,
    description: script.description,
    projectId: script.projectId,
    tags: [...script.tags],
    inputs: [...script.inputs],
    steps: script.steps.map(
      (step) =>
        ({
          id: step.id,
          ...(step.type === 'command' ? { commandId: step.commandId } : {}),
          ...scriptStepToWorkflowStepDefinition(step)
        }) as WorkflowStep
    ),
    createdAt: script.createdAt,
    updatedAt: script.updatedAt,
    lastRunAt: script.lastRunAt
  }
}

function workflowStepDefinitionToScriptStep(
  step: WorkflowStepDefinition,
  makeId: () => string
): ScriptStep {
  if (step.type === 'approval') {
    return {
      id: makeId(),
      type: 'approval',
      label: step.label || 'Approval required',
      enabled: step.enabled ?? true,
      message: step.message,
      requireConfirmation: step.requireConfirmation
    }
  }

  if (step.type === 'note') {
    return {
      id: makeId(),
      type: 'note',
      label: step.label || 'Note',
      enabled: step.enabled ?? true,
      content: step.content
    }
  }

  return {
    id: makeId(),
    type: 'command',
    commandString: step.commandString,
    commandId: null,
    label: step.label || step.commandString,
    continueOnError: step.continueOnError ?? false,
    delayMs: Math.max(0, step.delayMs ?? 0),
    enabled: step.enabled ?? true,
    retryCount: Math.max(0, step.retryCount ?? 0)
  }
}

export function workflowDefinitionToScript(
  workflow: WorkflowDefinition,
  projectId: string | null,
  now: string,
  makeId: () => string
): Script {
  return {
    id: makeId(),
    name: workflow.name,
    description: workflow.description,
    inputs: normalizeWorkflowInputDefinitions([...(workflow.inputs || [])]),
    steps: workflow.steps.map((step) => workflowStepDefinitionToScriptStep(step, makeId)),
    projectId,
    sourceScriptId: null,
    tags: [...(workflow.tags || [])],
    createdAt: now,
    updatedAt: now,
    lastRunAt: null
  }
}

export function workflowDefinitionToTVFlow(
  workflow: WorkflowDefinition,
  exportedAt: string
): WorkflowTVFlowFile {
  return {
    version: '2.0',
    type: 'workflow',
    exportedAt,
    workflow
  }
}

export function tvFlowToWorkflowDefinition(flow: TVFlowFile): WorkflowDefinition {
  if (isLegacyTVFlowFile(flow)) {
    return {
      name: flow.script.name,
      description: flow.script.description,
      tags: [...(flow.script.tags || [])],
      inputs: [],
      steps: flow.script.steps.map((step) => ({
        type: 'command',
        label: step.label,
        enabled: step.enabled,
        commandString: step.commandString,
        continueOnError: step.continueOnError,
        delayMs: step.delayMs,
        retryCount: 0
      }))
    }
  }

  return {
    ...flow.workflow,
    tags: [...flow.workflow.tags],
    inputs: [...flow.workflow.inputs],
    steps: flow.workflow.steps.map((step) => ({ ...step }))
  }
}
