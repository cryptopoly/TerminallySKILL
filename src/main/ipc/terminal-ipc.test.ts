import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

const electronMocks = vi.hoisted(() => {
  const handles = new Map<string, (...args: any[]) => any>()
  const listeners = new Map<string, (...args: any[]) => any>()
  return {
    handles,
    listeners,
    handle: vi.fn((channel: string, handler: (...args: any[]) => any) => {
      handles.set(channel, handler)
    }),
    on: vi.fn((channel: string, handler: (...args: any[]) => any) => {
      listeners.set(channel, handler)
    }),
    fromWebContents: vi.fn(),
    showOpenDialog: vi.fn(),
    writeText: vi.fn(),
    reset: () => {
      handles.clear()
      listeners.clear()
    }
  }
})

const ptyManagerMocks = vi.hoisted(() => ({
  createTerminal: vi.fn(),
  writeToTerminal: vi.fn(),
  resizeTerminal: vi.fn(),
  killTerminal: vi.fn(),
  getSessionInfo: vi.fn()
}))

const pathApprovalMocks = vi.hoisted(() => ({
  approveExternalPath: vi.fn()
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: electronMocks.handle,
    on: electronMocks.on
  },
  BrowserWindow: {
    fromWebContents: electronMocks.fromWebContents
  },
  dialog: {
    showOpenDialog: electronMocks.showOpenDialog
  },
  clipboard: {
    writeText: electronMocks.writeText
  }
}))

vi.mock('../pty-manager', () => ({
  createTerminal: ptyManagerMocks.createTerminal,
  writeToTerminal: ptyManagerMocks.writeToTerminal,
  resizeTerminal: ptyManagerMocks.resizeTerminal,
  killTerminal: ptyManagerMocks.killTerminal,
  getSessionInfo: ptyManagerMocks.getSessionInfo
}))

vi.mock('../path-approvals', () => ({
  approveExternalPath: pathApprovalMocks.approveExternalPath
}))

import { registerTerminalIpcHandlers } from './terminal-ipc'

describe('terminal-ipc', () => {
  beforeEach(() => {
    electronMocks.reset()
    vi.clearAllMocks()
    registerTerminalIpcHandlers()
  })

  it('creates terminals against the sender window and forwards all launch arguments', async () => {
    const win = { id: 7 }
    electronMocks.fromWebContents.mockReturnValue(win)
    ptyManagerMocks.createTerminal.mockResolvedValue('term-1')
    const envOverrides = { FOO: 'bar' }

    const handler = electronMocks.handles.get(IPC_CHANNELS.PTY_CREATE)
    await expect(
      handler?.({ sender: 'sender-web-contents' }, '/repo', 'proj-1', 'Alpha', '/repo', envOverrides)
    ).resolves.toBe('term-1')

    expect(ptyManagerMocks.createTerminal).toHaveBeenCalledWith(
      win,
      '/repo',
      'proj-1',
      'Alpha',
      '/repo',
      envOverrides
    )
  })

  it('rejects terminal creation when the sender window cannot be resolved', async () => {
    electronMocks.fromWebContents.mockReturnValue(null)

    const handler = electronMocks.handles.get(IPC_CHANNELS.PTY_CREATE)
    await expect(handler?.({ sender: 'missing' })).rejects.toThrow('No window found for PTY creation')
  })

  it('forwards terminal input events and clipboard writes unchanged', async () => {
    const writeListener = electronMocks.listeners.get(IPC_CHANNELS.PTY_WRITE)
    const resizeListener = electronMocks.listeners.get(IPC_CHANNELS.PTY_RESIZE)
    const killListener = electronMocks.listeners.get(IPC_CHANNELS.PTY_KILL)
    const clipboardHandler = electronMocks.handles.get(IPC_CHANNELS.CLIPBOARD_WRITE)

    writeListener?.({}, 'term-1', 'npm test\n')
    resizeListener?.({}, 'term-1', 120, 40)
    killListener?.({}, 'term-1')
    await clipboardHandler?.({}, 'copied text')

    expect(ptyManagerMocks.writeToTerminal).toHaveBeenCalledWith('term-1', 'npm test\n')
    expect(ptyManagerMocks.resizeTerminal).toHaveBeenCalledWith('term-1', 120, 40)
    expect(ptyManagerMocks.killTerminal).toHaveBeenCalledWith('term-1')
    expect(electronMocks.writeText).toHaveBeenCalledWith('copied text')
  })

  it('rejects malformed resize payloads before they reach the pty manager', () => {
    const resizeListener = electronMocks.listeners.get(IPC_CHANNELS.PTY_RESIZE)

    expect(() => resizeListener?.({}, 'term-1', 120.5, 40)).toThrow(
      'Invalid cols: expected integer'
    )
    expect(ptyManagerMocks.resizeTerminal).not.toHaveBeenCalled()
  })

  it('registers approved external selections when a file or directory is picked', async () => {
    const win = { id: 7 }
    electronMocks.fromWebContents.mockReturnValue(win)
    electronMocks.showOpenDialog
      .mockResolvedValueOnce({ canceled: false, filePaths: ['/tmp/external.env'] })
      .mockResolvedValueOnce({ canceled: false, filePaths: ['/tmp/external-workspace'] })

    const openFileHandler = electronMocks.handles.get(IPC_CHANNELS.DIALOG_OPEN_FILE)
    const openDirectoryHandler = electronMocks.handles.get(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY)

    await expect(openFileHandler?.({ sender: 'sender-web-contents' })).resolves.toBe(
      '/tmp/external.env'
    )
    await expect(openDirectoryHandler?.({ sender: 'sender-web-contents' })).resolves.toBe(
      '/tmp/external-workspace'
    )

    expect(pathApprovalMocks.approveExternalPath).toHaveBeenNthCalledWith(
      1,
      '/tmp/external.env',
      'file'
    )
    expect(pathApprovalMocks.approveExternalPath).toHaveBeenNthCalledWith(
      2,
      '/tmp/external-workspace',
      'directory'
    )
  })

  it('does not register approvals when the dialog is cancelled', async () => {
    const win = { id: 7 }
    electronMocks.fromWebContents.mockReturnValue(win)
    electronMocks.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })

    const openFileHandler = electronMocks.handles.get(IPC_CHANNELS.DIALOG_OPEN_FILE)

    await expect(openFileHandler?.({ sender: 'sender-web-contents' })).resolves.toBeNull()
    expect(pathApprovalMocks.approveExternalPath).not.toHaveBeenCalled()
  })
})
