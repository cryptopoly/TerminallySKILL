import { describe, expect, it } from 'vitest'
import type { Script, ScriptStep } from '../shared/script-schema'
import type { TVFlowFile } from '../shared/tvflow-schema'
import {
  backfillScript,
  createScriptRecord,
  createScriptApprovalStepRecord,
  createScriptNoteStepRecord,
  createScriptStepRecord,
  duplicateScriptRecord,
  exportScriptToFlow,
  importScriptFromFlow
} from './script-persistence'

function makeIds(...ids: string[]): () => string {
  let index = 0
  return () => ids[index++] ?? `id-${index}`
}

describe('script-persistence', () => {
  it('creates script and step records with expected defaults', () => {
    const script = createScriptRecord(
      { name: 'Deploy', projectId: 'proj-1', description: '' },
      '2026-03-08T16:40:00.000Z',
      makeIds('script-1', 'default-step-1')
    )
    const step = createScriptStepRecord('npm test', 'cmd-1', undefined, makeIds('step-1'))

    expect(script).toEqual({
      id: 'script-1',
      name: 'Deploy',
      description: '',
      inputs: [],
      steps: [{
        id: 'default-step-1',
        type: 'command',
        commandString: '',
        commandId: null,
        label: 'Step 1',
        continueOnError: false,
        delayMs: 0,
        enabled: true,
        retryCount: 0
      }],
      projectId: 'proj-1',
      sourceScriptId: null,
      tags: [],
      createdAt: '2026-03-08T16:40:00.000Z',
      updatedAt: '2026-03-08T16:40:00.000Z',
      lastRunAt: null
    })

    expect(step).toEqual({
      id: 'step-1',
      type: 'command',
      commandString: 'npm test',
      commandId: 'cmd-1',
      label: 'npm test',
      continueOnError: false,
      delayMs: 0,
      enabled: true,
      retryCount: 0
    })
  })

  it('duplicates a script with fresh ids and a reset run timestamp', () => {
    const original: Script = {
      id: 'script-1',
      name: 'Deploy',
      description: 'ship it',
      inputs: [],
      steps: [
        {
          id: 'step-1',
          type: 'command',
          commandString: 'npm test',
          commandId: 'cmd-1',
          label: 'Tests',
          continueOnError: false,
          delayMs: 0,
          enabled: true,
          retryCount: 0
        }
      ],
      projectId: 'proj-1',
      sourceScriptId: null,
      tags: ['release'],
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z',
      lastRunAt: '2026-03-03T00:00:00.000Z'
    }

    const copy = duplicateScriptRecord(
      original,
      '2026-03-08T16:40:00.000Z',
      makeIds('script-copy', 'step-copy')
    )

    expect(copy.id).toBe('script-copy')
    expect(copy.name).toBe('Deploy (Copy)')
    expect(copy.steps[0].id).toBe('step-copy')
    expect(copy.steps[0]).toMatchObject({ commandString: 'npm test' })
    expect(copy.lastRunAt).toBeNull()
    expect(copy.createdAt).toBe('2026-03-08T16:40:00.000Z')
    expect(copy.updatedAt).toBe('2026-03-08T16:40:00.000Z')
  })

  it('can duplicate a script into a project-local clone while preserving its name', () => {
    const original: Script = {
      id: 'script-global',
      name: 'Python Server',
      description: 'shared helper',
      inputs: [],
      steps: [],
      projectId: null,
      sourceScriptId: null,
      tags: [],
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z',
      lastRunAt: null
    }

    const clone = duplicateScriptRecord(
      original,
      '2026-03-08T16:40:00.000Z',
      makeIds('script-clone'),
      {
        name: original.name,
        projectId: 'proj-2',
        sourceScriptId: original.id
      }
    )

    expect(clone.name).toBe('Python Server')
    expect(clone.projectId).toBe('proj-2')
    expect(clone.sourceScriptId).toBe('script-global')
  })

  it('exports and reimports tvflow files without leaking runtime ids', () => {
    const script: Script = {
      id: 'script-1',
      name: 'Deploy',
      description: 'ship it',
      inputs: [
        {
          id: 'channel',
          label: 'Release channel',
          description: 'Where to release',
          type: 'choice',
          required: true,
          defaultValue: 'stable',
          options: [
            { label: 'Stable', value: 'stable' },
            { label: 'Beta', value: 'beta' }
          ],
          allowCustomValue: false
        }
      ],
      steps: [
        {
          id: 'step-1',
          type: 'note',
          label: 'Prep',
          enabled: true,
          content: 'Review the changelog'
        },
        {
          id: 'step-2',
          type: 'command',
          commandString: 'npm test',
          commandId: 'cmd-1',
          label: 'Tests',
          continueOnError: false,
          delayMs: 0,
          enabled: true,
          retryCount: 0
        },
        {
          id: 'step-3',
          type: 'approval',
          label: 'Confirm',
          enabled: true,
          message: 'Approve release',
          requireConfirmation: true
        },
        {
          id: 'step-4',
          type: 'command',
          commandString: 'npm publish',
          commandId: 'cmd-2',
          label: 'Publish',
          continueOnError: true,
          delayMs: 500,
          enabled: false,
          retryCount: 2
        }
      ],
      projectId: null,
      sourceScriptId: null,
      tags: ['release'],
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z',
      lastRunAt: null
    }

    const flow = exportScriptToFlow(script, '2026-03-08T16:40:00.000Z')
    expect(flow).toEqual({
      version: '2.0',
      type: 'workflow',
      exportedAt: '2026-03-08T16:40:00.000Z',
      workflow: {
        name: 'Deploy',
        description: 'ship it',
        tags: ['release'],
        inputs: [
          {
            id: 'channel',
            label: 'Release channel',
            description: 'Where to release',
            type: 'choice',
            required: true,
            defaultValue: 'stable',
            options: [
              { label: 'Stable', value: 'stable' },
              { label: 'Beta', value: 'beta' }
            ],
            allowCustomValue: false
          }
        ],
        steps: [
          {
            type: 'note',
            label: 'Prep',
            enabled: true,
            content: 'Review the changelog'
          },
          {
            type: 'command',
            commandString: 'npm test',
            label: 'Tests',
            continueOnError: false,
            delayMs: 0,
            enabled: true,
            retryCount: 0
          },
          {
            type: 'approval',
            label: 'Confirm',
            enabled: true,
            message: 'Approve release',
            requireConfirmation: true
          },
          {
            type: 'command',
            commandString: 'npm publish',
            label: 'Publish',
            continueOnError: true,
            delayMs: 500,
            enabled: false,
            retryCount: 2
          }
        ]
      }
    })

    const imported = importScriptFromFlow(
      flow,
      'proj-2',
      '2026-03-08T16:50:00.000Z',
      makeIds('script-imported', 'step-a', 'step-b', 'step-c', 'step-d')
    )

    expect(imported.id).toBe('script-imported')
    expect(imported.projectId).toBe('proj-2')
    expect(imported.sourceScriptId).toBeNull()
    expect(imported.inputs).toHaveLength(1)
    expect(imported.steps.map((step) => step.id)).toEqual(['step-a', 'step-b', 'step-c', 'step-d'])
    expect(imported.steps[1]).toMatchObject({ type: 'command', commandId: null })
    expect(imported.steps[2]).toMatchObject({ type: 'approval' })
    expect(imported.tags).toEqual(['release'])
    expect(imported.lastRunAt).toBeNull()
  })

  it('imports legacy script tvflow files for backward compatibility', () => {
    const legacyFlow: TVFlowFile = {
      version: '1.0',
      type: 'script',
      exportedAt: '2026-03-08T16:40:00.000Z',
      script: {
        name: 'Legacy Deploy',
        description: 'old format',
        tags: ['legacy'],
        steps: [
          {
            commandString: 'npm ci',
            label: 'Install',
            continueOnError: false,
            delayMs: 0,
            enabled: true
          }
        ]
      }
    }

    const imported = importScriptFromFlow(
      legacyFlow,
      null,
      '2026-03-08T16:50:00.000Z',
      makeIds('script-imported', 'step-a')
    )

    expect(imported.name).toBe('Legacy Deploy')
    expect(imported.tags).toEqual(['legacy'])
    expect(imported.steps).toHaveLength(1)
    expect(imported.steps[0]).toMatchObject({
      id: 'step-a',
      type: 'command',
      commandString: 'npm ci',
      label: 'Install',
      commandId: null
    })
    expect(imported.sourceScriptId).toBeNull()
  })

  it('imports workflow tvflow files while preserving non-command steps and inputs', () => {
    const workflowFlow: TVFlowFile = {
      version: '2.0',
      type: 'workflow',
      exportedAt: '2026-03-08T16:40:00.000Z',
      workflow: {
        name: 'Release Workflow',
        description: 'new format',
        tags: ['release'],
        inputs: [
          {
            id: 'channel',
            label: 'Release channel',
            description: 'Target channel',
            type: 'choice',
            required: true,
            defaultValue: 'stable',
            options: [
              { label: 'Stable', value: 'stable' },
              { label: 'Beta', value: 'beta' }
            ],
            allowCustomValue: false
          }
        ],
        steps: [
          {
            type: 'note',
            label: 'Context',
            enabled: true,
            content: 'Confirm changelog is ready.'
          },
          {
            type: 'command',
            label: 'Test',
            enabled: true,
            commandString: 'npm test',
            continueOnError: false,
            delayMs: 0,
            retryCount: 1
          },
          {
            type: 'approval',
            label: 'Manual review',
            enabled: true,
            message: 'Approve production release.',
            requireConfirmation: true
          },
          {
            type: 'command',
            label: 'Publish',
            enabled: true,
            commandString: 'npm publish',
            continueOnError: false,
            delayMs: 250,
            retryCount: 0
          }
        ]
      }
    }

    const imported = importScriptFromFlow(
      workflowFlow,
      'proj-9',
      '2026-03-08T16:50:00.000Z',
      makeIds('script-imported', 'step-a', 'step-b', 'step-c', 'step-d')
    )

    expect(imported.projectId).toBe('proj-9')
    expect(imported.sourceScriptId).toBeNull()
    expect(imported.inputs).toHaveLength(1)
    expect(imported.steps).toHaveLength(4)
    expect(imported.steps.map((step) => step.id)).toEqual(['step-a', 'step-b', 'step-c', 'step-d'])
    expect(imported.steps[0]).toMatchObject({ type: 'note', content: 'Confirm changelog is ready.' })
    expect(imported.steps[1]).toMatchObject({ type: 'command', commandString: 'npm test' })
    expect(imported.steps[2]).toMatchObject({ type: 'approval', message: 'Approve production release.' })
    expect(imported.steps[3]).toMatchObject({ type: 'command', commandString: 'npm publish' })
  })

  it('backfills legacy script records with workflow defaults', () => {
    const script = backfillScript({
      id: 'script-1',
      name: 'Legacy',
      projectId: null,
      inputs: [
        {
          id: 'Deploy Env',
          label: 'Deploy Env',
          description: '',
          type: 'choice',
          required: true,
          defaultValue: 'missing',
          options: [
            { label: 'Stable', value: 'stable' },
            { label: 'Stable duplicate', value: 'stable' }
          ],
          allowCustomValue: false
        }
      ],
      steps: [
        {
          id: 'step-1',
          commandString: 'npm test',
          commandId: 'cmd-1',
          enabled: true
        } as ScriptStep // legacy record without type, label or retry fields
      ]
    })

    expect(script.inputs).toEqual([
      {
        id: 'deploy_env',
        label: 'Deploy Env',
        description: '',
        type: 'choice',
        required: true,
        defaultValue: 'stable',
        options: [{ label: 'Stable', value: 'stable' }],
        allowCustomValue: false
      }
    ])
    expect(script.steps[0]).toEqual({
      id: 'step-1',
      type: 'command',
      commandString: 'npm test',
      commandId: 'cmd-1',
      label: 'npm test',
      continueOnError: false,
      delayMs: 0,
      enabled: true,
      retryCount: 0
    })
    expect(script.sourceScriptId).toBeNull()
  })

  it('creates approval and note step records with expected defaults', () => {
    const approval = createScriptApprovalStepRecord(
      'Ship production release?',
      undefined,
      makeIds('approval-1')
    )
    const note = createScriptNoteStepRecord('Review the changelog first.', undefined, makeIds('note-1'))

    expect(approval).toEqual({
      id: 'approval-1',
      type: 'approval',
      label: 'Approval required',
      enabled: true,
      message: 'Ship production release?',
      requireConfirmation: true
    })

    expect(note).toEqual({
      id: 'note-1',
      type: 'note',
      label: 'Note',
      enabled: true,
      content: 'Review the changelog first.'
    })
  })
})
