import { ipcMain, BrowserWindow, dialog, clipboard } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import {
  createTerminal,
  writeToTerminal,
  resizeTerminal,
  killTerminal,
  getSessionInfo
} from '../pty-manager'
import { approveExternalPath } from '../path-approvals'
import {
  optionalString,
  optionalStringRecord,
  requireInteger,
  requireString
} from './validation'

export function registerTerminalIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.PTY_CREATE,
    async (
      event,
      cwd?: string,
      projectId?: string,
      projectName?: string,
      projectWorkingDir?: string,
      envOverrides?: Record<string, string>
    ) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) throw new Error('No window found for PTY creation')
      return createTerminal(
        win,
        optionalString(cwd, 'cwd'),
        optionalString(projectId, 'projectId'),
        optionalString(projectName, 'projectName'),
        optionalString(projectWorkingDir, 'projectWorkingDir'),
        optionalStringRecord(envOverrides, 'envOverrides')
      )
    }
  )

  ipcMain.on(IPC_CHANNELS.PTY_WRITE, (_event, sessionId: string, data: string) => {
    writeToTerminal(requireString(sessionId, 'sessionId'), requireString(data, 'data'))
  })

  ipcMain.on(IPC_CHANNELS.PTY_RESIZE, (_event, sessionId: string, cols: number, rows: number) => {
    resizeTerminal(
      requireString(sessionId, 'sessionId'),
      requireInteger(cols, 'cols'),
      requireInteger(rows, 'rows')
    )
  })

  ipcMain.on(IPC_CHANNELS.PTY_KILL, (_event, sessionId: string) => {
    killTerminal(requireString(sessionId, 'sessionId'))
  })

  ipcMain.handle(IPC_CHANNELS.PTY_GET_SESSION_INFO, async (_event, sessionId: string) => {
    return getSessionInfo(requireString(sessionId, 'sessionId'))
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile']
    })
    if (result.canceled) return null

    const selectedPath = result.filePaths[0] ?? null
    if (selectedPath) {
      approveExternalPath(selectedPath, 'file')
    }
    return selectedPath
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })
    if (result.canceled) return null

    const selectedPath = result.filePaths[0] ?? null
    if (selectedPath) {
      approveExternalPath(selectedPath, 'directory')
    }
    return selectedPath
  })

  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_WRITE, (_event, text: string) => {
    clipboard.writeText(requireString(text, 'text'))
  })

  ipcMain.handle(IPC_CHANNELS.SHELL_GET_DEFAULT, () => {
    if (process.platform === 'win32') return 'powershell.exe'
    return process.env.SHELL || '/bin/zsh'
  })
}
