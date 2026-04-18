import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm, truncate, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

const electronMocks = vi.hoisted(() => {
  const handles = new Map<string, (...args: any[]) => any>()
  return {
    handles,
    handle: vi.fn((channel: string, handler: (...args: any[]) => any) => {
      handles.set(channel, handler)
    }),
    reset: () => {
      handles.clear()
    }
  }
})

const childProcessMocks = vi.hoisted(() => ({
  execFile: vi.fn()
}))

const projectManagerMocks = vi.hoisted(() => ({
  listDirectoryContents: vi.fn(),
  createEmptyFile: vi.fn(),
  openInSystemExplorer: vi.fn(),
  revealInSystemExplorer: vi.fn(),
  getAllProjects: vi.fn()
}))

const pathAccessMocks = vi.hoisted(() => ({
  observePathAccess: vi.fn(async (pathValue: string) => ({
    path: pathValue,
    matchedRoots: [],
    withinExpectedRoots: true
  }))
}))

const pathApprovalMocks = vi.hoisted(() => ({
  approveExternalPath: vi.fn()
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: electronMocks.handle
  }
}))

vi.mock('child_process', () => ({
  execFile: childProcessMocks.execFile
}))

vi.mock('../project-manager', () => ({
  listDirectoryContents: projectManagerMocks.listDirectoryContents,
  createEmptyFile: projectManagerMocks.createEmptyFile,
  openInSystemExplorer: projectManagerMocks.openInSystemExplorer,
  revealInSystemExplorer: projectManagerMocks.revealInSystemExplorer,
  getAllProjects: projectManagerMocks.getAllProjects
}))

vi.mock('../path-access', () => ({
  observePathAccess: pathAccessMocks.observePathAccess,
  ALL_KNOWN_PATH_ROOT_KINDS: [
    'project-dir',
    'user-data',
    'data-dir',
    'logs-dir',
    'custom-data-root',
    'configured-log-dir',
    'approved-external-file',
    'approved-external-directory'
  ] as const
}))

vi.mock('../path-approvals', () => ({
  approveExternalPath: pathApprovalMocks.approveExternalPath
}))

import { registerFileIpcHandlers } from './file-ipc'

