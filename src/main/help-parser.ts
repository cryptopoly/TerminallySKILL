import { execFile } from 'child_process'
import { basename } from 'path'
import { getShellPath, findCommand } from './command-detector'
import type { CommandOption, ParsedSubcommand, ParsedHelpResult, PositionalArgument } from '../shared/command-schema'

const TIMEOUT_MS = 8000
const MAX_SUBCOMMAND_DEPTH = 2

/** Options to skip — these are universal and not useful to show */
const SKIP_OPTIONS = new Set([
  '-h', '--help', '-V', '--version', '-v', '--version'
])

/** Cached resolved PATH so we don't re-resolve every call */
let cachedPath: string | null = null

async function getResolvedPath(): Promise<string> {
  if (!cachedPath) {
    cachedPath = await getShellPath()
  }
  return cachedPath
}

/**
 * Run an executable with args.
 * Uses execFile (no shell) to avoid login-message pollution.
 */
function runCommand(
  fullPath: string,
  args: string[],
  envPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(fullPath, args, {
      timeout: TIMEOUT_MS,
      maxBuffer: 1024 * 512,
      env: { ...process.env, PATH: envPath }
    }, (error, stdout, stderr) => {
      // Many commands print help to stderr, some to stdout
      const output = (stdout || '') + '\n' + (stderr || '')
      if (output.trim().length > 0) {
        resolve(output)
      } else if (error) {
        reject(error)
      } else {
        resolve('')
      }
    })
  })
}

export function parseLineCommandList(helpText: string): Array<{ name: string; description: string }> {
  return helpText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[a-zA-Z0-9:_-]+$/.test(line))
    .filter((line) => !line.startsWith('-'))
    .filter((line) => line !== 'help')
    .map((line) => ({ name: line, description: '' }))
}

function parseIndentedNameDescriptionList(helpText: string): Array<{ name: string; description: string }> {
  return helpText
    .split('\n')
    .map((line) => line.match(/^\s+([a-zA-Z0-9:_-]+)\s{2,}(.+)$/))
    .flatMap((match) => {
      if (!match) return []
      const [, name, description] = match
      if (name.toLowerCase() === 'usage') return []
      return [{ name, description: description.trim() }]
    })
}

function isDescriptionHeading(line: string): boolean {
  return /^(options|commands|available|subcommands|examples?|example usage|flags|arguments)\s*:?\s*$/i.test(line)
}

function looksLikeCommandListEntry(line: string): boolean {
  return /^[a-zA-Z0-9:_-]+\s{2,}\S+/.test(line)
}

export function isRejectedHelpOutput(helpText: string, attemptedArgs: string[]): boolean {
  const normalized = helpText.trim().toLowerCase()
  if (!normalized) return false
  if (attemptedArgs.length === 0) return false

  // Only treat the explicit help probe as evidence of a rejected help attempt.
  // Subcommand names naturally appear in valid help text and should not trigger rejection.
  const relevantArgs = attemptedArgs.filter((arg) => arg === 'help' || arg.startsWith('-'))
  if (relevantArgs.length === 0) return false

  const mentionsAttempt = relevantArgs.some((arg) => {
    const lowered = arg.toLowerCase()
    return normalized.includes(lowered)
  })

  if (!mentionsAttempt) return false

  return (
    /(did not recognize|does not recognize|unknown|unrecognized|invalid|illegal|unsupported).*(command|option|flag|verb|switch)/i.test(
      normalized
    ) ||
    /(type|use).+for a list/i.test(normalized)
  )
}

function isUsableHelpOutput(helpText: string, attemptedArgs: string[]): boolean {
  return helpText.trim().length > 20 && !isRejectedHelpOutput(helpText, attemptedArgs)
}

