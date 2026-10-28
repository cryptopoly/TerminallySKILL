import { existsSync } from 'fs'
import { copyFile, mkdir, readdir, writeFile } from 'fs/promises'
import { app } from 'electron'
import os from 'os'
import { isAbsolute, join, relative, resolve } from 'path'
import type { BackupLocationSuggestion, BackupRunResult } from '../shared/backup-schema'
import { getDataDir, getLogsDir, getUserDataDir } from './user-data-path'
import { translateNativeSync } from './native-i18n'

const ICLOUD_BACKUP_FOLDER_NAME = 'TerminallySKILL Backups'
const EXCLUDED_DATA_FILES = new Set(['secrets.json'])

function normalizePath(path: string): string {
  return resolve(path)
}

function isPathInside(parent: string, child: string): boolean {
  const rel = relative(normalizePath(parent), normalizePath(child))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

function formatBackupTimestamp(date: Date): string {
  return date.toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z')
}

async function copyDirectoryRecursive(
  sourceDir: string,
  targetDir: string,
  shouldSkip: (relativePath: string) => boolean,
  relativePrefix = ''
): Promise<void> {
  await mkdir(targetDir, { recursive: true })

  const entries = await readdir(sourceDir, { withFileTypes: true })
  for (const entry of entries) {
    const relativePath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name
    if (shouldSkip(relativePath)) {
      continue
    }

    const sourcePath = join(sourceDir, entry.name)
    const targetPath = join(targetDir, entry.name)

    if (entry.isDirectory()) {
      await copyDirectoryRecursive(sourcePath, targetPath, shouldSkip, relativePath)
      continue
    }

    if (entry.isFile()) {
      await mkdir(join(targetPath, '..'), { recursive: true })
      await copyFile(sourcePath, targetPath)
    }
  }
}

export function getDefaultICloudBackupDirectory(): BackupLocationSuggestion {
  if (process.platform !== 'darwin') {
    return {
      available: false,
      path: null,
      reason: 'iCloud Drive backup is currently available on macOS only.'
    }
  }

  const iCloudRoot = join(
    os.homedir(),
    'Library',
    'Mobile Documents',
    'com~apple~CloudDocs'
  )

  if (!existsSync(iCloudRoot)) {
    return {
      available: false,
      path: null,
      reason: 'iCloud Drive does not appear to be enabled on this Mac yet.'
    }
  }

  return {
    available: true,
    path: join(iCloudRoot, ICLOUD_BACKUP_FOLDER_NAME)
  }
}

export async function createAppDataBackup(targetDirectory: string): Promise<BackupRunResult> {
  const trimmedTarget = targetDirectory.trim()
  if (!trimmedTarget) {
    return {
      success: false,
      error: translateNativeSync('errors.backupChooseFolder')
    }
  }

  const normalizedTarget = normalizePath(trimmedTarget)
  const userDataDir = normalizePath(getUserDataDir())

  if (isPathInside(userDataDir, normalizedTarget)) {
    return {
      success: false,
      error: translateNativeSync('errors.backupFolderInsideAppData')
    }
  }

  const createdAt = new Date()
  const stamp = formatBackupTimestamp(createdAt)
  const backupDir = join(normalizedTarget, `TerminallySKILL-backup-${stamp}`)

  await mkdir(backupDir, { recursive: true })

  const dataDir = getDataDir()
  if (existsSync(dataDir)) {
    await copyDirectoryRecursive(
      dataDir,
      join(backupDir, 'data'),
      (relativePath) => EXCLUDED_DATA_FILES.has(relativePath)
    )
  }

  const logsDir = getLogsDir()
  if (existsSync(logsDir)) {
    await copyDirectoryRecursive(logsDir, join(backupDir, 'logs'), () => false)
  }

  const manifest = {
    app: 'TerminallySKILL',
    version: app.getVersion(),
    createdAt: createdAt.toISOString(),
    sourceUserDataDir: userDataDir,
    included: ['data', ...(existsSync(logsDir) ? ['logs'] : [])],
    excluded: ['data/secrets.json']
  }

  await writeFile(join(backupDir, 'backup-manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')

  return {
    success: true,
    createdAt: createdAt.toISOString(),
    backupPath: backupDir,
    message: 'Backup created successfully.'
  }
}
