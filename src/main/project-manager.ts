import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { writeJsonAtomic } from './atomic-write'
import type { Project, ProjectsData } from '../shared/project-schema'
import {
  createLocalWorkspaceTarget,
  DEFAULT_PROJECT_WORKSPACE_LAYOUT,
  PROJECT_COLORS,
  resolveProjectWorkingDirectory,
  type ProjectLogPreference,
  type ProjectWorkspaceTarget
} from '../shared/project-schema'
import { EMPTY_STARTER_PACK_PREVIEW, type StarterPackPreview } from '../shared/starter-pack-schema'
import { detectStarterPack } from './starter-pack-detector'
import { createStarterScripts } from './script-manager'
import { createStarterSnippets } from './snippet-manager'
import { recordRecentCommand, toggleFavoriteCommandIds } from './project-behavior'
import { backfillProjectsData } from './project-persistence'
import { getDataDir } from './user-data-path'

let cached: ProjectsData | null = null

function getProjectsFile(): string {
  return join(getDataDir(), 'projects.json')
}

async function ensureDataDir(): Promise<void> {
  await mkdir(getDataDir(), { recursive: true })
}

async function load(): Promise<ProjectsData> {
  if (cached) return cached
  try {
    const raw = await readFile(getProjectsFile(), 'utf-8')
    cached = backfillProjectsData(JSON.parse(raw) as Partial<ProjectsData>)
    return cached
  } catch {
    cached = { projects: [], activeProjectId: null }
    return cached
  }
}

async function save(data: ProjectsData): Promise<void> {
  await ensureDataDir()
  cached = data
  await writeJsonAtomic(getProjectsFile(), data)
}

export async function getAllProjects(): Promise<ProjectsData> {
  return load()
}

export async function detectProjectStarterPack(
  workingDirectory: string
): Promise<StarterPackPreview> {
  return detectStarterPack(workingDirectory)
}

export async function createProject(
  name: string,
  workingDirectory: string,
  color?: string,
  workspaceTarget?: ProjectWorkspaceTarget,
  logPreference: ProjectLogPreference = 'inherit',
  skipStarterPack = false
): Promise<Project> {
  const data = await load()
  const nextWorkspaceTarget = workspaceTarget ?? createLocalWorkspaceTarget(workingDirectory)
  const resolvedWorkingDirectory = resolveProjectWorkingDirectory({
    workingDirectory,
    workspaceTarget: nextWorkspaceTarget
  })
  const starterPack =
    skipStarterPack
      ? EMPTY_STARTER_PACK_PREVIEW
      : nextWorkspaceTarget.type === 'local'
        ? await detectStarterPack(resolvedWorkingDirectory)
        : EMPTY_STARTER_PACK_PREVIEW
  const now = new Date().toISOString()
  const project: Project = {
    id: randomUUID(),
    name,
    workingDirectory: resolvedWorkingDirectory,
    workspaceTarget: nextWorkspaceTarget,
    workspaceLayout: { ...DEFAULT_PROJECT_WORKSPACE_LAYOUT },
    favoriteCommandIds: [],
    recentCommands: [],
    enabledCategories: [...starterPack.categories],
    enabledScriptIds: [],
    enabledSnippetIds: [],
    envVars: [],
    logPreference,
    starterPack:
      starterPack.detections.length > 0 ||
      starterPack.categories.length > 0 ||
      starterPack.scripts.length > 0 ||
      starterPack.snippets.length > 0
        ? {
            detections: [...starterPack.detections],
            categoryIds: [...starterPack.categories],
            scriptIds: [],
            snippetIds: [],
            appliedAt: now,
            dismissedAt: null
          }
        : null,
    color: color || PROJECT_COLORS[data.projects.length % PROJECT_COLORS.length],
    createdAt: now,
    lastOpenedAt: now
  }

  data.projects.push(project)
  data.activeProjectId = project.id
  await save(data)

  try {
    const starterScripts = await createStarterScripts(project.id, starterPack.scripts)
    const starterSnippets = await createStarterSnippets(project.id, starterPack.snippets)
    project.enabledScriptIds = starterScripts.map((script) => script.id)
    project.enabledSnippetIds = starterSnippets.map((snippet) => snippet.id)
    if (project.starterPack) {
      project.starterPack.scriptIds = [...project.enabledScriptIds]
      project.starterPack.snippetIds = [...project.enabledSnippetIds]
    }
    await save(data)
  } catch (error) {
    console.error('Failed to seed starter packs for project:', error)
    project.enabledScriptIds = []
    project.enabledSnippetIds = []
    if (project.starterPack) {
      project.starterPack.scriptIds = []
      project.starterPack.snippetIds = []
    }
    await save(data)
  }
  return project
}

