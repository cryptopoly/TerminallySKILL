import { describe, expect, it } from 'vitest'
import type { Project } from '../../../shared/project-schema'
import type { Script } from '../../../shared/script-schema'
import { resolveProjectScopedActiveScript } from './script-store'

function makeScript(overrides: Partial<Script> & Pick<Script, 'id' | 'name'>): Script {
  return {
    id: overrides.id,
    name: overrides.name,
    description: overrides.description ?? '',
    inputs: overrides.inputs ?? [],
    steps: overrides.steps ?? [],
    projectId: overrides.projectId ?? null,
    sourceScriptId: overrides.sourceScriptId ?? null,
    tags: overrides.tags ?? [],
    createdAt: overrides.createdAt ?? '2026-03-19T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-19T00:00:00.000Z',
    lastRunAt: overrides.lastRunAt ?? null
  }
}

function makeProject(
  id: string,
  enabledScriptIds: string[]
): Project {
  return {
    id,
    name: id,
    color: '#00bcd4',
    workingDirectory: `/tmp/${id}`,
    workspaceTarget: {
      type: 'local',
      cwd: `/tmp/${id}`
    },
    workspaceLayout: {
      sidebarTab: 'scripts',
      sidebarSize: 25,
      terminalVisible: true,
      terminalSize: 35,
      preferredSplitDirection: 'vertical',
      quadLayout: false,
      openFilePaths: [],
      activeFilePath: null
    },
    favoriteCommandIds: [],
    recentCommands: [],
    enabledCategories: [],
    enabledScriptIds,
    enabledSnippetIds: [],
    envVars: [],
    logPreference: 'inherit',
    starterPack: null,
    createdAt: '2026-03-19T00:00:00.000Z',
    lastOpenedAt: '2026-03-19T00:00:00.000Z'
  }
}

describe('resolveProjectScopedActiveScript', () => {
  it('keeps the active script when it is enabled in the current project', () => {
    const globalScript = makeScript({ id: 'global-1', name: 'Python Server' })
    const project = makeProject('project-a', ['global-1'])

    expect(
      resolveProjectScopedActiveScript([globalScript], project, globalScript)?.id
    ).toBe('global-1')
  })

  it('switches to the matching project clone when changing projects', () => {
    const globalScript = makeScript({ id: 'global-1', name: 'Python Server' })
    const cloneA = makeScript({
      id: 'clone-a',
      name: 'Python Server',
      projectId: 'project-a',
      sourceScriptId: 'global-1'
    })
    const cloneB = makeScript({
      id: 'clone-b',
      name: 'Python Server',
      projectId: 'project-b',
      sourceScriptId: 'global-1'
    })
    const projectA = makeProject('project-a', ['clone-a'])

    expect(
      resolveProjectScopedActiveScript([globalScript, cloneA, cloneB], projectA, cloneB)?.id
    ).toBe('clone-a')
  })
})
