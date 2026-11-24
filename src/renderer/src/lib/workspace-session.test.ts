import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSHWorkspaceTarget, type Project } from '../../../shared/project-schema'
import {
  buildProjectExecutionCommand,
  createProjectTerminalSession,
  defaultLocalShell,
  openInteractiveProjectShell
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
