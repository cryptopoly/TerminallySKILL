import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSHWorkspaceTarget, type Project } from '../../../shared/project-schema'
import {
  buildProjectExecutionCommand,
  createProjectTerminalSession,
  defaultLocalShell,
  openInteractiveProjectShell,
  openVncViewer
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

describe('openVncViewer', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const sshProject = {
    id: 'p1',
    name: 'Desktop',
    workingDirectory: '/home/me',
    workspaceTarget: createSSHWorkspaceTarget('desk.example.com', 'me', '/home/me')
  } as Project

  it('opens one viewer for a double click, and another once the first has started', async () => {
    let finishStart: (value: { sessionId: string; wsPort: number; token: string }) => void = () => {}
    const startVncSession = vi.fn(
      () => new Promise<{ sessionId: string; wsPort: number; token: string }>((resolve) => { finishStart = resolve })
    )
    vi.stubGlobal('window', { electronAPI: { startVncSession } })
    const addSession = vi.fn()

    // Each viewer makes its own password attempts, so a second one doubled what the server saw.
    const first = openVncViewer(sshProject, addSession)
    const second = openVncViewer(sshProject, addSession)
    finishStart({ sessionId: 'vnc-1', wsPort: 4000, token: 't' })
    expect(await first).toBe('vnc-1')
    expect(await second).toBeNull()
    expect(startVncSession).toHaveBeenCalledTimes(1)
    expect(addSession).toHaveBeenCalledWith('vnc-1', 'p1', 'vnc', 4000, 't')

    const third = openVncViewer(sshProject, addSession)
    finishStart({ sessionId: 'vnc-2', wsPort: 4001, token: 'u' })
    expect(await third).toBe('vnc-2')
  })

  it('can try again after a viewer failed to start', async () => {
    const startVncSession = vi.fn().mockRejectedValueOnce(new Error('tunnel failed')).mockResolvedValue({ sessionId: 'vnc-3', wsPort: 4002, token: 'v' })
    vi.stubGlobal('window', { electronAPI: { startVncSession } })

    await expect(openVncViewer(sshProject, vi.fn())).rejects.toThrow('tunnel failed')
    expect(await openVncViewer(sshProject, vi.fn())).toBe('vnc-3')
  })
})
