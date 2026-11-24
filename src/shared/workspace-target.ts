import {
  isSSHProjectWorkspaceTarget,
  resolveProjectWorkingDirectory,
  type Project,
  type ProjectWorkspaceTarget
} from './project-schema'
import { buildNativeInvocation } from './local-shell'

export interface WorkspaceTerminalLaunchPlan {
  cwd?: string
  projectWorkingDirectory: string | null
  envOverrides?: Record<string, string>
}

/** POSIX quoting for the remote side of an SSH target, which always runs in a POSIX shell. */
function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function buildSSHInvocationArgs(params: {
  workspaceTarget: Extract<ProjectWorkspaceTarget, { type: 'ssh' }>
  remoteCommand?: string | null
  allocateTty?: boolean
  extraOptions?: string[]
}): string[] {
  const { workspaceTarget, remoteCommand, allocateTty = false, extraOptions = [] } = params
  const args = ['ssh']

  if (allocateTty) {
    args.push('-t')
  }

  if (workspaceTarget.port) {
    args.push('-p', String(workspaceTarget.port))
  }

  if (workspaceTarget.identityFile?.trim()) {
    args.push('-i', workspaceTarget.identityFile)
  }

  for (const option of extraOptions) {
    args.push('-o', option)
  }

  const destination = workspaceTarget.user.trim()
    ? `${workspaceTarget.user}@${workspaceTarget.host}`
    : workspaceTarget.host

  args.push(destination)

  if (remoteCommand) {
    args.push(remoteCommand)
  }

  return args
}

function buildRemoteEnvExports(envOverrides?: Record<string, string>): string[] {
  if (!envOverrides) return []

  return Object.entries(envOverrides)
    .filter(([key]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key.trim()))
    .map(([key, value]) => `export ${key}=${shellSingleQuote(value)}`)
}

/** `localShell` is the shell the command is typed into; the `ssh` call is quoted for it (PowerShell or sh). */
export function buildWorkspaceCommandString(
  workspaceTarget: ProjectWorkspaceTarget | null | undefined,
  commandString: string,
  envOverrides?: Record<string, string>,
  localShell?: string | null
): string {
  if (!workspaceTarget || !isSSHProjectWorkspaceTarget(workspaceTarget)) {
    return commandString
  }

  const remoteSegments = [
    ...buildRemoteEnvExports(envOverrides),
    workspaceTarget.cwd.trim() ? `cd ${shellSingleQuote(workspaceTarget.cwd)}` : null,
    commandString
  ].filter((segment): segment is string => Boolean(segment))

  const sshArgs = buildSSHInvocationArgs({
    workspaceTarget,
    remoteCommand: remoteSegments.join(' && ')
  })
  return buildNativeInvocation(sshArgs, localShell)
}

export function buildProjectWorkspaceCommandString(
  project: Pick<Project, 'workspaceTarget'> | null | undefined,
  commandString: string,
  envOverrides?: Record<string, string>,
  localShell?: string | null
): string {
  return buildWorkspaceCommandString(project?.workspaceTarget, commandString, envOverrides, localShell)
}

export function buildWorkspaceTerminalLaunchPlan(
  project: Pick<Project, 'workingDirectory' | 'workspaceTarget'> | null | undefined,
  envOverrides?: Record<string, string>
): WorkspaceTerminalLaunchPlan {
  if (!project) {
    return {
      cwd: undefined,
      projectWorkingDirectory: null,
      envOverrides
    }
  }

  const workingDirectory = resolveProjectWorkingDirectory(project)

  if (isSSHProjectWorkspaceTarget(project.workspaceTarget)) {
    return {
      cwd: undefined,
      projectWorkingDirectory: workingDirectory,
      envOverrides: undefined
    }
  }

  return {
    cwd: workingDirectory,
    projectWorkingDirectory: workingDirectory,
    envOverrides
  }
}

export function buildInteractiveWorkspaceConnectCommand(
  workspaceTarget: ProjectWorkspaceTarget | null | undefined,
  localShell?: string | null
): string | null {
  if (!workspaceTarget || !isSSHProjectWorkspaceTarget(workspaceTarget)) {
    return null
  }

  const remoteCommand = [
    workspaceTarget.cwd.trim() ? `cd ${shellSingleQuote(workspaceTarget.cwd)}` : null,
    'exec "${SHELL:-/bin/sh}" -l'
  ]
    .filter((segment): segment is string => Boolean(segment))
    .join(' && ')

  return buildNativeInvocation(
    buildSSHInvocationArgs({
      workspaceTarget,
      allocateTty: true,
      remoteCommand
    }),
    localShell
  )
}

export function buildWorkspaceTargetTestInvocation(
  workspaceTarget: ProjectWorkspaceTarget | null | undefined
): { command: string; args: string[] } | null {
  if (!workspaceTarget || !isSSHProjectWorkspaceTarget(workspaceTarget)) {
    return null
  }

  return {
    command: 'ssh',
    args: buildSSHInvocationArgs({
      workspaceTarget,
      extraOptions: [
        'BatchMode=yes',
        'ConnectTimeout=5',
        'NumberOfPasswordPrompts=0'
      ],
      remoteCommand: `sh -lc ${shellSingleQuote(
        [
          workspaceTarget.cwd.trim() ? `cd ${shellSingleQuote(workspaceTarget.cwd)}` : null,
          'pwd'
        ]
          .filter((segment): segment is string => Boolean(segment))
          .join(' && ')
      )}`
    }).slice(1)
  }
}
