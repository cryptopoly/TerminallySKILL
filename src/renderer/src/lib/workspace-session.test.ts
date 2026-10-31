import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProjectTerminalSession } from './workspace-session'

describe('createProjectTerminalSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('passes undefined, never null, for the project working directory when there is no project', async () => {
    const createTerminal = vi.fn().mockResolvedValue('session-1')
    vi.stubGlobal('window', { electronAPI: { createTerminal } })
    const addSession = vi.fn()

    const sessionId = await createProjectTerminalSession(null, addSession)

    expect(sessionId).toBe('session-1')
    // The pty:create IPC validator only accepts a string or undefined; null threw "Invalid projectWorkingDir".
    expect(createTerminal.mock.calls[0][3]).toBeUndefined()
    expect(addSession).toHaveBeenCalledWith('session-1', null, 'workspace-shell')
  })
})