export function looksLikeReferenceHelpOutput(helpText: string, executable?: string): boolean {
  const trimmed = helpText.trim()
  if (!trimmed) return false

  if (
    /(^|\n)\s*(usage|options?|commands?|subcommands?|available commands|arguments?|examples?|flags?)\s*:?\s*/i.test(trimmed)
  ) {
    return true
  }

  const lines = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const optionLikeLines = lines.filter((line) => {
    return (
      /^-\w(?:\s|,|$)/.test(line) ||
      /^--[\w-]+(?:(?:=|\s|<|\[)|$)/.test(line) ||
      /^-\w,\s*--[\w-]+/.test(line)
    )
  })

  if (optionLikeLines.length >= 2) {
    return true
  }

  if (executable) {
    const lowerExecutable = executable.trim().toLowerCase()
    const usageLikeLine = lines.some((line) => {
      const lowered = line.toLowerCase()
      return (
        lowered.startsWith(`${lowerExecutable} `) &&
        (line.includes('[') ||
          line.includes('<') ||
          line.includes('--') ||
          /\b(file|path|directory|url|command|options?)\b/i.test(line))
      )
    })

    if (usageLikeLine) {
      return true
    }
  }

  return false
}

/**
 * Resolve the full path to an executable.
 * Uses findCommand which searches PATH + extra common directories
 * (homebrew, cargo, npm global, etc.) — so it finds commands even
 * if they're not in the user's PATH.
 */
async function resolveExecutable(executable: string): Promise<string | null> {
  return findCommand(executable)
}

/**
 * Try to get help output for a command + optional subcommand args.
 * Tries --help first, then -h, then help subcommand.
 */
async function getHelpOutput(
  fullPath: string,
  subcommandArgs: string[] = []
): Promise<string> {
  const envPath = await getResolvedPath()
  const isGitSubcommand = basename(fullPath) === 'git' && subcommandArgs.length > 0

  if (subcommandArgs.length === 0 && basename(fullPath) === 'git') {
    try {
      const output = await runCommand(fullPath, ['help', '-a'], envPath)
      if (isUsableHelpOutput(output, ['help', '-a'])) return output
    } catch {
      // ignore
    }
  }

  if (isGitSubcommand) {
    try {
      const args = [...subcommandArgs, '-h']
      const output = await runCommand(fullPath, args, envPath)
      if (isUsableHelpOutput(output, args)) return output
    } catch {
      // ignore
    }
  }

  // Try --help first
  try {
    const args = [...subcommandArgs, '--help']
    const output = await runCommand(fullPath, args, envPath)
    if (isUsableHelpOutput(output, args)) return output
  } catch {
    // ignore
  }

  // Try -h
  if (!isGitSubcommand) {
    try {
      const args = [...subcommandArgs, '-h']
      const output = await runCommand(fullPath, args, envPath)
      if (isUsableHelpOutput(output, args)) return output
    } catch {
      // ignore
    }
  }

  // Try help subcommand (only for root level)
  if (subcommandArgs.length === 0) {
    try {
      const args = ['help']
      const output = await runCommand(fullPath, args, envPath)
      if (isUsableHelpOutput(output, args)) return output
    } catch {
      // ignore
    }
  }

  // Last resort: run with no args — many legacy tools print usage this way
  if (subcommandArgs.length === 0) {
    try {
      const output = await runCommand(fullPath, [], envPath)
      if (looksLikeReferenceHelpOutput(output, basename(fullPath))) return output
    } catch {
      // ignore
    }
  }

  return ''
}

/**
 * Extract a description from help output.
 *
 * Looks for the first descriptive line that isn't a section heading,
 * usage line, or flag. Also checks for a line right after "Usage: ..."
 * which many CLIs use as the description.
 */
export function parseDescription(helpText: string): string {
  const lines = helpText.split('\n')
  const trimmedLines = lines.map((l) => l.trim()).filter((l) => l.length > 0)

  // Strategy 1: Look for a standalone description line after the Usage: line
  // Many CLIs put the description on the line right after "Usage: ..."
  let foundUsage = false
  let inExampleBlock = false
  for (const line of trimmedLines) {
    if (/^usage:/i.test(line)) {
      foundUsage = true
      continue
    }
    if (foundUsage) {
      if (isDescriptionHeading(line)) {
        inExampleBlock = /^(examples?|example usage)\s*:?\s*$/i.test(line)
        if (inExampleBlock) continue
        break
      }

      if (inExampleBlock) {
        continue
      }

      // Skip empty lines
      if (line.length === 0) continue
      // This line is right after Usage — if it's not a section header or option, it's the description
      if (!line.startsWith('-') && !looksLikeCommandListEntry(line)) {
        return line.length > 120 ? line.slice(0, 117) + '...' : line
      }
      break
    }
  }

  // Strategy 2: Look for a description line in the first 10 lines
  inExampleBlock = false
  for (const line of trimmedLines.slice(0, 10)) {
    if (/^usage:/i.test(line)) continue
    if (isDescriptionHeading(line)) {
      inExampleBlock = /^(examples?|example usage)\s*:?\s*$/i.test(line)
      continue
    }
    if (inExampleBlock) continue
    if (line.startsWith('-')) continue
    if (looksLikeCommandListEntry(line)) continue
    if (line.split(/\s+/).length <= 1) continue
    // Skip emoji-prefixed branding lines (like 🦞 OpenClaw...)
    if (/^[\u{1F300}-\u{1FAFF}]/u.test(line)) continue

    return line.length > 120 ? line.slice(0, 117) + '...' : line
  }

  return 'No description available'
}

function extractUsageRemainders(helpText: string, executable: string, subcommandChain: string[] = []): string[] {
  const commandPrefix = [executable, ...subcommandChain].join(' ').trim()
  const usageLines: string[] = []
  let inUsageBlock = false

  for (const rawLine of helpText.split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      inUsageBlock = false
      continue
    }

    if (/^usage:/i.test(line) || /^or:/i.test(line)) {
      usageLines.push(line)
      inUsageBlock = true
      continue
    }

    if (!inUsageBlock) continue

    if (line.toLowerCase().startsWith(commandPrefix.toLowerCase())) {
      usageLines.push(line)
      continue
    }

    if (isDescriptionHeading(line)) {
      inUsageBlock = false
      continue
    }

    inUsageBlock = false
  }

  return usageLines
    .map((line) => line.replace(/^(usage:|or:)\s*/i, '').trim())
    .map((line) => {
      if (line.toLowerCase().startsWith(commandPrefix.toLowerCase())) {
        return line.slice(commandPrefix.length).trim()
      }
      return line
    })
    .filter((line) => line.length > 0)
}

