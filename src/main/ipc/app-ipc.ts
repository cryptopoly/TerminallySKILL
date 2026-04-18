import { ipcMain, shell } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { createAppDataBackup, getDefaultICloudBackupDirectory } from '../backup-manager'
import { checkForAppUpdate, downloadAndOpenAppUpdate, getAppVersion } from '../update-manager'
import { getUserDataDir, getCustomDataDir, setCustomDataDir } from '../user-data-path'

export function registerAppIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, async () => {
    return getAppVersion()
  })

  ipcMain.handle(IPC_CHANNELS.APP_CHECK_UPDATES, async () => {
    return checkForAppUpdate()
  })

  ipcMain.handle(IPC_CHANNELS.APP_DOWNLOAD_UPDATE, async () => {
    return downloadAndOpenAppUpdate()
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_DEFAULT_ICLOUD_BACKUP_DIR, async () => {
    return getDefaultICloudBackupDirectory()
  })

  ipcMain.handle(IPC_CHANNELS.APP_CREATE_BACKUP, async (_event, targetDirectory: string) => {
    return createAppDataBackup(targetDirectory)
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_DATA_DIR_INFO, () => {
    const defaultDir = getUserDataDir()
    const customDir = getCustomDataDir()
    return {
      currentPath: customDir ?? defaultDir,
      defaultPath: defaultDir,
      isCustom: customDir !== null
    }
  })

  ipcMain.handle(IPC_CHANNELS.APP_MOVE_DATA_DIR, async (_event, targetDirectory: string) => {
    const { join } = await import('path')
    const { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync } = await import('fs')

    if (!existsSync(targetDirectory)) {
      throw new Error(`Target directory does not exist: ${targetDirectory}`)
    }

    const defaultDir = getUserDataDir()
    const currentDir = getCustomDataDir() ?? defaultDir

    const sourceDataDir = join(currentDir, 'data')
    const sourceLogsDir = join(currentDir, 'logs')
    const targetDataDir = join(targetDirectory, 'data')
    const targetLogsDir = join(targetDirectory, 'logs')

    if (existsSync(sourceDataDir)) {
      mkdirSync(targetDataDir, { recursive: true })
      cpSync(sourceDataDir, targetDataDir, { recursive: true })
    }

    if (existsSync(sourceLogsDir)) {
      mkdirSync(targetLogsDir, { recursive: true })
      cpSync(sourceLogsDir, targetLogsDir, { recursive: true })
    }

    const bootstrapSettingsPath = join(defaultDir, 'data', 'settings.json')
    if (existsSync(bootstrapSettingsPath)) {
      const raw = JSON.parse(readFileSync(bootstrapSettingsPath, 'utf-8'))
      raw.customDataDirectory = targetDirectory
      writeFileSync(bootstrapSettingsPath, JSON.stringify(raw, null, 2), 'utf-8')
    }

    const newSettingsPath = join(targetDataDir, 'settings.json')
    if (existsSync(newSettingsPath)) {
      const raw = JSON.parse(readFileSync(newSettingsPath, 'utf-8'))
      raw.customDataDirectory = targetDirectory
      writeFileSync(newSettingsPath, JSON.stringify(raw, null, 2), 'utf-8')
    }

    setCustomDataDir(targetDirectory)
    return { success: true, path: targetDirectory }
  })

  ipcMain.handle(IPC_CHANNELS.APP_RESET_DATA_DIR, async () => {
    const { join } = await import('path')
    const { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync } = await import('fs')

    const customDir = getCustomDataDir()
    if (!customDir) return { success: true }

    const defaultDir = getUserDataDir()

    const sourceDataDir = join(customDir, 'data')
    const sourceLogsDir = join(customDir, 'logs')
    const targetDataDir = join(defaultDir, 'data')
    const targetLogsDir = join(defaultDir, 'logs')

    if (existsSync(sourceDataDir)) {
      mkdirSync(targetDataDir, { recursive: true })
      cpSync(sourceDataDir, targetDataDir, { recursive: true })
    }

    if (existsSync(sourceLogsDir)) {
      mkdirSync(targetLogsDir, { recursive: true })
      cpSync(sourceLogsDir, targetLogsDir, { recursive: true })
    }

    const settingsPath = join(targetDataDir, 'settings.json')
    if (existsSync(settingsPath)) {
      const raw = JSON.parse(readFileSync(settingsPath, 'utf-8'))
      raw.customDataDirectory = ''
      writeFileSync(settingsPath, JSON.stringify(raw, null, 2), 'utf-8')
    }

    setCustomDataDir(null)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, async (_event, url: string) => {
    if (url.startsWith('https://')) {
      await shell.openExternal(url)
    }
  })
}
