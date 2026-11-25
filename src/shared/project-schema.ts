export interface EnvVar {
  key: string
  value: string
  enabled: boolean
}

export type ProjectLogPreference = 'inherit' | 'enabled' | 'disabled'

export type ProjectWorkspaceTargetType = 'local' | 'ssh'
export type ProjectWorkspaceSplitDirection = 'horizontal' | 'vertical'
export type ProjectSidebarTab = 'commands' | 'scripts' | 'snippets' | 'files' | 'logs' | 'search'

export interface LocalProjectWorkspaceTarget {
  type: 'local'
  cwd: string
}

export interface SSHProjectWorkspaceTarget {
  type: 'ssh'
  host: string
  user: string
  port: number | null
  cwd: string
  identityFile: string | null
  label: string | null
  vncPort: number | null
}

export type ProjectWorkspaceTarget = LocalProjectWorkspaceTarget | SSHProjectWorkspaceTarget

export interface ProjectWorkspaceLayout {
  sidebarSize: number
  terminalSize: number
  terminalVisible: boolean
  preferredSplitDirection: ProjectWorkspaceSplitDirection
  /** Terminal shown as a quad split (four terminals in a 2x2 grid). Missing in layouts saved before 0.9.105. */
  quadLayout: boolean
  /** Terminal maximised (fills the window). Saved per project; terminalSize keeps the docked size. Since 0.9.105. */
  terminalMaximised: boolean
  /** Two-pane split divider, percent of the first pane. Since 0.9.105. */
  splitRatio: number
  /** Quad dividers, percent: column = left panes' width, row = top panes' height. Since 0.9.105. */
  quadRatios: { column: number; row: number }
  sidebarTab: ProjectSidebarTab
  openFilePaths: string[]
  activeFilePath: string | null
}

export interface WorkspaceTargetConnectionResult {
  ok: boolean
  message: string
}

export interface ProjectStarterPack {
  /** Human-readable repo signals that were detected during project creation */
  detections: string[]
  /** Command categories auto-enabled by the starter pack */
  categoryIds: string[]
  /** Starter scripts created for the project */
  scriptIds: string[]
  /** Starter snippets created for the project */
  snippetIds: string[]
  /** When the starter pack was applied */
  appliedAt: string
  /** When the starter-pack callout was dismissed, if ever */
  dismissedAt: string | null
}

export interface Project {
  id: string
  name: string
  /** Primary working directory for this project (local path or remote cwd) */
  workingDirectory: string
  /** Explicit workspace target for the project */
  workspaceTarget: ProjectWorkspaceTarget
  /** Saved shell/layout preferences for this project's workspace */
  workspaceLayout: ProjectWorkspaceLayout
  /** IDs of favorite commands pinned to this project */
  favoriteCommandIds: string[]
  /** Recently executed commands for this project */
  recentCommands: RecentCommand[]
  /** Command category slugs enabled for this project (empty = blank canvas) */
  enabledCategories: string[]
  /** Script IDs linked to this project (many-to-many, empty = blank canvas) */
  enabledScriptIds: string[]
  /** Snippet IDs linked to this project */
  enabledSnippetIds: string[]
  /** Per-project environment variables injected into terminal sessions */
  envVars: EnvVar[]
  /** Whether this project inherits, forces, or disables terminal log saving */
  logPreference: ProjectLogPreference
  /** Repo-aware first-run recommendations seeded when the project was created */
  starterPack: ProjectStarterPack | null
  /** Custom color for the project badge */
  color: string
  /** When the project was created */
  createdAt: string
  /** When the project was last opened */
  lastOpenedAt: string
}

export interface RecentCommand {
  commandString: string
  commandId: string
  timestamp: string
}

export interface ProjectsData {
  projects: Project[]
  activeProjectId: string | null
}

export const DEFAULT_PROJECT_WORKSPACE_LAYOUT: ProjectWorkspaceLayout = {
  sidebarSize: 25,
  terminalSize: 35,
  terminalVisible: false,
  preferredSplitDirection: 'vertical',
  quadLayout: false,
  terminalMaximised: false,
  splitRatio: 50,
  quadRatios: { column: 50, row: 50 },
  sidebarTab: 'scripts',
  openFilePaths: [],
  activeFilePath: null
}

export function createLocalWorkspaceTarget(cwd: string): ProjectWorkspaceTarget {
  return {
    type: 'local',
    cwd
  }
}

export function createSSHWorkspaceTarget(
  host: string,
  user: string,
  cwd: string,
  port: number | null = null,
  identityFile: string | null = null,
  label: string | null = null,
  vncPort: number | null = null
): ProjectWorkspaceTarget {
  return {
    type: 'ssh',
    host,
    user,
    port,
    cwd,
    identityFile,
    label,
    vncPort
  }
}

