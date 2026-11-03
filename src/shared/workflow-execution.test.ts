import { describe, expect, it } from 'vitest'
import type { Script } from './script-schema'
import type { WorkflowDefinition } from './workflow-schema'
import {
  buildScriptExecutionPlan,
  buildScriptPreparationSteps,
  buildWorkflowExecutionPlan,
  getMissingRequiredWorkflowInputs
} from './workflow-execution'

const script: Script = {
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
    },
    {
      id: 'step-2',
      type: 'note',
      label: 'Note',
      enabled: false,
      content: 'Remember to check docs'
    },
    {
      id: 'step-3',
      type: 'command',
      commandString: 'npm publish',
      commandId: 'cmd-2',
      label: 'Publish',
      continueOnError: true,
      delayMs: 500,
      enabled: true,
      retryCount: 0
    }
  ],
  projectId: 'proj-1',
  sourceScriptId: null,
  tags: ['release'],
  createdAt: '2026-03-08T18:00:00.000Z',
  updatedAt: '2026-03-08T18:00:00.000Z',
  lastRunAt: null
}

describe('workflow-execution', () => {
  it('builds a compound command from executable script steps', () => {
    const plan = buildScriptExecutionPlan(script)

    expect(plan.steps.map((step) => step.sourceIndex)).toEqual([0, 2])
    expect(plan.compoundCommand).toBe('npm test && npm publish')
  })

  it('supports running a single step or remaining tail of a workflow', () => {
    const workflow: WorkflowDefinition = {
      name: 'Release',
      description: 'workflow',
      tags: [],
      inputs: [],
      steps: [
        {
          type: 'note',
          label: 'Context',
          enabled: true,
          content: 'Read the runbook'
        },
        {
          type: 'command',
          label: 'Test',
          enabled: true,
          commandString: 'npm test',
          continueOnError: false,
          delayMs: 0,
          retryCount: 0
        },
        {
          type: 'command',
          label: 'Publish',
          enabled: true,
          commandString: 'npm publish',
          continueOnError: true,
          delayMs: 250,
          retryCount: 1
        }
      ]
    }

    expect(buildWorkflowExecutionPlan(workflow, { singleOnly: true, fromIndex: 1 })).toEqual({
      steps: [
        {
          type: 'command',
          label: 'Test',
          enabled: true,
          commandString: 'npm test',
          continueOnError: false,
          delayMs: 0,
          retryCount: 0,
          sourceIndex: 1
        }
      ],
      compoundCommand: 'npm test'
    })

    expect(buildWorkflowExecutionPlan(workflow, { fromIndex: 1 }).compoundCommand).toBe(
      'npm test && npm publish'
    )
  })

  it('resolves workflow input placeholders in commands and preparation steps', () => {
    const workflowScript: Script = {
      id: 'script-2',
      name: 'Release',
      description: '',
      inputs: [
        {
          id: 'channel',
          label: 'Channel',
          description: '',
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
          label: 'Prep {{channel}}',
          enabled: true,
          content: 'Review {{channel}} notes'
        },
        {
          id: 'step-2',
          type: 'command',
          commandString: 'npm publish --tag {{channel}}',
          commandId: null,
          label: 'Publish {{channel}}',
          continueOnError: false,
          delayMs: 0,
          enabled: true,
          retryCount: 0
        }
      ],
      projectId: null,
      sourceScriptId: null,
      tags: [],
      createdAt: '2026-03-08T18:00:00.000Z',
      updatedAt: '2026-03-08T18:00:00.000Z',
      lastRunAt: null
    }

    expect(
      buildScriptPreparationSteps(workflowScript, {
        inputValues: { channel: 'beta' }
      })
    ).toEqual([
      {
        id: 'step-1',
        type: 'note',
        label: 'Prep beta',
        enabled: true,
        content: 'Review beta notes',
        sourceIndex: 0
      }
    ])

    expect(
      buildScriptExecutionPlan(workflowScript, {
        inputValues: { channel: 'beta' }
      }).compoundCommand
    ).toBe('npm publish --tag beta')
  })

  it('reports missing required workflow inputs', () => {
    expect(
      getMissingRequiredWorkflowInputs(
        [
          {
            id: 'channel',
            label: 'Channel',
            description: '',
            type: 'string',
            required: true,
            defaultValue: '',
            placeholder: ''
          },
          {
            id: 'dry_run',
            label: 'Dry run',
            description: '',
            type: 'boolean',
            required: true,
            defaultValue: false
          }
        ],
        { dry_run: false }
      ).map((input) => input.id)
    ).toEqual(['channel'])
  })
})
