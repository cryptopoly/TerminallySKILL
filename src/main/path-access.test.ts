import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const settingsManagerMocks = vi.hoisted(() => ({
  getSettings: vi.fn()
}))

const projectManagerMocks = vi.hoisted(() => ({
  getAllProjects: vi.fn()
}))

const userDataPathMocks = vi.hoisted(() => ({
  getUserDataDir: vi.fn(),
  getCustomDataDir: vi.fn(),
  getDataDir: vi.fn(),
  getLogsDir: vi.fn()
}))

vi.mock('./settings-manager', () => ({
  getSettings: settingsManagerMocks.getSettings
}))

vi.mock('./project-manager', () => ({
  getAllProjects: projectManagerMocks.getAllProjects
}))

vi.mock('./user-data-path', () => ({
  getUserDataDir: userDataPathMocks.getUserDataDir,
  getCustomDataDir: userDataPathMocks.getCustomDataDir,
  getDataDir: userDataPathMocks.getDataDir,
  getLogsDir: userDataPathMocks.getLogsDir
}))

import {
  getKnownPathRoots,
  observePathAccess,
  resetPathAccessCacheForTests
} from './path-access'
import { approveExternalPath } from './path-approvals'

describe('path-access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPathAccessCacheForTests()

    userDataPathMocks.getUserDataDir.mockReturnValue('/Users/dan/Library/Application Support/TerminallySKILL')
    userDataPathMocks.getCustomDataDir.mockReturnValue('/Users/dan/TerminallySKILLData')
    userDataPathMocks.getDataDir.mockReturnValue('/Users/dan/TerminallySKILLData/data')
    userDataPathMocks.getLogsDir.mockReturnValue('/Users/dan/TerminallySKILLData/logs')
    settingsManagerMocks.getSettings.mockResolvedValue({
      logDirectory: '/Users/dan/Logs/TerminallySKILL'
    })
    projectManagerMocks.getAllProjects.mockResolvedValue({
      projects: [
        {
          id: 'proj-1',
          name: 'TerminallySKILL',
          workingDirectory: '/Users/dan/TerminallySKILL',
          workspaceTarget: { type: 'local', cwd: '/Users/dan/TerminallySKILL' }
        },
        {
          id: 'proj-2',
          name: 'Remote',
          workingDirectory: '/srv/app',
          workspaceTarget: { type: 'ssh', host: 'prod', user: 'deploy', port: 22, cwd: '/srv/app', identityFile: null, label: null, vncPort: null }
        }
      ]
    })
  })

  afterEach(() => {
    resetPathAccessCacheForTests()
  })

  it('collects known roots from user data, settings, and local projects', async () => {
    const roots = await getKnownPathRoots()

    expect(roots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'user-data', path: '/Users/dan/Library/Application Support/TerminallySKILL' }),
        expect.objectContaining({ kind: 'custom-data-root', path: '/Users/dan/TerminallySKILLData' }),
        expect.objectContaining({ kind: 'configured-log-dir', path: '/Users/dan/Logs/TerminallySKILL' }),
        expect.objectContaining({ kind: 'project-dir', path: '/Users/dan/TerminallySKILL' })
      ])
    )
    expect(roots.some((root) => root.path === '/srv/app')).toBe(false)
  })

  it('recognizes paths that fall within expected project roots', async () => {
    const observed = await observePathAccess('/Users/dan/TerminallySKILL/src/main/index.ts', {
      purpose: 'files:read-content',
      expectedKinds: ['project-dir']
    })

    expect(observed.path).toBe('/Users/dan/TerminallySKILL/src/main/index.ts')
    expect(observed.withinExpectedRoots).toBe(true)
    expect(observed.matchedRoots).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'project-dir' })])
    )
  })

  it('includes approved external paths as dynamic known roots', async () => {
    approveExternalPath('/tmp/external-note.txt', 'file')
    approveExternalPath('/tmp/external-workspace', 'directory')

    const roots = await getKnownPathRoots()

    expect(roots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'approved-external-file',
          path: '/tmp/external-note.txt'
        }),
        expect.objectContaining({
          kind: 'approved-external-directory',
          path: '/tmp/external-workspace'
        })
      ])
    )
  })

  it('treats approved external directory paths as allowed when explicitly expected', async () => {
    approveExternalPath('/tmp/external-workspace', 'directory')

    const observed = await observePathAccess('/tmp/external-workspace/subdir/note.txt', {
      purpose: 'files:write-content',
      expectedKinds: ['approved-external-directory'],
      mode: 'enforce'
    })

    expect(observed.withinExpectedRoots).toBe(true)
    expect(observed.matchedRoots).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'approved-external-directory' })])
    )
  })

  it('allows external paths in observe mode but warns once for unexpected log paths', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const first = await observePathAccess('/tmp/random.log', {
      purpose: 'logs:read-content',
      expectedKinds: ['logs-dir', 'configured-log-dir'],
      warnIfOutsideKnownRoots: true
    })
    const second = await observePathAccess('/tmp/random.log', {
      purpose: 'logs:read-content',
      expectedKinds: ['logs-dir', 'configured-log-dir'],
      warnIfOutsideKnownRoots: true
    })

    expect(first.withinExpectedRoots).toBe(false)
    expect(second.withinExpectedRoots).toBe(false)
    expect(warnSpy).toHaveBeenCalledTimes(1)

    warnSpy.mockRestore()
  })

  it('blocks external paths in enforce mode', async () => {
    await expect(
      observePathAccess('/tmp/random.log', {
        purpose: 'logs:delete',
        expectedKinds: ['logs-dir', 'configured-log-dir'],
        mode: 'enforce'
      })
    ).rejects.toThrow('[path-access] logs:delete blocked path outside expected roots: /tmp/random.log')
  })
})