export async function updateProject(
  id: string,
  updates: Partial<Pick<Project, 'name' | 'workingDirectory' | 'workspaceTarget' | 'workspaceLayout' | 'color' | 'favoriteCommandIds' | 'recentCommands' | 'enabledCategories' | 'enabledScriptIds' | 'enabledSnippetIds' | 'envVars' | 'logPreference' | 'starterPack'>>
): Promise<Project | null> {
  const data = await load()
  const project = data.projects.find((p) => p.id === id)
  if (!project) return null

  const nextWorkspaceTarget =
    updates.workspaceTarget ??
    (updates.workingDirectory && project.workspaceTarget.type === 'local'
      ? createLocalWorkspaceTarget(updates.workingDirectory)
      : project.workspaceTarget)

  const nextWorkingDirectory = updates.workingDirectory
    ? updates.workingDirectory
    : updates.workspaceTarget
      ? resolveProjectWorkingDirectory({
          workingDirectory: project.workingDirectory,
          workspaceTarget: updates.workspaceTarget
        })
      : project.workingDirectory

  const nextWorkspaceLayout = updates.workspaceLayout
    ? {
        ...project.workspaceLayout,
        ...updates.workspaceLayout
      }
    : project.workspaceLayout

  Object.assign(project, updates, {
    workingDirectory: nextWorkingDirectory,
    workspaceTarget: nextWorkspaceTarget,
    workspaceLayout: nextWorkspaceLayout
  })
  await save(data)
  return project
}

export async function deleteProject(id: string): Promise<void> {
  const data = await load()
  data.projects = data.projects.filter((p) => p.id !== id)
  if (data.activeProjectId === id) {
    data.activeProjectId = data.projects[0]?.id ?? null
  }
  await save(data)
}

export async function setActiveProject(id: string): Promise<void> {
  const data = await load()
  const project = data.projects.find((p) => p.id === id)
  if (project) {
    project.lastOpenedAt = new Date().toISOString()
    data.activeProjectId = id
    await save(data)
  }
}

export async function toggleFavoriteCommand(
  projectId: string,
  commandId: string
): Promise<string[]> {
  const data = await load()
  const project = data.projects.find((p) => p.id === projectId)
  if (!project) return []
  project.favoriteCommandIds = toggleFavoriteCommandIds(project.favoriteCommandIds, commandId)
  await save(data)
  return project.favoriteCommandIds
}

export async function addRecentCommand(
  projectId: string,
  commandId: string,
  commandString: string
): Promise<void> {
  const data = await load()
  const project = data.projects.find((p) => p.id === projectId)
  if (!project) return
  project.recentCommands = recordRecentCommand(
    project.recentCommands,
    commandId,
    commandString,
    new Date().toISOString()
  )
  await save(data)
}

export async function listDirectoryContents(
  dirPath: string,
  includeHidden = false
): Promise<{ name: string; isDirectory: boolean; size: number; modified: string }[]> {
  const { readdir, stat } = await import('fs/promises')
  const { join: pathJoin } = await import('path')
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    const results = await Promise.all(
      entries
        .filter((e) => includeHidden || !e.name.startsWith('.'))
        .map(async (e) => {
          try {
            const fullPath = pathJoin(dirPath, e.name)
            const s = await stat(fullPath)
            return {
              name: e.name,
              isDirectory: e.isDirectory(),
              size: s.size,
              modified: s.mtime.toISOString()
            }
          } catch {
            return {
              name: e.name,
              isDirectory: e.isDirectory(),
              size: 0,
              modified: ''
            }
          }
        })
    )
    // Sort: directories first, then alphabetical
    return results.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  } catch {
    return []
  }
}

export async function createEmptyFile(filePath: string): Promise<void> {
  await writeFile(filePath, '', { encoding: 'utf-8', flag: 'wx' })
}

export async function openInSystemExplorer(dirPath: string): Promise<void> {
  const { shell } = await import('electron')
  shell.openPath(dirPath)
}

export async function revealInSystemExplorer(filePath: string): Promise<void> {
  const { shell } = await import('electron')
  shell.showItemInFolder(filePath)
}