describe('file-ipc', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'tv-file-ipc-'))
    electronMocks.reset()
    vi.clearAllMocks()
    registerFileIpcHandlers()
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('writes file content and reads it back through registered handlers', async () => {
    const filePath = join(tempDir, 'note.txt')
    const writeHandler = electronMocks.handles.get(IPC_CHANNELS.FILES_WRITE_CONTENT)
    const readHandler = electronMocks.handles.get(IPC_CHANNELS.FILES_READ_CONTENT)

    expect(writeHandler).toBeDefined()
    expect(readHandler).toBeDefined()

    const writeResult = await writeHandler?.({}, filePath, 'hello world\n')
    expect(writeResult).toMatchObject({
      success: true,
      size: Buffer.byteLength('hello world\n', 'utf8')
    })

    const readResult = await readHandler?.({}, filePath)
    expect(readResult).toEqual({
      content: 'hello world\n',
      truncated: false,
      size: Buffer.byteLength('hello world\n', 'utf8'),
      modifiedAt: expect.any(Number)
    })
    expect(pathAccessMocks.observePathAccess).toHaveBeenCalledWith(
      filePath,
      expect.objectContaining({
        purpose: 'files:write-content',
        mode: 'enforce',
        expectedKinds: expect.arrayContaining([
          'approved-external-file',
          'approved-external-directory'
        ])
      })
    )
  })

  it('reads file content through the enforced scoped read boundary', async () => {
    const filePath = join(tempDir, 'scoped.txt')
    await writeFile(filePath, 'scoped content\n')
    const readHandler = electronMocks.handles.get(IPC_CHANNELS.FILES_READ_SCOPED_CONTENT)

    const result = await readHandler?.({}, filePath)

    expect(result).toEqual({
      content: 'scoped content\n',
      truncated: false,
      size: Buffer.byteLength('scoped content\n', 'utf8'),
      modifiedAt: expect.any(Number)
    })
    expect(pathAccessMocks.observePathAccess).toHaveBeenCalledWith(
      filePath,
      expect.objectContaining({
        purpose: 'files:read-scoped-content',
        mode: 'enforce',
        expectedKinds: expect.arrayContaining([
          'approved-external-file',
          'approved-external-directory'
        ])
      })
    )
  })

  it('approves and reads terminal-linked files through the enforced boundary', async () => {
    const filePath = join(tempDir, 'linked.txt')
    await writeFile(filePath, 'linked content\n')
    const readHandler = electronMocks.handles.get(IPC_CHANNELS.FILES_READ_APPROVED_CONTENT)

    const result = await readHandler?.({}, filePath)

    expect(result).toEqual({
      content: 'linked content\n',
      truncated: false,
      size: Buffer.byteLength('linked content\n', 'utf8'),
      modifiedAt: expect.any(Number)
    })
    expect(pathApprovalMocks.approveExternalPath).toHaveBeenCalledWith(filePath, 'file')
    expect(pathAccessMocks.observePathAccess).toHaveBeenCalledWith(
      filePath,
      expect.objectContaining({
        purpose: 'files:read-approved-content',
        mode: 'enforce'
      })
    )
  })

  it('creates files through the enforced write boundary', async () => {
    const filePath = join(tempDir, 'created.txt')
    const createHandler = electronMocks.handles.get(IPC_CHANNELS.FILES_CREATE_FILE)

    projectManagerMocks.createEmptyFile.mockResolvedValue(undefined)

    const result = await createHandler?.({}, filePath)

    expect(result).toEqual({ success: true })
    expect(pathAccessMocks.observePathAccess).toHaveBeenCalledWith(
      filePath,
      expect.objectContaining({ purpose: 'files:create-file', mode: 'enforce' })
    )
    expect(projectManagerMocks.createEmptyFile).toHaveBeenCalledWith(filePath)
  })

  it('refuses oversized files before attempting to read them', async () => {
    const filePath = join(tempDir, 'large.log')
    await writeFile(filePath, '')
    await truncate(filePath, 51 * 1024 * 1024)

    const readHandler = electronMocks.handles.get(IPC_CHANNELS.FILES_READ_CONTENT)
    const result = await readHandler?.({}, filePath)

    expect(result).toEqual({
      tooLarge: true,
      size: 51 * 1024 * 1024,
      modifiedAt: expect.any(Number)
    })
  })

  it('falls back to node search when ripgrep is unavailable', async () => {
    const filePath = join(tempDir, 'app.log')
    await writeFile(filePath, 'booting\nfatal: broken config\nok\n', 'utf8')
    childProcessMocks.execFile.mockImplementation(
      (
        _command: string,
        _args: readonly string[],
        _options: { maxBuffer: number },
        callback: (error: Error & { code?: string }, stdout: string, stderr: string) => void
      ) => {
        callback(Object.assign(new Error('spawn rg ENOENT'), { code: 'ENOENT' }), '', '')
      }
    )

    const searchHandler = electronMocks.handles.get(IPC_CHANNELS.FILES_SEARCH)
    const result = await searchHandler?.({}, tempDir, 'fatal', {})

    expect(result).toEqual({
      results: [
        {
          filePath,
          matches: [{ lineNumber: 2, lineText: 'fatal: broken config' }]
        }
      ],
      usedRipgrep: false
    })
  })

  it('rejects malformed search option payloads before touching the filesystem', async () => {
    const searchHandler = electronMocks.handles.get(IPC_CHANNELS.FILES_SEARCH)

    await expect(searchHandler?.({}, tempDir, 'fatal', { caseSensitive: 'yes' })).rejects.toThrow(
      'Invalid options.caseSensitive: expected boolean'
    )
  })

  it('returns an error when path enforcement blocks file writes', async () => {
    const writeHandler = electronMocks.handles.get(IPC_CHANNELS.FILES_WRITE_CONTENT)
    pathAccessMocks.observePathAccess.mockRejectedValueOnce(
      new Error('[path-access] files:write-content blocked path outside expected roots: /tmp/outside.txt')
    )

    const result = await writeHandler?.({}, '/tmp/outside.txt', 'nope')

    expect(result).toEqual({
      error: 'Error: [path-access] files:write-content blocked path outside expected roots: /tmp/outside.txt'
    })
  })

  it('returns an error when scoped path enforcement blocks file reads', async () => {
    const readHandler = electronMocks.handles.get(IPC_CHANNELS.FILES_READ_SCOPED_CONTENT)
    pathAccessMocks.observePathAccess.mockRejectedValueOnce(
      new Error('[path-access] files:read-scoped-content blocked path outside expected roots: /tmp/outside.txt')
    )

    const result = await readHandler?.({}, '/tmp/outside.txt')

    expect(result).toEqual({
      error: 'Error: [path-access] files:read-scoped-content blocked path outside expected roots: /tmp/outside.txt'
    })
  })

  it('returns an error when approved path reads are still blocked', async () => {
    const readHandler = electronMocks.handles.get(IPC_CHANNELS.FILES_READ_APPROVED_CONTENT)
    pathAccessMocks.observePathAccess.mockRejectedValueOnce(
      new Error('[path-access] files:read-approved-content blocked path outside expected roots: /tmp/outside.txt')
    )

    const result = await readHandler?.({}, '/tmp/outside.txt')

    expect(pathApprovalMocks.approveExternalPath).toHaveBeenCalledWith('/tmp/outside.txt', 'file')
    expect(result).toEqual({
      error: 'Error: [path-access] files:read-approved-content blocked path outside expected roots: /tmp/outside.txt'
    })
  })
})
