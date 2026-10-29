import { app, BrowserWindow, Notification } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type { AttentionNotifyRequest } from '../shared/attention'

const badgeCountByWindow = new Map<number, number>()

function applyBadge(): void {
  let total = 0
  for (const count of badgeCountByWindow.values()) total += count
  // macOS dock and Linux launchers. Windows has no numeric badge; it is a no-op there.
  app.setBadgeCount(total)
}

export function setWindowBadgeCount(win: BrowserWindow, count: number): void {
  if (count <= 0) badgeCountByWindow.delete(win.id)
  else badgeCountByWindow.set(win.id, count)
  applyBadge()
}

export function forgetWindowBadge(win: BrowserWindow): void {
  if (badgeCountByWindow.delete(win.id)) applyBadge()
}

export function notifyAttention(win: BrowserWindow, request: AttentionNotifyRequest): void {
  if (!Notification.isSupported() || win.isDestroyed()) return

  const notification = new Notification({ title: request.title, body: request.body, silent: false })
  notification.on('click', () => {
    if (win.isDestroyed()) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
    win.webContents.send(IPC_CHANNELS.ATTENTION_FOCUS_SESSION, request.sessionId)
  })
  notification.show()
}
