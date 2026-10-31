import type { Project } from '../../../shared/project-schema'
import {
  buildInteractiveWorkspaceConnectCommand,
  buildProjectWorkspaceCommandString,
  buildWorkspaceTerminalLaunchPlan
} from '../../../shared/workspace-target'
import type { TerminalSessionMode } from '../store/terminal-store'

export async function createProjectTerminalSession(
  project: Project | null | undefined,
  addSession: (sessionId: string, projectId: string | null, mode?: TerminalSessionMode) => void,
  envOverrides?: Record<string, string>,
  mode: TerminalSessionMode = 'workspace-shell',
  cwdOverride?: string
): Promise<string> {
  const launchPlan = buildWorkspaceTerminalLaunchPlan(project, envOverrides)
  const resolvedCwd = cwdOverride?.trim() || launchPlan.cwd
  const resolvedProjectWorkingDirectory =
    project?.workspaceTarget.type === 'local' && cwdOverride?.trim()
      ? cwdOverride
      : launchPlan.projectWorkingDirectory
  const sessionId = await window.electronAPI.createTerminal(
    resolvedCwd,
    project?.id,
    project?.name,
    // No project means null here, but the IPC contract only accepts a string or undefined.
    resolvedProjectWorkingDirectory ?? undefined,
    launchPlan.envOverrides
  )

  addSession(sessionId, project?.id ?? null, mode)
  return sessionId
}

export async function ensureProjectExecutionSession(
  project: Project | null | undefined,
  activeSessionId: string | null,
  getSessionMode: (sessionId: string) => TerminalSessionMode | null,
  addSession: (sessionId: string, projectId: string | null, mode?: TerminalSessionMode) => void,
  envOverrides?: Record<string, string>
): Promise<string> {
  if (activeSessionId && getSessionMode(activeSessionId) !== 'ssh-interactive') {
    return activeSessionId
  }

  return createProjectTerminalSession(project, addSession, envOverrides)
}

export async function openInteractiveProjectShell(
  project: Project | null | undefined,
  addSession: (sessionId: string, projectId: string | null, mode?: TerminalSessionMode) => void
): Promise<string | null> {
  const command = buildInteractiveWorkspaceConnectCommand(project?.workspaceTarget)
  if (!command) return null

  const sessionId = await createProjectTerminalSession(project, addSession, undefined, 'ssh-interactive')
  window.electronAPI.writeToTerminal(sessionId, command + '\n')
  return sessionId
}

export function buildProjectExecutionCommand(
  project: Project | null | undefined,
  commandString: string,
  envOverrides?: Record<string, string>
): string {
  return buildProjectWorkspaceCommandString(project, commandString, envOverrides)
}
