import { resolve, sep } from 'path'
import { resolveProjectWorkingDirectory, type Project } from '../shared/project-schema'
import {
  getApprovedExternalPaths,
  resetApprovedExternalPathsForTests
} from './path-approvals'
import { getAllProjects } from './project-manager'
import { getSettings } from './settings-manager'
import { getCustomDataDir, getDataDir, getLogsDir, getUserDataDir } from './user-data-path'

export const ALL_KNOWN_PATH_ROOT_KINDS = [
  'project-dir',
  'user-data',
  'data-dir',
  'logs-dir',
  'custom-data-root',
  'configured-log-dir',
  'approved-external-file',
  'approved-external-directory'
] as const

export type KnownPathRootKind = typeof ALL_KNOWN_PATH_ROOT_KINDS[number]

export interface KnownPathRoot {
  kind: KnownPathRootKind
  path: string
  label: string
}

export interface ObservedPathAccess {
  path: string
  matchedRoots: KnownPathRoot[]
  withinExpectedRoots: boolean
}

interface ObservePathAccessOptions {
  purpose: string
  expectedKinds: KnownPathRootKind[]
  mode?: 'allow' | 'enforce'
  warnIfOutsideKnownRoots?: boolean
}

const ROOT_CACHE_TTL_MS = 5_000

let cachedRoots: { expiresAt: number; roots: KnownPathRoot[] } | null = null
const warnedUnexpectedPaths = new Set<string>()

function normalizePath(pathValue: string): string {
  return resolve(pathValue)
}

function normalizeRootPath(pathValue: string): string {
  const resolved = normalizePath(pathValue)
  return resolved.length > 1 && resolved.endsWith(sep) ? resolved.slice(0, -1) : resolved
}

function isPathWithinRoot(targetPath: string, rootPath: string): boolean {
  const normalizedTarget = normalizeRootPath(targetPath)
  const normalizedRoot = normalizeRootPath(rootPath)
  return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(`${normalizedRoot}${sep}`)
}

function addRoot(
  roots: KnownPathRoot[],
  seen: Set<string>,
  kind: KnownPathRootKind,
  pathValue: string | null | undefined,
  label: string
): void {
  if (!pathValue?.trim()) return
  const normalizedPath = normalizePath(pathValue.trim())
  const key = `${kind}:${normalizedPath}`
  if (seen.has(key)) return
  seen.add(key)
  roots.push({
    kind,
    path: normalizedPath,
    label
  })
}

function getLocalProjectRoot(project: Project): string | null {
  if (project.workspaceTarget.type !== 'local') return null
  return resolveProjectWorkingDirectory(project)
}

async function getCachedStaticKnownPathRoots(): Promise<KnownPathRoot[]> {
  const now = Date.now()
  if (cachedRoots && cachedRoots.expiresAt > now) {
    return cachedRoots.roots
  }

  const roots: KnownPathRoot[] = []
  const seen = new Set<string>()
  const defaultUserDataDir = getUserDataDir()
  const customDataDir = getCustomDataDir()
  const settings = await getSettings().catch(() => null)
  const projectsData = await getAllProjects().catch(() => ({ projects: [] as Project[] }))

  addRoot(roots, seen, 'user-data', defaultUserDataDir, 'Electron userData')
  addRoot(roots, seen, 'custom-data-root', customDataDir, 'Custom data directory')
  addRoot(roots, seen, 'data-dir', getDataDir(), 'TerminallySKILL data')
  addRoot(roots, seen, 'logs-dir', getLogsDir(), 'TerminallySKILL logs')
  addRoot(
    roots,
    seen,
    'configured-log-dir',
    settings?.logDirectory?.trim() || null,
    'Configured log directory'
  )

  for (const project of projectsData.projects) {
    addRoot(roots, seen, 'project-dir', getLocalProjectRoot(project), `Project ${project.name}`)
  }

  cachedRoots = {
    expiresAt: now + ROOT_CACHE_TTL_MS,
    roots
  }

  return roots
}

export async function getKnownPathRoots(): Promise<KnownPathRoot[]> {
  const roots = [...await getCachedStaticKnownPathRoots()]
  const seen = new Set(roots.map((root) => `${root.kind}:${root.path}`))

  for (const approvedPath of getApprovedExternalPaths()) {
    addRoot(
      roots,
      seen,
      approvedPath.kind === 'file' ? 'approved-external-file' : 'approved-external-directory',
      approvedPath.path,
      approvedPath.kind === 'file' ? 'Approved external file' : 'Approved external directory'
    )
  }

  return roots
}

export async function observePathAccess(
  pathValue: string,
  options: ObservePathAccessOptions
): Promise<ObservedPathAccess> {
  const resolvedPath = normalizePath(pathValue)
  const roots = await getKnownPathRoots()
  const matchedRoots = roots.filter((root) => isPathWithinRoot(resolvedPath, root.path))
  const withinExpectedRoots = matchedRoots.some((root) => options.expectedKinds.includes(root.kind))

  if (!withinExpectedRoots && options.mode === 'enforce') {
    throw new Error(
      `[path-access] ${options.purpose} blocked path outside expected roots: ${resolvedPath}`
    )
  }

  if (!withinExpectedRoots && options.warnIfOutsideKnownRoots) {
    const warnKey = `${options.purpose}:${resolvedPath}`
    if (!warnedUnexpectedPaths.has(warnKey)) {
      warnedUnexpectedPaths.add(warnKey)
      const matched = matchedRoots.length > 0
        ? matchedRoots.map((root) => `${root.kind}:${root.path}`).join(', ')
        : 'none'
      console.warn(
        `[path-access] ${options.purpose} resolved path outside expected roots: ${resolvedPath} (matched: ${matched})`
      )
    }
  }

  return {
    path: resolvedPath,
    matchedRoots,
    withinExpectedRoots
  }
}

export function resetPathAccessCacheForTests(): void {
  cachedRoots = null
  warnedUnexpectedPaths.clear()
  resetApprovedExternalPathsForTests()
}
