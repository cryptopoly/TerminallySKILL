import { app, BrowserWindow, dialog, ipcMain, Menu, session } from 'electron'
import { join, resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'
import { initTerminalPath, killSessionsForWindow, killAllTerminals, getActiveSessionCountForWindow, getSessionCountForWindow } from './pty-manager'
import { stopVncSessionsForWindow, stopAllVncSessions } from './vnc-manager'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { getUserDataDir, setCustomDataDir } from './user-data-path'
import { openSafeExternalUrl } from './external-url'
import { getNativeTranslator, onUiLocaleChange } from './native-i18n'
import { forgetWindowBadge } from './attention-manager'
import { describeOutboundUrl, recordOutboundRequest } from './network-log'
import { startScheduler, stopScheduler } from './schedule-manager'

console.log('[terminallyskill] Main process loaded (v2 — shell integration + log save)')

const APP_DISPLAY_NAME = 'TerminallySKILL'
const LINUX_DESKTOP_FILE = 'terminallyskill.desktop'
const USER_DATA_DIR_OVERRIDE = process.env.TERMINALLYSKILL_USER_DATA_DIR?.trim()

if (USER_DATA_DIR_OVERRIDE) {
  app.setPath('userData', resolve(USER_DATA_DIR_OVERRIDE))
}

// Two instances sharing one data dir race on the JSON stores, so a second launch
// hands over to the first. Dev builds are exempt so `npm run dev` can run beside an installed app.
if (!is.dev && !app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const [existing] = BrowserWindow.getAllWindows()
    if (!existing) {
      if (app.isReady()) createWindow()
      return
    }
    if (existing.isMinimized()) existing.restore()
    existing.focus()
  })
}

if (process.platform === 'linux') {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('ozone-platform', 'x11')
  app.commandLine.appendSwitch('ozone-platform-hint', 'x11')

  if (app.isPackaged) {
    app.commandLine.appendSwitch('no-sandbox')
    app.commandLine.appendSwitch('disable-setuid-sandbox')
  }
}

const windows = new Set<BrowserWindow>()

function isAllowedRendererNavigation(navigationUrl: string): boolean {
  try {
    const parsedNavigationUrl = new URL(navigationUrl)

    if (!is.dev) {
      return parsedNavigationUrl.protocol === 'file:'
    }

    const rendererUrl = process.env['ELECTRON_RENDERER_URL']
    if (!rendererUrl) return false

    const parsedRendererUrl = new URL(rendererUrl)
    return parsedNavigationUrl.origin === parsedRendererUrl.origin
  } catch {
    return false
  }
}

function createWindow(projectId?: string): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: APP_DISPLAY_NAME,
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const } : {}),
    ...(process.platform === 'linux' || process.platform === 'win32' ? { autoHideMenuBar: true } : {}),
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  windows.add(win)

  win.on('ready-to-show', () => {
    win.show()
  })

  win.on('close', (e) => {
    const activeCount = getActiveSessionCountForWindow(win)
    const totalCount = getSessionCountForWindow(win)
    if (activeCount > 0) {
      e.preventDefault()
      void getNativeTranslator()
        .then((tr) => {
          const message = activeCount === 1
            ? tr('closeDialog.processOne')
            : tr('closeDialog.processMany', { count: activeCount })
          const terminate = totalCount === 1
            ? tr('closeDialog.terminateOne')
            : tr('closeDialog.terminateMany', { count: totalCount })
          return dialog.showMessageBox(win, {
            type: 'warning',
            buttons: [tr('closeDialog.closeAnyway'), tr('closeDialog.cancel')],
            defaultId: 1,
            cancelId: 1,
            title: tr('closeDialog.title'),
            message: `${message}\n\n${terminate}`
          })
        })
        .then(({ response }) => {
          if (response === 0) {
            killSessionsForWindow(win)
            win.destroy()
          }
        })
    }
  })

  win.on('closed', () => {
    killSessionsForWindow(win)
    stopVncSessionsForWindow(win)
    forgetWindowBadge(win)
    windows.delete(win)
  })

  win.webContents.on('will-navigate', (event, navigationUrl) => {
    if (isAllowedRendererNavigation(navigationUrl)) return

    event.preventDefault()
    void openSafeExternalUrl(navigationUrl)
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    void openSafeExternalUrl(url)
    return { action: 'deny' }
  })

  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}${query}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), {
      search: query ? query.slice(1) : undefined
    })
  }
}

