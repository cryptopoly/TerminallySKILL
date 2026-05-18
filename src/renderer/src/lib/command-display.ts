import type { CommandDefinition } from '../../../shared/command-schema'
import { i18n } from '../i18n'

/**
 * Parse a shell individually-quoted argument string back into plain tokens.
 * e.g. `'ssh' '-t' '-i' '~/.ssh/id_ed25519' 'root@host'` → ['ssh', '-t', '-i', '~/.ssh/id_ed25519', 'root@host']
 */
function parseShellQuotedArgs(raw: string): string[] | null {
  if (!raw.startsWith("'")) return null
  const args: string[] = []
  let i = 0
  while (i < raw.length) {
    while (i < raw.length && raw[i] === ' ') i++
    if (i >= raw.length) break
    let arg = ''
    while (i < raw.length) {
      if (raw[i] === "'") {
        i++ // skip opening quote
        while (i < raw.length && raw[i] !== "'") arg += raw[i++]
        i++ // skip closing quote
      } else if (raw[i] === '\\' && i + 1 < raw.length) {
        arg += raw[i + 1]; i += 2
      } else if (raw[i] === ' ') {
        break
      } else {
        arg += raw[i++]
      }
    }
    args.push(arg)
  }
  return args.length > 0 ? args : null
}

/**
 * Convert a raw shell command string (potentially in individually-quoted-arg format)
 * into a clean, human-readable form for display in the UI.
 *
 * 'ssh' '-t' '-i' '~/.ssh/id_ed25519' 'root@host' 'exec ...'
 *   → ssh -t -i ~/.ssh/id_ed25519 root@host
 */
export function formatCommandForDisplay(raw: string): string {
  const args = parseShellQuotedArgs(raw)
  if (!args) return raw

  if (args[0] === 'ssh') {
    // Drop the trailing remote-shell invocation arg (exec "${SHELL:-/bin/sh}" etc.)
    const trimmed = args.filter((a, idx) => {
      if (idx === 0) return true
      if (idx === args.length - 1 && (a.includes('exec ') || a.includes('SHELL') || a.includes('/bin/sh') || a.includes('/bin/bash'))) return false
      return true
    })
    return trimmed.join(' ')
  }

  return args.join(' ')
}

/** Returns true if the raw command string is an SSH session invocation. */
export function isSSHSessionCommand(raw: string): boolean {
  if (!raw) return false
  const args = parseShellQuotedArgs(raw)
  if (args) return args[0] === 'ssh'
  return /^ssh\s/.test(raw.trimStart())
}

/**
 * Extract the user@host from an SSH command string.
 * Returns e.g. "root@207.180.225.21" or null if not detectable.
 */
export function getSSHHost(raw: string): string | null {
  const args = parseShellQuotedArgs(raw) ?? raw.split(/\s+/)
  if (args[0] !== 'ssh') return null
  const flagsWithValues = new Set(['-i', '-p', '-l', '-o', '-e', '-b', '-c', '-D', '-E', '-F', '-I', '-J', '-L', '-m', '-O', '-Q', '-R', '-S', '-W', '-w'])
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('-')) {
      if (flagsWithValues.has(args[i])) i++ // skip flag value
      continue
    }
    // First non-flag arg is the host (or user@host)
    // Skip if it looks like the remote shell invocation
    if (args[i].includes('exec ') || args[i].includes('SHELL') || args[i].includes('/bin/')) continue
    return args[i]
  }
  return null
}

function isCommandTreeRoot(command: CommandDefinition): boolean {
  return (
    command.tags?.includes('cli-root') === true ||
    ((!command.subcommands || command.subcommands.length === 0) &&
      command.name.trim().toLowerCase() === command.executable.trim().toLowerCase())
  )
}

function isPlaceholderRootDescription(description: string | undefined): boolean {
  const normalized = description?.trim().toLowerCase()
  return (
    !normalized ||
    normalized === 'no description available' ||
    normalized === 'example usage:' ||
    normalized === 'example usage'
  )
}

export function getCommandDisplayDescription(command: CommandDefinition): string {
  if (isCommandTreeRoot(command) && isPlaceholderRootDescription(command.description)) {
    return i18n.t('descriptions.commandTreeRoot', {
      ns: 'commands',
      executable: command.executable,
      defaultValue: `${command.executable} Command Tree Root`
    })
  }

  if (command.description === 'Click "Generate Command Tree from --help" to populate options') {
    return i18n.t('descriptions.generateCommandTree', {
      ns: 'commands',
      defaultValue: command.description
    })
  }

  return i18n.t(`definitions.${command.id}.description`, {
    ns: 'commands',
    defaultValue: command.description
  })
}

export function getCommandDisplayName(command: CommandDefinition): string {
  return i18n.t(`definitions.${command.id}.name`, {
    ns: 'commands',
    defaultValue: command.name
  })
}

export function getCommandSearchText(command: CommandDefinition): string {
  return [
    command.name,
    command.description,
    getCommandDisplayName(command),
    getCommandDisplayDescription(command),
    command.executable,
    command.category,
    ...(command.tags ?? []),
    ...(command.subcommands ?? [])
  ]
    .filter(Boolean)
    .join(' ')
}