function normalizePositionalLabel(raw: string): string {
  return raw
    .replace(/^<|>$/g, '')
    .replace(/^\[|\]$/g, '')
    .replace(/^\.\.\.|\.\.\.$/g, '')
    .replace(/\|/g, ' or ')
    .replace(/[_-]+/g, ' ')
    .trim()
}

function normalizePositionalId(raw: string): string {
  return raw
    .replace(/^<|>$/g, '')
    .replace(/^\[|\]$/g, '')
    .replace(/^\.\.\.|\.\.\.$/g, '')
    .replace(/\|/g, '_or_')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

function inferPositionalType(label: string): PositionalArgument['type'] {
  const normalized = label.toLowerCase()
  if (/(directory|folder|dir)\b/.test(normalized)) return 'directory-path'
  if (/(file|path|paths|pathspec)\b/.test(normalized)) return 'file-path'
  return 'string'
}

function collapseAlternativePositionals(args: PositionalArgument[]): PositionalArgument[] {
  const grouped = new Map<number, PositionalArgument[]>()

  for (const arg of args) {
    const bucket = grouped.get(arg.position) ?? []
    bucket.push(arg)
    grouped.set(arg.position, bucket)
  }

  return [...grouped.entries()]
    .sort((left, right) => left[0] - right[0])
    .flatMap(([, group]) => {
      if (group.length <= 1) return group

      const baseLabels = group.map((arg) => {
        const match = arg.label.match(/^(.*)\s+(file|directory|dir|path)$/i)
        return match?.[1]?.trim().toLowerCase() ?? null
      })

      if (baseLabels.every(Boolean) && new Set(baseLabels).size === 1) {
        const base = baseLabels[0]!
        const label = `${base} path`
        return [{
          ...group[0],
          id: normalizePositionalId(label),
          label,
          type: 'file-path',
          required: group.some((arg) => arg.required),
          variadic: group.some((arg) => arg.variadic)
        }]
      }

      return [group[0]]
    })
}

function mergeOptions(base: CommandOption[], incoming: CommandOption[]): CommandOption[] {
  const merged = new Map<string, CommandOption>()

  for (const option of base) {
    merged.set(option.id, option)
  }

  for (const option of incoming) {
    const existing = merged.get(option.id)
    if (!existing) {
      merged.set(option.id, option)
      continue
    }

    merged.set(option.id, {
      ...existing,
      ...option,
      group: option.group ?? existing.group,
      order:
        typeof option.order === 'number'
          ? option.order
          : existing.order
    })
  }

  return [...merged.values()].sort((left, right) => {
    const orderDelta = (left.order ?? 999) - (right.order ?? 999)
    if (orderDelta !== 0) return orderDelta
    return left.label.localeCompare(right.label)
  })
}

function extractIndexedHelpTopicKey(helpText: string): string | null {
  const patterns = [
    /--help\s+<?([a-z][\w-]+)>?/i,
    /-h,\s*--help\s+<?([a-z][\w-]+)>?/i
  ]

  for (const pattern of patterns) {
    const match = helpText.match(pattern)
    const topicKey = match?.[1]?.trim().toLowerCase()
    if (topicKey) return topicKey
  }

  return null
}

async function loadIndexedHelpOptions(fullPath: string, helpText: string): Promise<CommandOption[]> {
  const envPath = await getResolvedPath()
  const indexedTopicKey = extractIndexedHelpTopicKey(helpText)
  if (!indexedTopicKey) return []

  let topicsText = ''
  try {
    topicsText = await runCommand(fullPath, ['--help', indexedTopicKey], envPath)
  } catch {
    return []
  }

  const topics = parseIndentedNameDescriptionList(topicsText)
  if (topics.length < 2) return []

  const groupedOptions: CommandOption[] = []

  for (const [topicIndex, topic] of topics.entries()) {
    let topicHelp = ''
    try {
      topicHelp = await runCommand(fullPath, ['--help', topic.name], envPath)
    } catch {
      continue
    }

    const parsedOptions = parseOptions(topicHelp).map((option, optionIndex) => ({
      ...option,
      group: topic.name,
      order: topicIndex * 1000 + optionIndex
    }))
    groupedOptions.push(...parsedOptions)
  }

  return groupedOptions
}

export function parsePositionalArgs(
  helpText: string,
  executable: string,
  subcommandChain: string[] = []
): PositionalArgument[] {
  const usageRemainders = extractUsageRemainders(helpText, executable, subcommandChain)
  const positionalMap = new Map<string, PositionalArgument>()

  for (const remainder of usageRemainders) {
    const tokens = remainder.match(/\[[^\]]+\]|<[^>]+>\.\.\.|<[^>]+>|\.{3}|--|[^\s]+/g) ?? []
    let position = 0

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index]
      if (token === '--' || token === '...') continue

      const optional = token.startsWith('[') && token.endsWith(']')
      const inner = optional ? token.slice(1, -1).trim() : token
      if (!inner) continue

      if (/^<options?(?:\.{3})?>$/i.test(inner) || /^options?(?:\.{3})?$/i.test(inner)) continue
      if (inner.startsWith('-')) continue
      if (inner.includes('|') && inner.includes('-')) continue

      let raw = inner
      let variadic = raw.endsWith('...') || tokens[index + 1] === '...'
      if (variadic) {
        raw = raw.replace(/\.\.\.$/, '')
      }

      if (!raw.startsWith('<') && !/[A-Za-z]/.test(raw)) continue

      const label = normalizePositionalLabel(raw)
      const id = normalizePositionalId(raw)
      if (!label || !id) continue

      const existing = positionalMap.get(id)
      if (existing) {
        existing.required = Boolean(existing.required && !optional)
        existing.variadic = Boolean(existing.variadic || variadic)
        position += 1
        continue
      }

      positionalMap.set(id, {
        id,
        label,
        type: inferPositionalType(label),
        required: !optional,
        variadic,
        position
      })
      position += 1
    }
  }

  return collapseAlternativePositionals(
    [...positionalMap.values()].sort((left, right) => left.position - right.position)
  )
}

