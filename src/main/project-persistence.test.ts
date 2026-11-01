import { describe, expect, it } from 'vitest'
import {
  buildEnvOverrides,
  createLocalWorkspaceTarget,
  createSSHWorkspaceTarget,
  DEFAULT_PROJECT_WORKSPACE_LAYOUT,
  getProjectWorkspaceTargetConnectionLabel,
  getProjectWorkspaceTargetDisplayName,
  getProjectWorkspaceTargetLabel,
  getProjectWorkspaceTargetSummary,
  resolveProjectWorkingDirectory
} from '../shared/project-schema'
import type { Project } from '../shared/project-schema'
import { backfillProject, backfillProjectsData } from './project-persistence'

describe('project-persistence', () => {
  it('backfills missing project fields with stable defaults', () => {
    expect(
      backfillProject(
        {
          id: 'proj-1',
          name: 'Repo',
          workingDirectory: '/repo'
        },
        2,
        '2026-03-08T16:30:00.000Z'
      )
    ).toEqual({
      id: 'proj-1',
      name: 'Repo',
      workingDirectory: '/repo',
      workspaceTarget: {
        type: 'local',
        cwd: '/repo'
      },
      workspaceLayout: DEFAULT_PROJECT_WORKSPACE_LAYOUT,
      favoriteCommandIds: [],
      recentCommands: [],
      enabledCategories: [],
      enabledScriptIds: [],
      enabledSnippetIds: [],
      envVars: [],
      logPreference: 'inherit',
      starterPack: null,
      color: '#06b6d4',
      createdAt: '2026-03-08T16:30:00.000Z',
      lastOpenedAt: '2026-03-08T16:30:00.000Z'
    })
  })

  it('backfills whole project collections and preserves existing values', () => {
    const data = backfillProjectsData(
      {
        projects: [
          {
            id: 'proj-1',
            name: 'Repo',
            workingDirectory: '/repo',
            workspaceTarget: {
              type: 'local',
              cwd: '/repo'
            },
            workspaceLayout: {
              sidebarSize: 28,
              terminalSize: 40,
              terminalVisible: true,
              preferredSplitDirection: 'horizontal',
              sidebarTab: 'files',
              openFilePaths: ['/repo/src/index.ts', '/repo/README.md'],
              activeFilePath: '/repo/README.md'
            },
            favoriteCommandIds: ['git-status'],
            recentCommands: [{ commandId: 'git-status', commandString: 'git status', timestamp: 't1' }],
            enabledCategories: ['git'],
            enabledScriptIds: ['script-1'],
            enabledSnippetIds: ['snippet-1'],
            envVars: [{ key: 'NODE_ENV', value: 'test', enabled: true }],
            logPreference: 'disabled',
            starterPack: {
              detections: ['Git repository'],
              categoryIds: ['git'],
              scriptIds: ['script-1'],
              snippetIds: ['snippet-1'],
              appliedAt: '2026-03-01T00:00:00.000Z',
              dismissedAt: null
            },
            color: '#ffffff',
            createdAt: '2026-03-01T00:00:00.000Z'
          } as Project // deliberately omits lastOpenedAt to exercise the backfill
        ],
        activeProjectId: 'proj-1'
      },
      '2026-03-08T16:30:00.000Z'
    )

    expect(data.activeProjectId).toBe('proj-1')
    expect(data.projects[0].lastOpenedAt).toBe('2026-03-01T00:00:00.000Z')
    expect(data.projects[0].workspaceTarget).toEqual({
      type: 'local',
      cwd: '/repo'
    })
    expect(data.projects[0].workspaceLayout).toEqual({
      sidebarSize: 28,
      terminalSize: 40,
      terminalVisible: true,
      preferredSplitDirection: 'horizontal',
      sidebarTab: 'files',
      openFilePaths: ['/repo/src/index.ts', '/repo/README.md'],
      activeFilePath: '/repo/README.md'
    })
    expect(data.projects[0].favoriteCommandIds).toEqual(['git-status'])
    expect(data.projects[0].envVars).toEqual([{ key: 'NODE_ENV', value: 'test', enabled: true }])
    expect(data.projects[0].logPreference).toBe('disabled')
    expect(data.projects[0].starterPack).toEqual({
      detections: ['Git repository'],
      categoryIds: ['git'],
      scriptIds: ['script-1'],
      snippetIds: ['snippet-1'],
      appliedAt: '2026-03-01T00:00:00.000Z',
      dismissedAt: null
    })
  })

  it('builds env overrides from enabled variables with non-empty keys only', () => {
    expect(
      buildEnvOverrides([
        { key: 'NODE_ENV', value: 'production', enabled: true },
        { key: 'DEBUG', value: '1', enabled: false },
        { key: ' ', value: 'ignored', enabled: true }
      ])
    ).toEqual({ NODE_ENV: 'production' })

    expect(buildEnvOverrides([{ key: 'DEBUG', value: '1', enabled: false }])).toBeUndefined()
  })

  it('resolves workspace helpers from explicit project targets', () => {
    const project = backfillProject(
      {
        id: 'proj-2',
        name: 'Workspace',
        workingDirectory: '/fallback',
        workspaceTarget: createLocalWorkspaceTarget('/workspace')
      },
      0,
      '2026-03-08T16:30:00.000Z'
    )

    expect(resolveProjectWorkingDirectory(project)).toBe('/workspace')
    expect(getProjectWorkspaceTargetLabel(project)).toBe('Local workspace')
  })

  it('backfills ssh workspace targets and exposes readable summaries', () => {
    const project = backfillProject(
      {
        id: 'proj-3',
        name: 'Remote',
        workingDirectory: '/srv/app',
        workspaceTarget: createSSHWorkspaceTarget(
          'prod.example.com',
          'deploy',
          '/srv/app',
          2222,
          '~/.ssh/deploy_ed25519',
          'Production'
        )
      },
      0,
      '2026-03-08T16:30:00.000Z'
    )

    expect(resolveProjectWorkingDirectory(project)).toBe('/srv/app')
    expect(getProjectWorkspaceTargetLabel(project)).toBe('SSH workspace')
    expect(getProjectWorkspaceTargetConnectionLabel(project)).toBe('deploy@prod.example.com:2222')
    expect(getProjectWorkspaceTargetDisplayName(project)).toBe('Production')
    expect(getProjectWorkspaceTargetSummary(project)).toBe('Production · deploy@prod.example.com:2222:/srv/app')
  })

  it('backfills project-scoped sidebar and file tab state', () => {
    const project = backfillProject(
      {
        id: 'proj-4',
        name: 'Workspace UI',
        workingDirectory: '/repo',
        workspaceLayout: {
          sidebarTab: 'logs',
          openFilePaths: ['/repo/src/app.tsx', '', 123 as never],
          activeFilePath: '/repo/src/app.tsx'
        } as Project['workspaceLayout'] // deliberately partial plus bad entries
      },
      0,
      '2026-03-08T16:30:00.000Z'
    )

    expect(project.workspaceLayout).toEqual({
      sidebarSize: DEFAULT_PROJECT_WORKSPACE_LAYOUT.sidebarSize,
      terminalSize: DEFAULT_PROJECT_WORKSPACE_LAYOUT.terminalSize,
      terminalVisible: DEFAULT_PROJECT_WORKSPACE_LAYOUT.terminalVisible,
      preferredSplitDirection: DEFAULT_PROJECT_WORKSPACE_LAYOUT.preferredSplitDirection,
      sidebarTab: 'logs',
      openFilePaths: ['/repo/src/app.tsx'],
      activeFilePath: '/repo/src/app.tsx'
    })
  })
})