async function buildMenu(): Promise<void> {
  const tr = await getNativeTranslator()
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: APP_DISPLAY_NAME,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: tr('menu.file'),
      submenu: [
        {
          label: tr('menu.newWindow'),
          accelerator: 'CmdOrCtrl+N',
          click: (): void => createWindow()
        },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: tr('menu.edit'),
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: tr('menu.window'),
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin'
          ? [{ type: 'separator' as const }, { role: 'front' as const }]
          : [{ role: 'close' as const }])
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  app.setName(APP_DISPLAY_NAME)
  electronApp.setAppUserModelId('com.terminallyskill.app')

  if (process.platform === 'linux') {
    // setDesktopName is Linux-only and missing from Electron's type definitions
    ;(app as typeof app & { setDesktopName: (name: string) => void }).setDesktopName(LINUX_DESKTOP_FILE)
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Bootstrap: check if a custom data directory is configured
  try {
    const bootstrapSettingsPath = join(getUserDataDir(), 'data', 'settings.json')
    if (existsSync(bootstrapSettingsPath)) {
      const raw = JSON.parse(readFileSync(bootstrapSettingsPath, 'utf-8'))
      if (raw.customDataDirectory && typeof raw.customDataDirectory === 'string' && raw.customDataDirectory.trim()) {
        const customDir = resolve(raw.customDataDirectory.trim())
        const homeDir = process.env.HOME || process.env.USERPROFILE || ''
        // Validate: must be within user's home directory and not a system path
        const isSafe = homeDir && customDir.startsWith(homeDir) && !customDir.includes('/System') && !customDir.includes('/Library/Preferences')
        if (isSafe && existsSync(customDir)) {
          setCustomDataDir(customDir)
          console.log(`[terminallyskill] Using custom data directory: ${customDir}`)
        } else {
          console.warn(`[terminallyskill] Custom data directory not found, using default: ${customDir}`)
        }
      }
    }
  } catch (error) {
    console.error('[terminallyskill] Failed to read bootstrap settings:', error)
  }

  // Pre-warm the terminal PATH cache so first terminal opens instantly
  void initTerminalPath().catch((error) => {
    console.error('[terminallyskill] Failed to pre-warm terminal PATH cache:', error)
  })

  // Anything Electron's network stack sends (updater, renderer) is listed on the Privacy tab.
  // Only the host is kept. Node-level fetches record themselves where they are made.
  session.defaultSession.webRequest.onCompleted({ urls: ['http://*/*', 'https://*/*'] }, (details) => {
    // The dev server and other pages on this computer are not outbound traffic.
    if (details.webContents && describeOutboundUrl(details.url)?.local) return
    recordOutboundRequest(details.url, details.webContents ? 'other' : 'update', details.statusCode)
  })

  // Register IPC handlers once globally (handlers derive window from event.sender)
  registerIpcHandlers()

  ipcMain.handle(IPC_CHANNELS.APP_NEW_WINDOW, () => {
    createWindow()
  })

  ipcMain.handle(IPC_CHANNELS.APP_NEW_WINDOW_PROJECT, (_event, projectId: string) => {
    createWindow(projectId)
  })

  startScheduler()
  void buildMenu()
  onUiLocaleChange(() => void buildMenu())
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  stopScheduler()
  killAllTerminals()
  stopAllVncSessions()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