/** Flag lines look like "-f, --force", "  --opt=VAL" or " -a, --all  Description" */
const OPTION_LINE_RE = /^(\s+)(-{1,2}[A-Za-z0-9][^\s]*.*)$/
const FLAG_TOKEN_RE = /(?<![\w-])(-{1,2}[A-Za-z0-9][\w-]*)/g

/**
 * Split an option line (indent already removed) into its flag part and inline description.
 * The gap before the description is 2+ spaces, but a gap right after a comma belongs to the
 * flag list ("-b,  --background  go to background").
 */
function splitOptionLine(rest: string): { flagText: string; description: string; descriptionColumn: number } {
  const gap = /\s{2,}|\t/g
  let match: RegExpExecArray | null
  while ((match = gap.exec(rest)) !== null) {
    const before = rest.slice(0, match.index).trimEnd()
    if (before.endsWith(',')) continue
    return {
      flagText: before,
      description: rest.slice(match.index + match[0].length).trim(),
      descriptionColumn: match.index + match[0].length
    }
  }
  return { flagText: rest.trim(), description: '', descriptionColumn: -1 }
}

function indentWidth(line: string): number {
  return line.length - line.trimStart().length
}

/**
 * Parse option flags from help text.
 *
 * Handles the layouts found in real CLIs:
 *   -f, --force              Force the operation          (aligned table, any indent)
 *   -b,  --background        Flag list with a double space after the comma
 *   -t, --title string       Cobra/Go style bare type word marks a value
 *   --pre=COMMAND            Equals-attached value (also: "--color[=WHEN]")
 *   -q, --quiet...           Repeatable flag
 *   --flag                   Description on the following, deeper-indented lines
 *       Long description...
 * Lines inside a wrapped description that happen to start with a dash are not flags.
 */
