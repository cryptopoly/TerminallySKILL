import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { join } from 'path'
import type { SessionLogMeta, LogSearchResult } from '../shared/log-schema'
import { getSettings } from './settings-manager'
import { getAllProjects } from './project-manager'
import { observePathAccess } from './path-access'
import { getLogsDir } from './user-data-path'

export async function resolveLogBaseDir(): Promise<string> {
  const settings = await getSettings()
  return settings.logDirectory?.trim() || getLogsDir()
}

export function sanitizeLogFolderName(projectName: string | null | undefined): string {
  const normalized = (projectName?.trim() || 'No Project')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^\.+|\.+$/g, '')
    .trim()

  return normalized || 'No Project'
}

async function resolveProjectLogName(projectId: string | null): Promise<string | null> {
  if (!projectId) return null
  const { projects } = await getAllProjects()
  return projects.find((project) => project.id === projectId)?.name ?? null
}

export async function getLogDir(
  projectId: string | null,
  projectName?: string | null
): Promise<string> {
  const base = await resolveLogBaseDir()
  const folderName = sanitizeLogFolderName(projectName ?? await resolveProjectLogName(projectId))
  return join(base, folderName)
}

/** Replace colons in ISO timestamps so the filename is safe on all platforms */
export function sanitizeTimestamp(iso: string): string {
  return iso.replace(/:/g, '-').replace(/\.\d+Z$/, '').replace('Z', '')
}

export async function saveSessionLog(params: {
  sessionId: string
  projectId: string | null
  projectName: string | null
  shell: string
  cwd: string
  startedAt: string
  exitCode: number | null
  content: string
}): Promise<SessionLogMeta | null> {
  try {
    const endedAt = new Date().toISOString()
    const logDir = await getLogDir(params.projectId, params.projectName)
    await mkdir(logDir, { recursive: true })

    const safeName = `${params.sessionId}_${sanitizeTimestamp(endedAt)}`
    const logPath = join(logDir, `${safeName}.log`)
    const metaPath = join(logDir, `${safeName}.meta.json`)

    // Write log content first — if this fails, no meta file is written
    await writeFile(logPath, params.content, 'utf-8')

    const lineCount = params.content.split('\n').length
    const sizeBytes = Buffer.byteLength(params.content, 'utf-8')

    const meta: SessionLogMeta = {
      sessionId: params.sessionId,
      projectId: params.projectId,
      projectName: params.projectName,
      logFilePath: logPath,
      shell: params.shell,
      cwd: params.cwd,
      startedAt: params.startedAt,
      endedAt,
      exitCode: params.exitCode,
      lineCount,
      sizeBytes
    }

    await writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8')
    console.log(`[log-manager] Saved session log: ${logPath} (${lineCount} lines)`)
    return meta
  } catch (err) {
    console.error('[log-manager] Failed to save session log:', err)
    return null
  }
}

export async function shouldSaveSessionLog(projectId: string | null): Promise<boolean> {
  const settings = await getSettings()
  if (!projectId) {
    return settings.saveTerminalLogs
  }

  const { projects } = await getAllProjects()
  const project = projects.find((entry) => entry.id === projectId)
  if (!project) {
    return settings.saveTerminalLogs
  }

  if (project.logPreference === 'enabled') return true
  if (project.logPreference === 'disabled') return false
  return settings.saveTerminalLogs
}

async function readLogEntriesFromDir(logDir: string): Promise<SessionLogMeta[]> {
  const files = await readdir(logDir)
  const metaFiles = files.filter((f) => f.endsWith('.meta.json'))
  const entries: SessionLogMeta[] = []

  for (const file of metaFiles) {
    try {
      const raw = await readFile(join(logDir, file), 'utf-8')
      entries.push(JSON.parse(raw) as SessionLogMeta)
    } catch {
      // skip corrupt/unreadable files
    }
  }

  return entries
}

export async function getLogIndex(projectId: string | null): Promise<SessionLogMeta[]> {
  try {
    const baseDir = await resolveLogBaseDir()
    const folders = await readdir(baseDir, { withFileTypes: true })
    const entries: SessionLogMeta[] = []

    for (const folder of folders) {
      if (!folder.isDirectory()) continue
      const folderEntries = await readLogEntriesFromDir(join(baseDir, folder.name))
      entries.push(...folderEntries)
    }

    const filtered = entries.filter((entry) => entry.projectId === projectId)
    filtered.sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    return filtered
  } catch {
    return []
  }
}

export async function getLogsByProject(projectId: string): Promise<SessionLogMeta[]> {
  return getLogIndex(projectId)
}

export async function readLogContent(logFilePath: string): Promise<string> {
  const observed = await observePathAccess(logFilePath, {
    purpose: 'logs:read-content',
    expectedKinds: ['logs-dir', 'configured-log-dir'],
    mode: 'enforce'
  })
  return readFile(observed.path, 'utf-8')
}

export async function searchLogs(
  projectId: string | null,
  query: string
): Promise<LogSearchResult[]> {
  const entries = await getLogIndex(projectId)
  const results: LogSearchResult[] = []
  const lowerQuery = query.toLowerCase()

  for (const entry of entries) {
    try {
      const content = await readFile(entry.logFilePath, 'utf-8')
      const lines = content.split('\n')
      const matchLines = lines
        .filter((line) => line.toLowerCase().includes(lowerQuery))
        .slice(0, 10) // Cap at 10 matching lines per file

      if (matchLines.length > 0) {
        results.push({ ...entry, matchLines })
      }
    } catch {
      // skip unreadable logs
    }
  }

  return results
}

export async function deleteLog(logFilePath: string): Promise<void> {
  const observed = await observePathAccess(logFilePath, {
    purpose: 'logs:delete',
    expectedKinds: ['logs-dir', 'configured-log-dir'],
    mode: 'enforce'
  })

  try {
    await unlink(observed.path)
  } catch {
    // ignore
  }
  // Delete companion .meta.json
  const metaPath = observed.path.replace(/\.log$/, '.meta.json')
  try {
    await unlink(metaPath)
  } catch {
    // ignore
  }
}

/** Returns the resolved log directory path for the given project (for display in UI) */
export async function getLogBasePath(projectId: string | null): Promise<string> {
  const projectName = await resolveProjectLogName(projectId)
  const logDir = await getLogDir(projectId, projectName)
  await mkdir(logDir, { recursive: true })
  return logDir
}
