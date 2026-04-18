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
    reset: () => {
      handles.clear()
      listeners.clear()
    }
  }
})

const vncManagerMocks = vi.hoisted(() => ({
  startVncSession: vi.fn(),
  stopVncSession: vi.fn()
}))

const credentialMocks = vi.hoisted(() => ({
  getVncPassword: vi.fn(),
  saveVncPassword: vi.fn(),
  deleteVncPassword: vi.fn()
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: electronMocks.handle,
    on: electronMocks.on
  },
  BrowserWindow: {
    fromWebContents: electronMocks.fromWebContents
  }
}))

vi.mock('../vnc-manager', () => ({
  startVncSession: vncManagerMocks.startVncSession,
  stopVncSession: vncManagerMocks.stopVncSession
}))

vi.mock('../vnc-credentials', () => ({
  getVncPassword: credentialMocks.getVncPassword,
  saveVncPassword: credentialMocks.saveVncPassword,
  deleteVncPassword: credentialMocks.deleteVncPassword
}))

import { registerVncIpcHandlers } from './vnc-ipc'

describe('vnc-ipc', () => {
  beforeEach(() => {
    electronMocks.reset()
    vi.clearAllMocks()
    registerVncIpcHandlers()
  })

  it('starts vnc sessions against the sender window and forwards the ssh target', async () => {
    const win = { id: 4 }
    const target = {
      type: 'ssh',
      host: 'prod.example.com',
      user: 'deploy',
      port: null,
      cwd: '/srv/app',
      identityFile: null,
      label: null,
      vncPort: 5901
    }
    const session = { sessionId: 'vnc-1', wsPort: 3200, token: 'abc123' }
    electronMocks.fromWebContents.mockReturnValue(win)
    vncManagerMocks.startVncSession.mockResolvedValue(session)

    const handler = electronMocks.handles.get(IPC_CHANNELS.VNC_START)
    await expect(handler?.({ sender: 'sender-web-contents' }, target, 5901)).resolves.toBe(session)
    expect(vncManagerMocks.startVncSession).toHaveBeenCalledWith(target, 5901, win)
  })

  it('rejects vnc startup when the sender window cannot be resolved', async () => {
    electronMocks.fromWebContents.mockReturnValue(null)

    const handler = electronMocks.handles.get(IPC_CHANNELS.VNC_START)
    await expect(handler?.({ sender: 'missing' }, { type: 'ssh' }, 5901)).rejects.toThrow(
      'No window found for VNC session'
    )
  })

  it('forwards stop and credential operations unchanged', async () => {
    credentialMocks.getVncPassword.mockReturnValue('secret')

    const stopListener = electronMocks.listeners.get(IPC_CHANNELS.VNC_STOP)
    const getHandler = electronMocks.handles.get(IPC_CHANNELS.VNC_GET_PASSWORD)
    const saveHandler = electronMocks.handles.get(IPC_CHANNELS.VNC_SAVE_PASSWORD)
    const deleteHandler = electronMocks.handles.get(IPC_CHANNELS.VNC_DELETE_PASSWORD)

    stopListener?.({}, 'vnc-1')
    expect(vncManagerMocks.stopVncSession).toHaveBeenCalledWith('vnc-1')

    expect(getHandler?.({}, 'prod-key')).toBe('secret')
    expect(credentialMocks.getVncPassword).toHaveBeenCalledWith('prod-key')

    saveHandler?.({}, 'prod-key', 'secret')
    expect(credentialMocks.saveVncPassword).toHaveBeenCalledWith('prod-key', 'secret')

    deleteHandler?.({}, 'prod-key')
    expect(credentialMocks.deleteVncPassword).toHaveBeenCalledWith('prod-key')
  })

  it('rejects malformed vnc targets before starting a session', async () => {
    const win = { id: 4 }
    electronMocks.fromWebContents.mockReturnValue(win)

    const handler = electronMocks.handles.get(IPC_CHANNELS.VNC_START)
    await expect(handler?.({ sender: 'sender-web-contents' }, { type: 'ssh', host: 42 }, 5901)).rejects.toThrow(
      'Invalid target.host: expected string'
    )
    expect(vncManagerMocks.startVncSession).not.toHaveBeenCalled()
  })
})
