import type { CommandDefinition } from '../../../shared/command-schema'

export type TerminalPromotionTarget = 'script' | 'snippet' | 'command'

function normalizeCommandString(commandString: string): string {
  return commandString.trim().replace(/\s+/g, ' ')
}

function titleCaseToken(token: string): string {
  return token
    .replace(/['"`]/g, '')
    .replace(/[_:/.-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function extractPrimaryExecutable(commandString: string): string | null {
  const trimmed = commandString.trim()
  if (!trimmed) return null

  let token = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let escaping = false
  let started = false

  for (let index = 0; index < trimmed.length; index += 1) {
    const character = trimmed[index]

    if (escaping) {
      token += character
      escaping = false
      started = true
      continue
    }

    if (!inSingleQuote && character === '\\') {
      escaping = true
      continue
    }

    if (!inDoubleQuote && character === '\'') {
      inSingleQuote = !inSingleQuote
      started = true
      continue
    }

    if (!inSingleQuote && character === '"') {
      inDoubleQuote = !inDoubleQuote
      started = true
      continue
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (/\s/.test(character)) {
        if (started) break
        continue
      }

      if ('|&;<>'.includes(character)) {
        break
      }
    }

    token += character
    started = true
  }

  return token.trim() || null
}

export function buildPromotionDefaultName(
  commandString: string,
  target: TerminalPromotionTarget
): string {
  const normalized = normalizeCommandString(commandString)
  if (!normalized) {
    return target === 'command' ? 'Terminal Command' : 'Terminal Workflow'
  }

  const title = normalized
    .split(/\s+/)
    .slice(0, 4)
    .map((token) => titleCaseToken(token))
    .filter(Boolean)
    .join(' ')

  if (target === 'command') {
    return extractPrimaryExecutable(commandString) ?? title ?? 'Terminal Command'
  }

  return title || normalized.slice(0, 32)
}

export function buildPromotedCommandDefinition(
  executable: string,
  commandString: string
): CommandDefinition {
  return {
    id: `manual-${executable}`,
    name: executable,
    executable,
    description: `Promoted from terminal: ${normalizeCommandString(commandString)}`,
    category: executable,
    source: 'manual',
    installed: true,
    enriched: false
  }
}

export function buildSavedCommandDefinition(
  command: CommandDefinition,
  commandString: string,
  presetValues: Record<string, unknown>,
  existingId?: string
): CommandDefinition {
  const normalizedCommand = normalizeCommandString(commandString)
  const normalizedExecutable = command.executable.trim().toLowerCase()
  const normalizedSubcommandChain = command.subcommands?.map((part) => part.trim().toLowerCase()) ?? []
  const preservedTags = (command.tags ?? []).filter((tag) => tag !== 'cli-root')
  const tags = [...new Set([...preservedTags, 'saved-command'])]

  return {
    ...command,
    id: existingId ?? `saved-${command.executable}-${Date.now()}`,
    name: normalizedCommand,
    description: `Saved preset for ${[normalizedExecutable, ...normalizedSubcommandChain].join(' ')}`.trim(),
    source: 'manual',
    installed: true,
    enriched: true,
    tags,
    presetValues: JSON.parse(JSON.stringify(presetValues)) as Record<string, unknown>
  }
}
