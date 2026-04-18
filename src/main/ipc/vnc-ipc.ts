import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { SSHProjectWorkspaceTarget } from '../../shared/project-schema'
import { getVncPassword, saveVncPassword, deleteVncPassword } from '../vnc-credentials'
import { startVncSession, stopVncSession } from '../vnc-manager'
import { requireInteger, requireSSHWorkspaceTarget, requireString } from './validation'

export function registerVncIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.VNC_START,
    async (event, target: SSHProjectWorkspaceTarget, vncPort: number) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) throw new Error('No window found for VNC session')
      return startVncSession(
        requireSSHWorkspaceTarget(target),
        requireInteger(vncPort, 'vncPort'),
        win
      )
    }
  )

  ipcMain.on(IPC_CHANNELS.VNC_STOP, (_event, sessionId: string) => {
    stopVncSession(requireString(sessionId, 'sessionId'))
  })

  ipcMain.handle(IPC_CHANNELS.VNC_GET_PASSWORD, (_event, storageKey: string) => {
    return getVncPassword(requireString(storageKey, 'storageKey'))
  })

  ipcMain.handle(IPC_CHANNELS.VNC_SAVE_PASSWORD, (_event, storageKey: string, password: string) => {
    saveVncPassword(requireString(storageKey, 'storageKey'), requireString(password, 'password'))
  })

  ipcMain.handle(IPC_CHANNELS.VNC_DELETE_PASSWORD, (_event, storageKey: string) => {
    deleteVncPassword(requireString(storageKey, 'storageKey'))
  })
}
