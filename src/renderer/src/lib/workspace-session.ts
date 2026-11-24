import { isSSHProjectWorkspaceTarget, type Project } from '../../../shared/project-schema'
import {
  buildInteractiveWorkspaceConnectCommand,
  buildProjectWorkspaceCommandString,
  buildWorkspaceTerminalLaunchPlan
} from '../../../shared/workspace-target'
import type { TerminalSessionMode } from '../store/terminal-store'
import { useToastStore } from '../store/toast-store'

/**
 * The shell a new local terminal runs, for building command lines before its session is known.
 * Mirrors getDefaultShell in the main process: PowerShell on Windows, a POSIX shell elsewhere.
 */
export function defaultLocalShell(): string | null {
  return typeof navigator !== 'undefined' && navigator.platform.toLowerCase().startsWith('win')
    ? 'powershell.exe'
    : null
}

/** The shell running in a session, falling back to the platform default */
export async function getSessionShell(sessionId: string): Promise<string | null> {
  const info = await window.electronAPI.getSessionInfo(sessionId).catch(() => null)
  return info?.shell ?? defaultLocalShell()
}

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
  let sessionId: string
  try {
    sessionId = await window.electronAPI.createTerminal(
      resolvedCwd,
      project?.id,
      project?.name,
      // No project means null here, but the IPC contract only accepts a string or undefined.
      resolvedProjectWorkingDirectory ?? undefined,
      launchPlan.envOverrides
    )
  } catch (error) {
    // Every caller (Run Script, New Terminal, snippets, the palette...) gets the same visible error.
    // The error is still thrown so the caller stops.
    useToastStore.getState().showError('terminal:openFailed.message', { reason: terminalOpenFailureReason(error) })
    throw error
  }

  addSession(sessionId, project?.id ?? null, mode)
  return sessionId
}

/** The reason a terminal failed to open, without Electron's "Error invoking remote method" wrapper. */
export function terminalOpenFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/^Error invoking remote method '[^']*':\s*(?:Error:\s*)?/, '').trim() || message
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
  if (!project || !isSSHProjectWorkspaceTarget(project.workspaceTarget)) return null

  const sessionId = await createProjectTerminalSession(project, addSession, undefined, 'ssh-interactive')
  const command = buildInteractiveWorkspaceConnectCommand(project.workspaceTarget, await getSessionShell(sessionId))
  if (command) window.electronAPI.writeToTerminal(sessionId, command + '\n')
  return sessionId
}

export function buildProjectExecutionCommand(
  project: Project | null | undefined,
  commandString: string,
  envOverrides?: Record<string, string>
): string {
  return buildProjectWorkspaceCommandString(project, commandString, envOverrides, defaultLocalShell())
}