export function parseOptions(helpText: string): CommandOption[] {
  const options: CommandOption[] = []
  const seen = new Set<string>()
  const lines = helpText.split('\n')

  // Lines indented at least this far belong to the previous option's wrapped description
  let continuationIndent = Infinity

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const lineMatch = line.match(OPTION_LINE_RE)
    if (!lineMatch) continue

    const indent = lineMatch[1].length
    if (indent >= continuationIndent) continue

    const split = splitOptionLine(lineMatch[2])
    let description = split.description

    if (split.descriptionColumn >= 0) {
      continuationIndent = indent + split.descriptionColumn
    } else {
      continuationIndent = Infinity
    }

    if (!description) {
      // Description starts on the next non-empty line, indented deeper than the flag
      let next = index + 1
      while (next < lines.length && lines[next].trim() === '') next += 1
      if (next < lines.length && indentWidth(lines[next]) > indent && !OPTION_LINE_RE.test(lines[next])) {
        description = lines[next].trim()
        continuationIndent = indentWidth(lines[next])
      } else if (next < lines.length && indentWidth(lines[next]) > indent) {
        continuationIndent = indentWidth(lines[next])
      }
    }

    const flagText = split.flagText.replace(/\.\.\.$/, '')
    const flags = [...flagText.matchAll(FLAG_TOKEN_RE)].map((m) => m[1])
    const short = flags.find((flag) => /^-[A-Za-z0-9]$/.test(flag))
    const long = flags.find((flag) => flag.startsWith('--'))
    if (!short && !long) continue

    const flagName = long || short!
    if (SKIP_OPTIONS.has(flagName)) continue
    if (seen.has(flagName)) continue
    seen.add(flagName)

    // Whatever remains once flag names, commas and "or" are removed is the value placeholder
    const valuePart = flagText
      .replace(FLAG_TOKEN_RE, '')
      .replace(/,|\bor\b|\|/g, ' ')
      .trim()
    const hasValue = valuePart.length > 0 && !valuePart.startsWith('(')
    const equalsAttached = new RegExp(`${(long ?? short!).replace(/[-]/g, '\\-')}\\[?=`).test(flagText)

    const id = flagName.replace(/^-+/, '').replace(/-/g, '_')

    options.push({
      id,
      short: short || undefined,
      long: long || undefined,
      label: flagName.replace(/^-+/, '').replace(/-/g, ' '),
      description,
      type: hasValue ? 'string' : 'boolean',
      separator: hasValue ? (equalsAttached ? 'equals' : 'space') : undefined
    })
  }

  return options
}

