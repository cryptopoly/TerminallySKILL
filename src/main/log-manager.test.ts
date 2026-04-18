import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const { mockGetSettings } = vi.hoisted(() => ({
  mockGetSettings: vi.fn()
}))

const { mockGetAllProjects } = vi.hoisted(() => ({
  mockGetAllProjects: vi.fn()
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/unused-electron-user-data')
  }
}))

vi.mock('./settings-manager', () => ({
  getSettings: mockGetSettings
}))

vi.mock('./project-manager', () => ({
  getAllProjects: mockGetAllProjects
}))

import {
  deleteLog,
  getLogBasePath,
  getLogIndex,
  readLogContent,
  sanitizeTimestamp,
  sanitizeLogFolderName,
  saveSessionLog,
  searchLogs,
  shouldSaveSessionLog
} from './log-manager'
import { resetPathAccessCacheForTests } from './path-access'

describe('log-manager', () => {
  let tempDir: string

  beforeEach(async () => {
    resetPathAccessCacheForTests()
    tempDir = await mkdtemp(join(tmpdir(), 'tv-logs-'))
    mockGetSettings.mockResolvedValue({
      saveTerminalLogs: true,
      logDirectory: tempDir
    })
    mockGetAllProjects.mockResolvedValue({
      projects: [
        {
          id: 'proj-1',
          name: 'Alpha',
          logPreference: 'inherit',
          workingDirectory: '/repo/alpha',
          workspaceTarget: { type: 'local', cwd: '/repo/alpha' }
        },
        {
          id: 'proj-2',
          name: 'Beta',
          logPreference: 'disabled',
          workingDirectory: '/repo/beta',
          workspaceTarget: { type: 'local', cwd: '/repo/beta' }
        },
        {
          id: 'proj-3',
          name: 'Gamma',
          logPreference: 'enabled',
          workingDirectory: '/repo/gamma',
          workspaceTarget: { type: 'local', cwd: '/repo/gamma' }
        }
      ]
    })
  })

  afterEach(async () => {
    resetPathAccessCacheForTests()
    mockGetSettings.mockReset()
    mockGetAllProjects.mockReset()
    await rm(tempDir, { recursive: true, force: true })
  })

  it('sanitizes timestamps for cross-platform filenames', () => {
    expect(sanitizeTimestamp('2026-03-08T15:00:10.123Z')).toBe('2026-03-08T15-00-10')
  })

  it('sanitizes human-readable log folder names', () => {
    expect(sanitizeLogFolderName('Alpha/One')).toBe('Alpha-One')
    expect(sanitizeLogFolderName('')).toBe('No Project')
  })

  it('saves logs, indexes them newest-first, and searches their contents', async () => {
    const first = await saveSessionLog({
      sessionId: 'term-1',
      projectId: 'proj-1',
      projectName: 'Alpha',
      shell: '/bin/zsh',
      cwd: '/repo',
      startedAt: '2026-03-08T15:00:00.000Z',
      exitCode: 0,
      content: 'boot\nserver ready\n'
    })

    expect(first).not.toBeNull()
    expect(first?.lineCount).toBe(3)
    expect(first?.sizeBytes).toBe(Buffer.byteLength('boot\nserver ready\n', 'utf8'))

    await new Promise((resolve) => setTimeout(resolve, 5))

    const second = await saveSessionLog({
      sessionId: 'term-2',
      projectId: 'proj-1',
      projectName: 'Alpha',
      shell: '/bin/zsh',
      cwd: '/repo',
      startedAt: '2026-03-08T15:01:00.000Z',
      exitCode: 2,
      content: 'build failed\nerror: missing env\n'
    })

    const index = await getLogIndex('proj-1')
    expect(index).toHaveLength(2)
    expect(index[0].sessionId).toBe(second?.sessionId)
    expect(index[1].sessionId).toBe(first?.sessionId)

    const searchResults = await searchLogs('proj-1', 'error')
    expect(searchResults).toHaveLength(1)
    expect(searchResults[0].sessionId).toBe('term-2')
    expect(searchResults[0].matchLines).toEqual(['error: missing env'])

    const savedContent = await readFile(second!.logFilePath, 'utf8')
    expect(savedContent).toBe('build failed\nerror: missing env\n')
  })

  it('deletes log files and companion metadata', async () => {
    const log = await saveSessionLog({
      sessionId: 'term-9',
      projectId: null,
      projectName: null,
      shell: '/bin/bash',
      cwd: '/tmp',
      startedAt: '2026-03-08T15:02:00.000Z',
      exitCode: null,
      content: 'plain output\n'
    })

    expect(log).not.toBeNull()
    expect(await getLogBasePath(null)).toBe(join(tempDir, 'No Project'))

    await deleteLog(log!.logFilePath)

    const index = await getLogIndex(null)
    expect(index).toEqual([])
  })

  it('reads log content through the observed path-access layer', async () => {
    const log = await saveSessionLog({
      sessionId: 'term-12',
      projectId: 'proj-1',
      projectName: 'Alpha',
      shell: '/bin/zsh',
      cwd: '/repo',
      startedAt: '2026-03-08T15:04:00.000Z',
      exitCode: 0,
      content: 'ready\n'
    })

    await expect(readLogContent(log!.logFilePath)).resolves.toBe('ready\n')
  })

  it('rejects log reads outside configured log roots', async () => {
    const externalLogPath = join(tempDir, '..', 'outside.log')
    await writeFile(externalLogPath, 'outside\n', 'utf8')

    await expect(readLogContent(externalLogPath)).rejects.toThrow(
      '[path-access] logs:read-content blocked path outside expected roots'
    )
  })

  it('caps search matches per file and skips corrupt metadata files', async () => {
    const log = await saveSessionLog({
      sessionId: 'term-10',
      projectId: 'proj-2',
      projectName: 'Beta',
      shell: '/bin/zsh',
      cwd: '/repo',
      startedAt: '2026-03-08T15:03:00.000Z',
      exitCode: 1,
      content: Array.from({ length: 12 }, (_, i) => `error line ${i + 1}`).join('\n')
    })

    const logDir = join(tempDir, 'Beta')
    await writeFile(join(logDir, 'corrupt.meta.json'), '{not valid json', 'utf8')

    const index = await getLogIndex('proj-2')
    expect(index).toHaveLength(1)
    expect(index[0].sessionId).toBe(log?.sessionId)

    const results = await searchLogs('proj-2', 'error')
    expect(results).toHaveLength(1)
    expect(results[0].matchLines).toHaveLength(10)
    expect(results[0].matchLines[0]).toBe('error line 1')
    expect(results[0].matchLines[9]).toBe('error line 10')
  })

  it('resolves log saving from global settings and per-project overrides', async () => {
    expect(await shouldSaveSessionLog(null)).toBe(true)
    expect(await shouldSaveSessionLog('proj-1')).toBe(true)
    expect(await shouldSaveSessionLog('proj-2')).toBe(false)
    expect(await shouldSaveSessionLog('proj-3')).toBe(true)

    mockGetSettings.mockResolvedValueOnce({
      saveTerminalLogs: false,
      logDirectory: tempDir
    })
    expect(await shouldSaveSessionLog('proj-1')).toBe(false)
  })
})
