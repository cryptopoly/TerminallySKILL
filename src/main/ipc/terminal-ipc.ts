import { statSync } from 'node:fs'
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
import { reportTerminalLayout, takeSavedTerminalLayout } from '../session-restore-manager'
import { MAX_SAVED_TERMINAL_TABS, type ReportedTerminalLayout } from '../../shared/session-restore'
import { dialogDefaultPath, rememberDialogSelection } from '../dialog-path'
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

  ipcMain.on(IPC_CHANNELS.TERMINAL_LAYOUT_REPORT, (event, layout: unknown) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const parsed = parseReportedLayout(layout)
    if (win && parsed) reportTerminalLayout(win.id, parsed)
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_LAYOUT_TAKE, () => takeSavedTerminalLayout())

  ipcMain.handle(IPC_CHANNELS.PTY_GET_SESSION_INFO, async (_event, sessionId: string) => {
    return getSessionInfo(requireString(sessionId, 'sessionId'))
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      defaultPath: dialogDefaultPath(),
      properties: ['openFile']
    })
    if (result.canceled) return null

    const selectedPath = result.filePaths[0] ?? null
    if (selectedPath) {
      rememberDialogSelection(selectedPath)
      approveExternalPath(selectedPath, 'file')
    }
    return selectedPath
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY, async (event, startPath?: unknown) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      defaultPath: isDirectory(startPath) ? startPath : dialogDefaultPath(),
      properties: ['openDirectory']
    })
    if (result.canceled) return null

    const selectedPath = result.filePaths[0] ?? null
    if (selectedPath) {
      rememberDialogSelection(selectedPath)
      approveExternalPath(selectedPath, 'directory')
    }
    return selectedPath
  })

  function isDirectory(value: unknown): value is string {
    if (typeof value !== 'string' || !value) return false
    try {
      return statSync(value).isDirectory()
    } catch {
      return false
    }
  }

  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_WRITE, (_event, text: string) => {
    // Electron 44 made the main-process clipboard asynchronous.
    return clipboard.writeText(requireString(text, 'text'))
  })

  ipcMain.handle(IPC_CHANNELS.SHELL_GET_DEFAULT, () => {
    if (process.platform === 'win32') return 'powershell.exe'
    return process.env.SHELL || '/bin/zsh'
  })
}

function parseReportedLayout(value: unknown): ReportedTerminalLayout | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (!Array.isArray(raw.tabs)) return null
  const tabs = raw.tabs
    .filter((tab): tab is Record<string, unknown> => Boolean(tab) && typeof tab === 'object' && typeof tab.sessionId === 'string')
    .slice(0, MAX_SAVED_TERMINAL_TABS)
    .map((tab) => ({
      sessionId: tab.sessionId as string,
      projectId: typeof tab.projectId === 'string' ? tab.projectId : null
    }))
  return {
    tabs,
    activeSessionId: typeof raw.activeSessionId === 'string' ? raw.activeSessionId : null,
    splitSessionId: typeof raw.splitSessionId === 'string' ? raw.splitSessionId : null,
    splitDirection: raw.splitDirection === 'horizontal' ? 'horizontal' : 'vertical',
    quads: Array.isArray(raw.quads)
      ? raw.quads
          .filter((slots): slots is unknown[] => Array.isArray(slots))
          .slice(0, MAX_SAVED_TERMINAL_TABS)
          .map((slots) => slots.slice(0, 4).map((id) => (typeof id === 'string' ? id : null)))
      : []
  }
}