/**
 * Parse the "Commands:" section from help output to discover subcommands.
 *
 * Looks for section headings like "Commands:", "Available commands:", "Subcommands:"
 * then extracts indented lines with format:  command-name   Description text
 *
 * Handles the * suffix that some CLIs use to indicate commands with subcommands:
 *   acp *                Agent Control Protocol tools
 *   agent                Run one agent turn
 */
function parseCommandsSection(helpText: string): Array<{ name: string; description: string }> {
  const lines = helpText.split('\n')
  const commands: Array<{ name: string; description: string }> = []

  let inCommandsSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect start of commands section
    if (
      /^<?(?:(?:[\w-]+\s+)*commands|available commands|subcommands|sub-commands)>?\s*:?\s*$/i.test(trimmed)
    ) {
      inCommandsSection = true
      continue
    }

    // If we're in the commands section
    if (inCommandsSection) {
      // Empty line might end the section or just be spacing — keep looking
      if (trimmed.length === 0) continue

      // A new section heading (non-indented text ending with colon) ends the commands section
      if (/^[A-Z][\w\s]+:/.test(trimmed) && !line.startsWith(' ')) {
        inCommandsSection = false
        continue
      }

      // Skip hint/info lines (e.g., "Hint: commands suffixed with * have subcommands")
      if (/^\s{2,}(hint|note|tip)\s*:/i.test(line)) continue

      // Parse indented command lines: "  command-name [*]   Description"
      // The optional * suffix indicates subcommands exist (we handle it either way)
      const match = line.match(/^\s{2,}([a-zA-Z0-9:_-]+)(?:\s\*)?\s{2,}(.+)$/)
      const colonMatch = line.match(/^\s{2,}([a-zA-Z0-9:_-]+)\s*:\s+(.+)$/)
      const parsed = match ?? colonMatch
      if (parsed) {
        const [, name, desc] = parsed
        // Skip "help" subcommand — it's not a real command to build
        if (name === 'help') continue
        commands.push({ name, description: desc.trim() })
      }
    }
  }

  return commands
}

/**
 * Fallback parser for legacy/non-standard CLI help formats.
 *
 * Only runs when the modern parseCommandsSection() finds nothing.
 * Handles:
 *   1. "where <command> is one of..." followed by indented or comma-separated names
 *   2. Tab-indented usage lines:  \t<command-name> [<args>]
 *   3. Bulleted/dashed lists of subcommands
 */
