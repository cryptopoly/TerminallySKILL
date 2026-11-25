import type { CommandDefinition, CommandOption, PositionalArgument } from '../../../shared/command-schema'
import { isPowerShell, powerShellSingleQuote } from '../../../shared/local-shell'

function shellEscape(value: string, powerShell = false): string {
  if (value === '') return "''"
  if (powerShell) {
    // @ and , are operators, and an unquoted -name.part argument is split at the dot
    if (/^[a-zA-Z0-9._\-\/=:]+$/.test(value) && !/^-[^-].*\./.test(value)) return value
    return powerShellSingleQuote(value)
  }
  if (!/[^a-zA-Z0-9._\-\/=@:,]/.test(value)) return value
  return `'${value.replace(/'/g, "'\\''")}'`
}

function formatFlagValue(flag: string, value: string, sep: 'space' | 'equals' | 'none', powerShell: boolean): string {
  // PowerShell reads --flag='value' as one argument, but -Dname.part=value as two
  if (powerShell && sep !== 'space') return shellEscape(`${flag}${sep === 'equals' ? '=' : ''}${value}`, true)
  const escaped = shellEscape(value, powerShell)
  switch (sep) {
    case 'space':
      return `${flag} ${escaped}`
    case 'equals':
      return `${flag}=${escaped}`
    case 'none':
      return `${flag}${escaped}`
  }
}

function sortedOptions(options?: CommandOption[]): CommandOption[] {
  if (!options) return []
  return [...options].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
}

function sortedPositionals(args?: PositionalArgument[]): PositionalArgument[] {
  if (!args) return []
  return [...args].sort((a, b) => a.position - b.position)
}

/** `shell` is the shell the command will be typed into: values are quoted for PowerShell or for sh. */
export function serializeCommand(
  definition: CommandDefinition,
  formState: Record<string, unknown>,
  shell?: string | null
): string {
  const powerShell = isPowerShell(shell)
  const parts: string[] = [definition.executable]

  if (definition.subcommands) {
    parts.push(...definition.subcommands)
  }

  for (const option of sortedOptions(definition.options)) {
    const value = formState[option.id]

    if (value === undefined || value === null || value === '' || value === false) continue
    if (option.type === 'enum' && value === option.defaultValue) continue

    const flag = option.long ?? option.short
    if (!flag) continue

    switch (option.type) {
      case 'boolean':
        parts.push(flag)
        break
      case 'string':
      case 'number':
      case 'file-path':
      case 'directory-path':
        parts.push(formatFlagValue(flag, String(value), option.separator ?? 'space', powerShell))
        break
      case 'enum':
        parts.push(formatFlagValue(flag, String(value), option.separator ?? 'space', powerShell))
        break
      case 'repeatable':
        for (const entry of value as string[]) {
          if (entry) parts.push(formatFlagValue(flag, entry, option.separator ?? 'space', powerShell))
        }
        break
      case 'multi-select':
        for (const selected of value as string[]) {
          parts.push(formatFlagValue(flag, selected, option.separator ?? 'space', powerShell))
        }
        break
      case 'key-value':
        for (const kv of value as { key: string; value: string }[]) {
          if (kv.key) {
            parts.push(
              formatFlagValue(flag, `${kv.key}=${kv.value}`, option.separator ?? 'space', powerShell)
            )
          }
        }
        break
    }
  }

  for (const posArg of sortedPositionals(definition.positionalArgs)) {
    const value = formState[posArg.id]
    if (!value) continue
    if (posArg.variadic && Array.isArray(value)) {
      parts.push(...(value as string[]).filter(Boolean).map((entry) => shellEscape(entry, powerShell)))
    } else if (typeof value === 'string' && value) {
      parts.push(shellEscape(value, powerShell))
    }
  }

  return parts.join(' ')
}
