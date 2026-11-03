import { BrowserWindow, ipcMain, powerMonitor } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { notifyAttention, openSystemNotificationSettings, setWindowBadgeCount } from '../attention-manager'
import { requirePlainObject, requireString } from './validation'

export function registerAttentionIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.ATTENTION_NOTIFY, (event, request: unknown) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    const plain = requirePlainObject(request, 'request') as Record<string, unknown>
    notifyAttention(win, {
      sessionId: requireString(plain.sessionId, 'sessionId'),
      title: requireString(plain.title, 'title'),
      body: typeof plain.body === 'string' ? plain.body : '',
      keepUntilDismissed: plain.keepUntilDismissed === true
    })
  })

  ipcMain.handle(IPC_CHANNELS.ATTENTION_OPEN_SYSTEM_SETTINGS, () => openSystemNotificationSettings())

  ipcMain.handle(IPC_CHANNELS.ATTENTION_IDLE_SECONDS, () => powerMonitor.getSystemIdleTime())

  ipcMain.handle(IPC_CHANNELS.ATTENTION_SET_BADGE, (event, count: unknown) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    setWindowBadgeCount(win, typeof count === 'number' && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0)
  })
}
