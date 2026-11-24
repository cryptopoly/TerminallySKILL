import { afterEach, describe, expect, it, vi } from 'vitest'
import { useToastStore } from '../store/toast-store'
import { createSSHWorkspaceTarget, type Project } from '../../../shared/project-schema'
import {
  buildProjectExecutionCommand,
  createProjectTerminalSession,
  defaultLocalShell,
  openInteractiveProjectShell,
  terminalOpenFailureReason
} from './workspace-session'

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

  it('shows an error toast with the reason when the terminal cannot open, and still rejects', async () => {
    useToastStore.setState({ toasts: [] })
    vi.stubGlobal('window', {
      electronAPI: {
        createTerminal: vi.fn().mockRejectedValue(
          new Error("Error invoking remote method 'pty:create': Error: posix_spawnp failed.")
        )
      }
    })
    const addSession = vi.fn()

    await expect(createProjectTerminalSession(null, addSession)).rejects.toThrow('posix_spawnp failed.')

    expect(addSession).not.toHaveBeenCalled()
    expect(useToastStore.getState().toasts).toEqual([
      expect.objectContaining({
        messageKey: 'terminal:openFailed.message',
        values: { reason: 'posix_spawnp failed.' }
      })
    ])
  })

  it('names the failure without the IPC wrapper', () => {
    expect(terminalOpenFailureReason(new Error('No window found'))).toBe('No window found')
    expect(terminalOpenFailureReason(new Error("Error invoking remote method 'pty:create': boom"))).toBe('boom')
    expect(terminalOpenFailureReason('text')).toBe('text')
  })
})

describe('local shell for typed commands', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const sshProject = {
    id: 'p1',
    name: 'Prod',
    workingDirectory: '/srv/app',
    workspaceTarget: createSSHWorkspaceTarget('prod.example.com', 'deploy', '/srv/app')
  } as Project

  it('falls back to PowerShell on Windows and to a POSIX shell elsewhere', () => {
    vi.stubGlobal('navigator', { platform: 'Win32' })
    expect(defaultLocalShell()).toBe('powershell.exe')
    expect(buildProjectExecutionCommand(sshProject, 'ls')).toBe("& 'ssh' 'deploy@prod.example.com' 'cd ''/srv/app'' && ls'")

    vi.stubGlobal('navigator', { platform: 'MacIntel' })
    expect(defaultLocalShell()).toBeNull()
    expect(buildProjectExecutionCommand(sshProject, 'ls')).toBe("'ssh' 'deploy@prod.example.com' 'cd '\\''/srv/app'\\'' && ls'")
  })

  it('quotes the interactive ssh call for the shell the new session runs', async () => {
    const writeToTerminal = vi.fn()
    vi.stubGlobal('navigator', { platform: 'MacIntel' })
    vi.stubGlobal('window', {
      electronAPI: {
        createTerminal: vi.fn().mockResolvedValue('session-1'),
        getSessionInfo: vi.fn().mockResolvedValue({ shell: 'powershell.exe' }),
        writeToTerminal
      }
    })

    await openInteractiveProjectShell(sshProject, vi.fn())

    expect(writeToTerminal).toHaveBeenCalledWith(
      'session-1',
      "& 'ssh' '-t' 'deploy@prod.example.com' 'cd ''/srv/app'' && exec \\\"${SHELL:-/bin/sh}\\\" -l'\n"
    )
  })
})