export function isLocalProjectWorkspaceTarget(
  target: ProjectWorkspaceTarget
): target is LocalProjectWorkspaceTarget {
  return target.type === 'local'
}

export function isSSHProjectWorkspaceTarget(
  target: ProjectWorkspaceTarget
): target is SSHProjectWorkspaceTarget {
  return target.type === 'ssh'
}

export function resolveProjectWorkingDirectory(project: Pick<Project, 'workingDirectory' | 'workspaceTarget'>): string {
  if (project.workspaceTarget?.cwd) {
    return project.workspaceTarget.cwd
  }
  return project.workingDirectory
}

/** Finds an existing project on the same machine and folder as `target`. SSH projects match only on the same host, user and port. */
export function findProjectWithSameWorkspace(
  projects: Project[],
  target: ProjectWorkspaceTarget
): Project | undefined {
  const dir = target.cwd.trim().toLowerCase()
  if (!dir) return undefined
  return projects.find((p) => {
    const other = p.workspaceTarget ?? createLocalWorkspaceTarget(p.workingDirectory)
    if (other.type !== target.type) return false
    if (resolveProjectWorkingDirectory(p).trim().toLowerCase() !== dir) return false
    if (isSSHProjectWorkspaceTarget(other) && isSSHProjectWorkspaceTarget(target)) {
      return (
        other.host.trim().toLowerCase() === target.host.trim().toLowerCase() &&
        other.user.trim() === target.user.trim() &&
        (other.port ?? 22) === (target.port ?? 22)
      )
    }
    return true
  })
}

export function getProjectWorkspaceTargetLabel(
  project: Pick<Project, 'workspaceTarget'>
): string {
  return project.workspaceTarget.type === 'local' ? 'Local workspace' : 'SSH workspace'
}

export function getProjectWorkspaceTargetConnectionLabel(
  project: Pick<Project, 'workspaceTarget'>
): string {
  if (project.workspaceTarget.type === 'local') {
    return 'local'
  }

  const authority = project.workspaceTarget.user.trim()
    ? `${project.workspaceTarget.user}@${project.workspaceTarget.host}`
    : project.workspaceTarget.host

  return project.workspaceTarget.port
    ? `${authority}:${project.workspaceTarget.port}`
    : authority
}

export function getProjectWorkspaceTargetDisplayName(
  project: Pick<Project, 'workspaceTarget'>
): string {
  if (project.workspaceTarget.type === 'local') {
    return 'local'
  }

  return project.workspaceTarget.label?.trim() || getProjectWorkspaceTargetConnectionLabel(project)
}

export function getProjectWorkspaceTargetSummary(
  project: Pick<Project, 'workingDirectory' | 'workspaceTarget'>
): string {
  const cwd = resolveProjectWorkingDirectory(project)

  if (project.workspaceTarget.type === 'local') {
    return cwd
  }

  const connection = getProjectWorkspaceTargetConnectionLabel(project)
  const label = project.workspaceTarget.label?.trim()
  return label ? `${label} · ${connection}:${cwd}` : `${connection}:${cwd}`
}

/** Build a flat env Record from a project's envVars (only enabled entries) */
export function buildEnvOverrides(envVars: EnvVar[]): Record<string, string> | undefined {
  const enabled = envVars.filter((v) => v.enabled && v.key.trim())
  if (enabled.length === 0) return undefined
  const result: Record<string, string> = {}
  for (const v of enabled) {
    result[v.key] = v.value
  }
  return result
}

export const PROJECT_COLORS = [
  '#7c3aed', // purple (default)
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
  '#84cc16', // lime
  '#eab308', // yellow
  '#8b5cf6', // violet
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#a855f7', // orchid
  '#d946ef', // fuchsia
  '#fb7185', // rose
  '#f43f5e', // raspberry
  '#c2410c', // copper
  '#65a30d', // olive
  '#0891b2', // cerulean
  '#64748b', // slate
  '#be185d', // deep pink
  '#7e22ce', // deep purple
  '#1d4ed8', // deep blue
  '#0f766e', // deep teal
  '#15803d', // deep green
  '#b45309', // dark amber
  '#9f1239', // crimson
  '#1e3a5f', // navy
  '#4a1942', // plum
  '#134e4a', // dark emerald
  '#7f1d1d', // dark red
  '#1e1b4b', // deep indigo
  '#365314', // dark olive
  '#7c2d12', // burnt orange
  '#831843', // dark rose
  '#164e63', // deep cyan
  '#3730a3', // electric indigo
  '#701a75', // deep fuchsia
  '#78350f', // brown
  '#052e16', // forest
  '#4c0519', // maroon
  '#0c4a6e', // deep sky
  '#422006', // chocolate
  '#1a2e05', // dark lime
]
