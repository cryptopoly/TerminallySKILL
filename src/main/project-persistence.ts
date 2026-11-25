import type {
  Project,
  ProjectLogPreference,
  ProjectsData,
  ProjectStarterPack,
  ProjectWorkspaceLayout,
  ProjectWorkspaceTarget
} from '../shared/project-schema'
import {
  createSSHWorkspaceTarget,
  createLocalWorkspaceTarget,
  DEFAULT_PROJECT_WORKSPACE_LAYOUT,
  PROJECT_COLORS
} from '../shared/project-schema'

type PartialProject = Partial<Project> & Pick<Project, 'id' | 'name' | 'workingDirectory'>

function backfillStarterPack(
  raw: Partial<ProjectStarterPack> | null | undefined,
  fallbackTimestamp: string
): ProjectStarterPack | null {
  if (!raw || typeof raw !== 'object') return null

  return {
    detections: raw.detections ?? [],
    categoryIds: raw.categoryIds ?? [],
    scriptIds: raw.scriptIds ?? [],
    snippetIds: raw.snippetIds ?? [],
    appliedAt: raw.appliedAt ?? fallbackTimestamp,
    dismissedAt: raw.dismissedAt ?? null
  }
}

function backfillWorkspaceTarget(
  raw: Partial<ProjectWorkspaceTarget> | undefined,
  workingDirectory: string
): ProjectWorkspaceTarget {
  if (raw?.type === 'local' && typeof raw.cwd === 'string' && raw.cwd.trim()) {
    return createLocalWorkspaceTarget(raw.cwd)
  }

  if (raw?.type === 'ssh' && typeof raw.host === 'string' && raw.host.trim()) {
    return createSSHWorkspaceTarget(
      raw.host,
      typeof raw.user === 'string' ? raw.user : '',
      typeof raw.cwd === 'string' && raw.cwd.trim() ? raw.cwd : workingDirectory,
      typeof raw.port === 'number' && Number.isFinite(raw.port) ? raw.port : null,
      typeof raw.identityFile === 'string' && raw.identityFile.trim() ? raw.identityFile : null,
      typeof raw.label === 'string' && raw.label.trim() ? raw.label : null
    )
  }

  return createLocalWorkspaceTarget(workingDirectory)
}

/** A saved divider position (percent), or the default when it is missing or out of range */
function dividerPercent(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 100 ? value : fallback
}

function backfillWorkspaceLayout(
  raw: Partial<ProjectWorkspaceLayout> | undefined
): ProjectWorkspaceLayout {
  return {
    sidebarSize:
      typeof raw?.sidebarSize === 'number'
        ? raw.sidebarSize
        : DEFAULT_PROJECT_WORKSPACE_LAYOUT.sidebarSize,
    terminalSize:
      typeof raw?.terminalSize === 'number'
        ? raw.terminalSize
        : DEFAULT_PROJECT_WORKSPACE_LAYOUT.terminalSize,
    terminalVisible:
      typeof raw?.terminalVisible === 'boolean'
        ? raw.terminalVisible
        : DEFAULT_PROJECT_WORKSPACE_LAYOUT.terminalVisible,
    preferredSplitDirection:
      raw?.preferredSplitDirection === 'horizontal' || raw?.preferredSplitDirection === 'vertical'
        ? raw.preferredSplitDirection
        : DEFAULT_PROJECT_WORKSPACE_LAYOUT.preferredSplitDirection,
    quadLayout: raw?.quadLayout === true,
    terminalMaximised: raw?.terminalMaximised === true,
    splitRatio: dividerPercent(raw?.splitRatio, DEFAULT_PROJECT_WORKSPACE_LAYOUT.splitRatio),
    quadRatios: {
      column: dividerPercent(raw?.quadRatios?.column, DEFAULT_PROJECT_WORKSPACE_LAYOUT.quadRatios.column),
      row: dividerPercent(raw?.quadRatios?.row, DEFAULT_PROJECT_WORKSPACE_LAYOUT.quadRatios.row)
    },
    sidebarTab:
      raw?.sidebarTab === 'commands' ||
      raw?.sidebarTab === 'scripts' ||
      raw?.sidebarTab === 'snippets' ||
      raw?.sidebarTab === 'files' ||
      raw?.sidebarTab === 'logs'
        ? raw.sidebarTab
        : DEFAULT_PROJECT_WORKSPACE_LAYOUT.sidebarTab,
    openFilePaths:
      Array.isArray(raw?.openFilePaths)
        ? raw.openFilePaths.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : DEFAULT_PROJECT_WORKSPACE_LAYOUT.openFilePaths,
    activeFilePath:
      typeof raw?.activeFilePath === 'string' && raw.activeFilePath.trim().length > 0
        ? raw.activeFilePath
        : DEFAULT_PROJECT_WORKSPACE_LAYOUT.activeFilePath
  }
}

function backfillLogPreference(raw: unknown): ProjectLogPreference {
  return raw === 'enabled' || raw === 'disabled' ? raw : 'inherit'
}

export function backfillProject(
  raw: PartialProject,
  index: number,
  fallbackTimestamp = new Date().toISOString()
): Project {
  return {
    id: raw.id,
    name: raw.name,
    workingDirectory: raw.workingDirectory,
    workspaceTarget: backfillWorkspaceTarget(raw.workspaceTarget, raw.workingDirectory),
    workspaceLayout: backfillWorkspaceLayout(raw.workspaceLayout),
    favoriteCommandIds: raw.favoriteCommandIds ?? [],
    recentCommands: raw.recentCommands ?? [],
    enabledCategories: raw.enabledCategories ?? [],
    enabledScriptIds: raw.enabledScriptIds ?? [],
    enabledSnippetIds: raw.enabledSnippetIds ?? [],
    envVars: raw.envVars ?? [],
    logPreference: backfillLogPreference(raw.logPreference),
    starterPack: backfillStarterPack(raw.starterPack, fallbackTimestamp),
    color: raw.color ?? PROJECT_COLORS[index % PROJECT_COLORS.length],
    createdAt: raw.createdAt ?? fallbackTimestamp,
    lastOpenedAt: raw.lastOpenedAt ?? raw.createdAt ?? fallbackTimestamp
  }
}

export function backfillProjectsData(
  raw: Partial<ProjectsData>,
  fallbackTimestamp = new Date().toISOString()
): ProjectsData {
  const projects = (raw.projects ?? []).map((project, index) =>
    backfillProject(project as PartialProject, index, fallbackTimestamp)
  )

  return {
    projects,
    activeProjectId: raw.activeProjectId ?? null
  }
}