export function parseLegacyCommands(helpText: string): Array<{ name: string; description: string }> {
  const commands: Array<{ name: string; description: string }> = []
  const seen = new Set<string>()
  const lines = helpText.split('\n')

  // Skip words that look like commands but aren't
  const skipWords = new Set([
    'usage', 'where', 'the', 'options', 'example', 'examples', 'note',
    'notes', 'help', 'description', 'following', 'command', 'commands',
    'version', 'is', 'one', 'of', 'for', 'see', 'use',
    'with', 'from', 'and', 'not', 'all', 'are', 'can', 'may'
  ])

  const addCmd = (name: string, desc: string): void => {
    if (!seen.has(name) && !skipWords.has(name.toLowerCase()) && name.length > 1) {
      seen.add(name)
      commands.push({ name, description: desc })
    }
  }

  // Pattern 1: "where <command> is one of" (ipconfig-style)
  for (let i = 0; i < lines.length; i++) {
    if (/where\s+.*\s+is\s+one\s+of/i.test(lines[i])) {
      // Check for inline list after "of": "of waitall, getifaddr, ifcount"
      const afterOf = lines[i].replace(/.*is\s+one\s+of\s*(the\s+following\s*:?)?\s*/i, '').trim()
      if (afterOf) {
        for (const name of afterOf.split(/[,\s]+/)) {
          if (/^[a-zA-Z][\w-]*$/.test(name)) addCmd(name, '')
        }
      }
      // Parse subsequent indented lines (tab or space indented)
      for (let j = i + 1; j < lines.length; j++) {
        const sub = lines[j]
        if (/^\S/.test(sub) && sub.trim().length > 0) break // non-indented = new section
        const trimmed = sub.trim()
        if (!trimmed) continue
        // Grab the first word as command name
        const cmdMatch = trimmed.match(/^([a-zA-Z][\w-]*)/)
        if (cmdMatch) {
          // Grab description: everything after the command + args patterns
          const rest = trimmed
            .slice(cmdMatch[0].length)
            .replace(/^\s+/, '')
            .replace(/^<[^>]*>\s*/g, '')     // strip <arg> placeholders
            .replace(/^\([^)]*\)\s*/g, '')   // strip (arg) placeholders
            .replace(/^\[[^\]]*\]\s*/g, '')  // strip [arg] placeholders
            .trim()
          addCmd(cmdMatch[1], rest)
        }
      }
      if (commands.length > 0) return commands
    }
  }

  // Pattern 2: Tab-indented command lines (BSD/macOS style)
  // e.g., \tgetifaddr <interface-name>
  for (const line of lines) {
    const match = line.match(/^\t([a-zA-Z][\w-]*)(?:\s+.*)?$/)
    if (match) {
      addCmd(match[1], '')
    }
  }
  if (commands.length > 0) return commands

  // Pattern 3: Indented lines that look like "  verb-noun  ..." after any heading
  // Catches utilities that list subcommands without a "Commands:" heading
  let afterHeading = false
  for (const line of lines) {
    const trimmed = line.trim()
    // Detect section-like headings (all-caps or Title Case ending with colon)
    if (/^[A-Z][A-Z\s]+:?$/.test(trimmed) || /^[A-Z][\w\s]+:$/.test(trimmed)) {
      afterHeading = true
      continue
    }
    if (afterHeading && trimmed.length === 0) continue
    if (afterHeading && /^\S/.test(line)) {
      afterHeading = false
      continue
    }
    if (afterHeading) {
      const cmdMatch = line.match(/^\s{2,}([a-zA-Z][\w-]+)/)
      if (cmdMatch) {
        addCmd(cmdMatch[1], '')
      }
    }
  }

  if (commands.length > 0) return commands

  // Pattern 4: Generic indented command + description pairs used by tools like
  // "git help -a", where section headings are plain prose rather than "Commands:".
  for (const line of lines) {
    const match = line.match(/^\s{3,}([a-zA-Z][\w-]*)\s{2,}(.+)$/)
    if (!match) continue

    const [, name, description] = match
    addCmd(name, description.trim())
  }

  return commands
}

/**
 * Parse discovered subcommands: for each one, run its --help and extract
 * options. Also recursively check for nested subcommands up to MAX_SUBCOMMAND_DEPTH.
 */
async function enrichSubcommands(
  fullPath: string,
  executable: string,
  discovered: Array<{ name: string; description: string }>,
  parentChain: string[],
  depth: number
): Promise<ParsedSubcommand[]> {
  const results: ParsedSubcommand[] = []
  const skipSubcommandHelp = executable === '7zz' || executable === '7z'

  for (const sub of discovered) {
    const chain = [...parentChain, sub.name]

    let description = sub.description || 'No description available'
    let options: CommandOption[] | undefined
    let positionalArgs: PositionalArgument[] | undefined
    let subHelp = ''

    if (!skipSubcommandHelp) {
      // Some tools like 7-Zip treat "subcommand --help" as real input and can create files.
      // For those, we keep the discovered top-level commands but skip subcommand probing.
      subHelp = await getHelpOutput(fullPath, chain)
    }

    if (subHelp) {
      const parsedDesc = parseDescription(subHelp)
      if (parsedDesc !== 'No description available') {
        description = parsedDesc
      }
      const parsedOpts = parseOptions(subHelp)
      if (parsedOpts.length > 0) {
        options = parsedOpts
      }
      const parsedPositionals = parsePositionalArgs(subHelp, executable, chain)
      if (parsedPositionals.length > 0) {
        positionalArgs = parsedPositionals
      }

      // Check for nested subcommands (e.g., openclaw cron add, openclaw cron list)
      if (depth + 1 <= MAX_SUBCOMMAND_DEPTH) {
        const nestedSubs = parseCommandsSection(subHelp)
        if (nestedSubs.length > 0) {
          const nested = await enrichSubcommands(fullPath, executable, nestedSubs, chain, depth + 1)
          results.push(...nested)
        }
      }
    }

    results.push({
      name: sub.name,
      chain,
      description,
      options,
      positionalArgs
    })
  }

  return results
}

/**
 * Parse --help output for a command, discovering subcommands recursively.
 *
 * Returns the root command's description/options plus an array of all
 * discovered subcommands (each with their own options).
 */
export async function parseHelpOutput(
  executable: string
): Promise<ParsedHelpResult | null> {
  const fullPath = await resolveExecutable(executable)
  if (!fullPath) return null

  const helpText = await getHelpOutput(fullPath)
  if (!helpText) return null

  const description = parseDescription(helpText)
  let options = parseOptions(helpText)
  const positionalArgs = parsePositionalArgs(helpText, executable)

  let topLevelSubs: Array<{ name: string; description: string }> = []

  if (executable === 'brew') {
    const envPath = await getResolvedPath()
    try {
      const commandsText = await runCommand(fullPath, ['commands', '--quiet'], envPath)
      topLevelSubs = parseLineCommandList(commandsText)
    } catch {
      // ignore
    }
  }

  const indexedHelpOptions = await loadIndexedHelpOptions(fullPath, helpText)
  if (indexedHelpOptions.length > 0) {
    options = mergeOptions(options, indexedHelpOptions)
  } else if (/\B--help all\b/i.test(helpText)) {
    const envPath = await getResolvedPath()
    try {
      const expandedHelp = await runCommand(fullPath, ['--help', 'all'], envPath)
      const expandedOptions = parseOptions(expandedHelp)
      if (expandedOptions.length > 0) {
        options = mergeOptions(options, expandedOptions)
      }
    } catch {
      // ignore
    }
  }

  // Check for subcommands — try modern format first, then legacy fallback
  if (topLevelSubs.length === 0) {
    topLevelSubs = parseCommandsSection(helpText)
  }
  if (topLevelSubs.length === 0) {
    topLevelSubs = parseLegacyCommands(helpText)
  }

  let subcommands: ParsedSubcommand[] = []

  if (topLevelSubs.length > 0) {
    subcommands = await enrichSubcommands(fullPath, executable, topLevelSubs, [], 1)
  }

  return {
    description,
    options: options.length > 0 ? options : undefined,
    positionalArgs: positionalArgs.length > 0 ? positionalArgs : undefined,
    subcommands
  }
}
