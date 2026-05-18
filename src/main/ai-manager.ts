import { getSettings } from './settings-manager'
import type { AIProvider, AIRoutingTarget, AppSettings } from '../shared/settings-schema'
import {
  LOCALE_METADATA,
  resolveAIResponseLocale,
  resolveLocalePreference
} from '../shared/locale-schema'
import type {
  CommandDefinition,
  CommandOption,
  CommandReferenceHelpSections,
  EnumChoice,
  OptionType,
  PositionalArgument
} from '../shared/command-schema'
import type {
  AIActionRequest,
  AIActionResponse,
  AIArtifactImprovementRequest,
  AICommandExplainRequest,
  AICommandGenerationRequest,
  AICommandGenerationResponse,
  AICommandHelpRequest,
  AICommandHelpResponse,
  AICommandTreeGenerationRequest,
  AICommandTreeGenerationResponse,
  AICommandReviewRequest,
  AIOutputReviewRequest,
  AIChatFollowUpRequest
} from '../shared/ai-schema'

const OUTPUT_REVIEW_MAX_CHARS = 12_000
const OPENAI_COMPATIBLE_PROVIDER_IDS = new Set<AIProvider['id']>([
  'openrouter',
  'groq',
  'mistral',
  'together',
  'fireworks',
  'xai',
  'deepseek',
  'openai-compatible',
  'lmstudio'
])

function getHostLocaleCandidates(): string[] {
  const resolved = Intl.DateTimeFormat().resolvedOptions().locale
  return resolved ? [resolved] : []
}

function withLocaleInstruction(
  prompt: { instructions: string; input: string },
  settings: AppSettings
): { instructions: string; input: string } {
  const appLocale = resolveLocalePreference(settings.uiLocale, getHostLocaleCandidates())
  const responseLocale = resolveAIResponseLocale(settings.aiResponseLocale, appLocale)
  const languageName = LOCALE_METADATA[responseLocale].englishName
  const instruction =
    `Respond in ${languageName}. User-facing prose and JSON string values should use this language. ` +
    'Preserve terminal commands, executable names, flags, file paths, environment variables, code, and shell output exactly as written unless the user explicitly asks to translate surrounding prose only.'

  return {
    ...prompt,
    instructions: `${prompt.instructions}\n\n${instruction}`
  }
}

export function buildCommandReviewPrompt(request: AICommandReviewRequest): {
  instructions: string
  input: string
} {
  return {
    instructions:
      'You are reviewing a terminal command for a developer. Explain what the command does, call out important risks or prerequisites, and suggest a safer or more cautious variant when relevant. Respond in plain text using five short sections titled Summary, Risks, Safer Option, Examples, and Notes. In Examples, include one or two concrete command examples when possible. Do not include chain-of-thought, hidden reasoning, thinking tags, or preambles such as "Thinking".',
    input: [
      `Command name: ${request.commandName}`,
      request.commandDescription ? `Description: ${request.commandDescription}` : null,
      `Command string: ${request.commandString}`
    ]
      .filter(Boolean)
      .join('\n')
  }
}

export function buildCommandExplainPrompt(request: AICommandExplainRequest): {
  instructions: string
  input: string
} {
  return {
    instructions:
      'You are explaining a terminal command fragment for a developer. Return plain text only in exactly three short sections with these exact headings on their own lines: Overview, Explanation, Example. Do not include any other headings, bullets, preambles, meta commentary, chain-of-thought, hidden reasoning, or thinking tags. In Overview, give a one-sentence summary of what the fragment is for. In Explanation, explain what the fragment does in context, including what any placeholders like <path> or <branch> should contain. In Example, provide one realistic command example followed by one short sentence describing what it does. Do not use markdown code fences.',
    input: [
      `Command name: ${request.commandName}`,
      request.commandDescription ? `Description: ${request.commandDescription}` : null,
      `Command string: ${request.commandString}`
    ]
      .filter(Boolean)
      .join('\n')
  }
}

export function buildCommandHelpPrompt(request: AICommandHelpRequest): {
  instructions: string
  input: string
} {
  return {
    instructions:
      'You are writing structured CLI reference help for a developer. Return strict JSON only with no markdown and no prose outside the JSON object. The JSON must match this shape exactly: {"overview":"string","commonOptions":[{"title":"string","rows":[{"label":"string","description":"string","platform":"string"}]}],"arguments":[{"label":"string","description":"string","required":true}],"examples":[{"command":"string","description":"string"}],"platformNotes":["string"],"cautions":["string"]}. Prefer broad, practical option coverage over brevity for common commands. In commonOptions, include as many high-confidence options as are commonly useful, group them by purpose, and include both short and long forms in label when relevant. Include a practical superset across macOS/BSD and GNU/Linux when useful, but clearly mark platform-specific items in the platform field or platformNotes. Do not invent obscure subcommands or low-confidence flags. Keep descriptions concise and useful. Do not include chain-of-thought, hidden reasoning, thinking tags, or commentary outside the JSON object.',
    input: [
      `Command name: ${request.command.name}`,
      `Executable: ${request.command.executable}`,
      request.command.description ? `Description: ${request.command.description}` : null,
      request.cwd ? `Working directory: ${request.cwd}` : null,
      `Platform context: ${process.platform}`,
      'Coverage preference: comprehensive practical option inventory, not just a short summary.',
      request.command.options && request.command.options.length > 0
        ? `Known structured options: ${JSON.stringify(request.command.options, null, 2)}`
        : null,
      request.command.positionalArgs && request.command.positionalArgs.length > 0
        ? `Known structured arguments: ${JSON.stringify(request.command.positionalArgs, null, 2)}`
        : null
    ]
      .filter(Boolean)
      .join('\n')
  }
}

function simplifyCommandSchema(command: CommandDefinition): Record<string, unknown> {
  return {
    name: command.name,
    executable: command.executable,
    subcommands: command.subcommands ?? [],
    description: command.description,
    dangerLevel: command.dangerLevel ?? 'safe',
    options: (command.options ?? []).map((option) => ({
      id: option.id,
      label: option.label,
      type: option.type,
      description: option.description ?? '',
      required: option.required ?? false,
      flag: option.long ?? option.short ?? '',
      defaultValue: option.defaultValue ?? null,
      choices: option.choices?.map((choice) => ({
        value: choice.value,
        label: choice.label
      })) ?? []
    })),
    positionalArgs: (command.positionalArgs ?? [])
      .sort((a, b) => a.position - b.position)
      .map((arg) => ({
        id: arg.id,
        label: arg.label,
        type: arg.type,
        required: arg.required ?? false,
        variadic: arg.variadic ?? false,
        defaultValue: arg.defaultValue ?? null,
        choices: arg.choices?.map((choice) => ({
          value: choice.value,
          label: choice.label
        })) ?? []
      })),
    examples: (command.examples ?? []).map((example) => ({
      label: example.label,
      values: example.values
    }))
  }
}

export function buildCommandGenerationPrompt(request: AICommandGenerationRequest): {
  instructions: string
  input: string
} {
  return {
    instructions:
      'You are generating values for a terminal command builder. Return strict JSON only with no markdown. The JSON must match this shape exactly: {"summary":"string","warnings":["string"],"values":{"field_id":value}}. Use only field ids from the provided command schema. For boolean flags return booleans, for number inputs return numbers, for string/enum/path inputs return strings, and for repeatable or multi-select inputs return arrays of strings. Do not invent unsupported flags, shell wrappers, or extra top-level keys. If the request needs something the schema cannot express, explain that in warnings and omit the unsupported field. Do not include chain-of-thought, hidden reasoning, thinking tags, or commentary outside the JSON object.',
    input: [
      `User request: ${request.prompt}`,
      request.cwd ? `Working directory: ${request.cwd}` : null,
      request.currentValues && Object.keys(request.currentValues).length > 0
        ? `Current builder values: ${JSON.stringify(request.currentValues, null, 2)}`
        : null,
      'Command schema:',
      JSON.stringify(simplifyCommandSchema(request.command), null, 2)
    ]
      .filter(Boolean)
      .join('\n\n')
  }
}

export function buildCommandTreeGenerationPrompt(request: AICommandTreeGenerationRequest): {
  instructions: string
  input: string
} {
  const knownSubcommands = request.knownSubcommands
    ?.slice(0, 80)
    .map((subcommand) => ({
      name: subcommand.name,
      description: subcommand.description ?? ''
    }))

  return {
    instructions:
      'You are generating a terminal command tree for a command builder. Return strict JSON only with no markdown. The JSON must match this shape exactly: {"rootDescription":"string","warnings":["string"],"rootOptions":[{"id":"string","label":"string","type":"boolean|string|number|enum|multi-select|file-path|directory-path|repeatable|key-value","description":"string","short":"-x","long":"--example","required":false,"repeatable":false,"separator":"space|equals|none","choices":[{"value":"string","label":"string","description":"string"}]}],"rootPositionalArgs":[{"id":"string","label":"string","description":"string","type":"string|file-path|directory-path|enum","required":true,"variadic":false,"position":0,"choices":[{"value":"string","label":"string","description":"string"}]}],"subcommands":[{"name":"string","description":"string","options":[same option shape],"positionalArgs":[same positional arg shape]}]}. Only include top-level subcommands. For well-known CLIs, include the common top-level subcommands a developer would reasonably expect to use. Prefer high-confidence subcommands and options, but do not under-generate obvious core commands. If known top-level subcommands are provided, preserve and enrich them instead of collapsing the tree to fewer items unless they are clearly invalid. When an option is just an on/off flag, use type "boolean" rather than "enum". Use positionalArgs for values like branch names, files, paths, modes, or other free-form arguments that come after the command. Do not include chain-of-thought, hidden reasoning, thinking tags, or commentary outside the JSON object.',
    input: [
      `Executable: ${request.command.executable}`,
      `Current command name: ${request.command.name}`,
      request.command.description ? `Current description: ${request.command.description}` : null,
      request.cwd ? `Working directory: ${request.cwd}` : null,
      request.command.options && request.command.options.length > 0
        ? `Existing root options: ${JSON.stringify(request.command.options, null, 2)}`
        : null,
      request.command.positionalArgs && request.command.positionalArgs.length > 0
        ? `Existing root positional args: ${JSON.stringify(request.command.positionalArgs, null, 2)}`
        : null,
      knownSubcommands && knownSubcommands.length > 0
        ? `Known top-level subcommands already discovered: ${JSON.stringify(knownSubcommands, null, 2)}`
        : null
    ]
      .filter(Boolean)
      .join('\n\n')
  }
}

function truncateTextTail(content: string): { content: string; truncated: boolean } {
  const normalized = content.trim()
  if (normalized.length <= OUTPUT_REVIEW_MAX_CHARS) {
    return { content: normalized, truncated: false }
  }

  return {
    content: normalized.slice(-OUTPUT_REVIEW_MAX_CHARS),
    truncated: true
  }
}

export function buildOutputReviewPrompt(request: AIOutputReviewRequest): {
  instructions: string
  input: string
} {
  const transcript = truncateTextTail(request.transcript)

  return {
    instructions:
      'You are reviewing terminal output for a developer. Explain what happened, identify the most likely cause of any failure or warning, and suggest concrete next checks or commands. Respond in plain text using four short sections titled Summary, Likely Cause, Next Steps, and Cautions. Do not include chain-of-thought, hidden reasoning, thinking tags, or preambles such as "Thinking".',
    input: [
      `Source: ${request.source === 'terminal' ? 'Live terminal session' : 'Saved terminal log'}`,
      request.focus === 'command-block'
        ? 'Focus: Most recent command block only'
        : 'Focus: Full session transcript',
      `Title: ${request.title}`,
      request.cwd ? `Working directory: ${request.cwd}` : null,
      request.shell ? `Shell: ${request.shell}` : null,
      request.exitCode === undefined
        ? null
        : request.exitCode === null
          ? 'Exit code: manually closed or still running'
          : `Exit code: ${request.exitCode}`,
      transcript.truncated
        ? `Transcript note: Transcript was truncated to the most recent ${OUTPUT_REVIEW_MAX_CHARS} characters.`
        : null,
      'Transcript:',
      transcript.content || '[No transcript captured]'
    ]
      .filter(Boolean)
      .join('\n')
  }
}

export function buildChatFollowUpPrompt(request: AIChatFollowUpRequest): {
  instructions: string
  input: string
} {
  return {
    instructions:
      'You are a helpful terminal and command-line assistant chatting with a developer. You previously reviewed some terminal output or a command for them, and they have a follow-up question. Respond naturally and conversationally — do not use rigid section headings like Summary, Likely Cause, etc. Be concise and direct. Use code blocks for commands. Do not include chain-of-thought, hidden reasoning, thinking tags, or preambles.',
    input: [
      'Original content:',
      request.context,
      '',
      '---',
      '',
      'Conversation so far:',
      request.conversation,
      '',
      '---',
      '',
      `User's question: ${request.question}`
    ].join('\n')
  }
}

export function buildArtifactImprovementPrompt(request: AIArtifactImprovementRequest): {
  instructions: string
  input: string
} {
  const content = truncateTextTail(request.content)

  return {
    instructions:
      'You are helping a developer improve a reusable terminal script or snippet. Explain what it does, call out safety or robustness issues, and propose a revised version or concrete edits. Respond in plain text using four short sections titled Summary, Risks, Improved Version, and Notes. Do not include chain-of-thought, hidden reasoning, thinking tags, or preambles such as "Thinking".',
    input: [
      `Artifact type: ${request.artifactType}`,
      `Title: ${request.title}`,
      request.description ? `Description: ${request.description}` : null,
      content.truncated
        ? `Content note: Content was truncated to the most recent ${OUTPUT_REVIEW_MAX_CHARS} characters.`
        : null,
      'Current content:',
      content.content || '[No content provided]'
    ]
      .filter(Boolean)
      .join('\n')
  }
}

function extractJsonText(content: string): string {
  const trimmed = content.trim()
  if (!trimmed) {
    throw new Error('AI provider returned an empty response')
  }

  const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (codeFenceMatch?.[1]) {
    return codeFenceMatch[1].trim()
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  return trimmed
}

export function sanitizeAIText(content: string): string {
  let sanitized = content.trim()

  sanitized = sanitized.replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, '').trim()
  sanitized = sanitized.replace(/<thinking\b[^>]*>[\s\S]*?<\/thinking>/gi, '').trim()
  sanitized = sanitized.replace(/^\s*(thinking|reasoning)\s*:.*$/gim, '').trim()
  sanitized = sanitized.replace(/```[a-z]*\s*/gi, '').replace(/```/g, '').trim()

  return sanitized
}

function normalizeCommandExplainContent(
  request: AICommandExplainRequest,
  content: string
): string {
  const sanitized = sanitizeAIText(content)
  const sectionPattern = /^\s*(Overview|Explanation|Example)\s*:?\s*$/gim
  const matches = [...sanitized.matchAll(sectionPattern)]
  const sections = new Map<'Overview' | 'Explanation' | 'Example', string>()

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    const title = match[1] as 'Overview' | 'Explanation' | 'Example'
    const start = match.index! + match[0].length
    const end = index + 1 < matches.length ? matches[index + 1].index! : sanitized.length
    const body = sanitized.slice(start, end).trim()
    if (body) {
      sections.set(title, body)
    }
  }

  const explanationFallback = sanitized
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .find((entry) => !/^(overview|explanation|example)\s*:?\s*$/i.test(entry))
    ?? `The fragment \`${request.commandString}\` is used within ${request.commandName} to control how the command runs.`

  const overview =
    sections.get('Overview') ??
    request.commandDescription?.trim() ??
    `This fragment helps configure ${request.commandName}.`

  const explanation = sections.get('Explanation') ?? explanationFallback
  const example =
    sections.get('Example') ??
    `${request.commandString}\nRuns ${request.commandName} using this fragment.`

  return [
    'Overview',
    overview,
    '',
    'Explanation',
    explanation,
    '',
    'Example',
    example
  ].join('\n')
}

function normalizeJsonLikeText(content: string): string {
  return content
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
    .trim()
}

function buildCommandGenerationFallback(content: string): AICommandGenerationResponse['suggestion'] {
  const summary = sanitizeAIText(content)
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .find(Boolean)

  return {
    summary:
      summary && summary.length > 0
        ? summary
        : 'AI returned guidance, but it could not be converted into builder values.',
    warnings: ['AI response could not be converted into builder values automatically.'],
    values: {}
  }
}

function coerceBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
  }
  return null
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (typeof entry !== 'string') return []
      const trimmed = entry.trim()
      return trimmed.length > 0 ? [trimmed] : []
    })
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()]
  }

  return []
}

function isOptionType(value: unknown): value is OptionType {
  return [
    'boolean',
    'string',
    'number',
    'enum',
    'multi-select',
    'file-path',
    'directory-path',
    'repeatable',
    'key-value'
  ].includes(String(value))
}

function slugifyOptionId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^--?/, '')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function coerceEnumChoices(value: unknown): EnumChoice[] | undefined {
  if (!Array.isArray(value)) return undefined

  const choices = value.flatMap((entry) => {
    if (typeof entry === 'string' && entry.trim()) {
      return [{ value: entry.trim(), label: entry.trim() }]
    }

    if (!entry || typeof entry !== 'object') return []
    const record = entry as Record<string, unknown>
    const rawValue = typeof record.value === 'string' ? record.value.trim() : ''
    const rawLabel = typeof record.label === 'string' ? record.label.trim() : rawValue
    if (!rawValue) return []

    return [{
      value: rawValue,
      label: rawLabel || rawValue,
      description:
        typeof record.description === 'string' && record.description.trim()
          ? record.description.trim()
          : undefined
    }]
  })

  return choices.length > 0 ? choices : undefined
}

function coerceCommandOptions(rawOptions: unknown): CommandOption[] | undefined {
  if (!Array.isArray(rawOptions)) return undefined

  const options = rawOptions.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') return []
    const record = entry as Record<string, unknown>
    const rawLong = typeof record.long === 'string' && record.long.trim() ? record.long.trim() : undefined
    const rawShort = typeof record.short === 'string' && record.short.trim() ? record.short.trim() : undefined
    const long = rawLong ? (rawLong.startsWith('--') ? rawLong : `--${rawLong.replace(/^--?/, '')}`) : undefined
    const short = rawShort ? (rawShort.startsWith('-') ? rawShort : `-${rawShort.replace(/^-+/, '')}`) : undefined
    const explicitLabel = typeof record.label === 'string' && record.label.trim() ? record.label.trim() : undefined
    const explicitId = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : undefined
    const label = explicitLabel || long?.replace(/^--/, '').replace(/-/g, ' ') || short?.replace(/^-/, '') || `option ${index + 1}`
    const id = explicitId || slugifyOptionId(long || short || label) || `option_${index + 1}`
    const rawType = isOptionType(record.type) ? record.type : 'boolean'
    const separator =
      record.separator === 'space' || record.separator === 'equals' || record.separator === 'none'
        ? record.separator
        : undefined
    const choices = coerceEnumChoices(record.choices)

    let type: OptionType = rawType
    if ((rawType === 'enum' || rawType === 'multi-select') && !choices?.length) {
      type = separator || long || short ? 'boolean' : 'string'
    }

    return [{
      id,
      label,
      type,
      short,
      long,
      separator,
      description:
        typeof record.description === 'string' && record.description.trim()
          ? record.description.trim()
          : undefined,
      required: Boolean(record.required),
      repeatable: Boolean(record.repeatable),
      choices,
      order: index
    } satisfies CommandOption]
  })

  return options.length > 0 ? options : undefined
}

function isPositionalType(value: unknown): value is PositionalArgument['type'] {
  return ['string', 'file-path', 'directory-path', 'enum'].includes(String(value))
}

function coercePositionalArgs(rawArgs: unknown): PositionalArgument[] | undefined {
  if (!Array.isArray(rawArgs)) return undefined

  const args = rawArgs.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') return []
    const record = entry as Record<string, unknown>
    const explicitLabel = typeof record.label === 'string' && record.label.trim() ? record.label.trim() : undefined
    const explicitId = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : undefined
    const label = explicitLabel || `argument ${index + 1}`
    const id = explicitId || slugifyOptionId(label) || `arg_${index + 1}`
    const type = isPositionalType(record.type) ? record.type : 'string'

    const arg: PositionalArgument = {
      id,
      label,
      type,
      required: record.required !== false,
      variadic: Boolean(record.variadic),
      position:
        typeof record.position === 'number' && Number.isFinite(record.position)
          ? record.position
          : index,
      description:
        typeof record.description === 'string' && record.description.trim()
          ? record.description.trim()
          : undefined
    }

    const choices = coerceEnumChoices(record.choices)
    if (type === 'enum' && choices?.length) {
      arg.choices = choices
    }

    return [arg]
  })

  return args.length > 0 ? args.sort((left, right) => left.position - right.position) : undefined
}

function coerceReferenceHelpRows(rawRows: unknown): CommandReferenceHelpSections['arguments'] {
  if (!Array.isArray(rawRows)) return undefined

  const rows = rawRows.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []

    const record = entry as Record<string, unknown>
    const label = typeof record.label === 'string' ? record.label.trim() : ''
    const description = typeof record.description === 'string' ? record.description.trim() : ''
    if (!label || !description) return []

    return [{
      label,
      description,
      platform: typeof record.platform === 'string' && record.platform.trim() ? record.platform.trim() : undefined,
      required: typeof record.required === 'boolean' ? record.required : undefined
    }]
  })

  return rows.length > 0 ? rows : undefined
}

function coerceReferenceHelpOptionGroups(rawGroups: unknown): CommandReferenceHelpSections['commonOptions'] {
  if (!Array.isArray(rawGroups)) return undefined

  const groups = rawGroups.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') return []

    const record = entry as Record<string, unknown>
    const title =
      typeof record.title === 'string' && record.title.trim()
        ? record.title.trim()
        : `Options ${index + 1}`
    const rows = coerceReferenceHelpRows(record.rows)
    if (!rows?.length) return []

    return [{ title, rows }]
  })

  return groups.length > 0 ? groups : undefined
}

function coerceReferenceHelpExamples(rawExamples: unknown): CommandReferenceHelpSections['examples'] {
  if (!Array.isArray(rawExamples)) return undefined

  const examples = rawExamples.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []

    const record = entry as Record<string, unknown>
    const command = typeof record.command === 'string' ? record.command.trim() : ''
    const description = typeof record.description === 'string' ? record.description.trim() : ''
    if (!command || !description) return []

    return [{ command, description }]
  })

  return examples.length > 0 ? examples : undefined
}

function coerceStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined

  const items = value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
  return items.length > 0 ? items.map((entry) => entry.trim()) : undefined
}

export function coerceGeneratedCommandValues(
  command: CommandDefinition,
  rawValues: unknown
): Record<string, unknown> {
  if (!rawValues || typeof rawValues !== 'object') {
    return {}
  }

  const values = rawValues as Record<string, unknown>
  const nextValues: Record<string, unknown> = {}

  for (const option of command.options ?? []) {
    const rawValue = values[option.id]
    if (rawValue === undefined || rawValue === null || rawValue === '') continue

    switch (option.type) {
      case 'boolean': {
        const value = coerceBoolean(rawValue)
        if (value !== null) nextValues[option.id] = value
        break
      }
      case 'number': {
        const value = coerceNumber(rawValue)
        if (value !== null) nextValues[option.id] = value
        break
      }
      case 'enum': {
        if (
          typeof rawValue === 'string' &&
          option.choices?.some((choice) => choice.value === rawValue)
        ) {
          nextValues[option.id] = rawValue
        }
        break
      }
      case 'multi-select': {
        const allowed = new Set(option.choices?.map((choice) => choice.value) ?? [])
        const selected = coerceStringArray(rawValue).filter((entry) => allowed.has(entry))
        if (selected.length > 0) nextValues[option.id] = selected
        break
      }
      case 'repeatable': {
        const entries = coerceStringArray(rawValue)
        if (entries.length > 0) nextValues[option.id] = entries
        break
      }
      case 'string':
      case 'file-path':
      case 'directory-path': {
        if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
          nextValues[option.id] = rawValue
        }
        break
      }
      default:
        break
    }
  }

  for (const arg of command.positionalArgs ?? []) {
    const rawValue = values[arg.id]
    if (rawValue === undefined || rawValue === null || rawValue === '') continue

    if (arg.variadic) {
      const entries = coerceStringArray(rawValue)
      if (entries.length > 0) nextValues[arg.id] = entries
      continue
    }

    if (arg.type === 'enum') {
      if (
        typeof rawValue === 'string' &&
        arg.choices?.some((choice) => choice.value === rawValue)
      ) {
        nextValues[arg.id] = rawValue
      }
      continue
    }

    if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
      nextValues[arg.id] = rawValue
    }
  }

  return nextValues
}

export function parseCommandGenerationResponse(
  command: CommandDefinition,
  content: string
): AICommandGenerationResponse['suggestion'] {
  let payload: unknown

  try {
    payload = JSON.parse(extractJsonText(content))
  } catch {
    try {
      payload = JSON.parse(normalizeJsonLikeText(extractJsonText(content)))
    } catch {
      return buildCommandGenerationFallback(content)
    }
  }

  const record = payload as {
    summary?: unknown
    warnings?: unknown
    values?: unknown
  }

  return {
    summary:
      typeof record.summary === 'string' && record.summary.trim().length > 0
        ? record.summary.trim()
        : 'AI generated a command suggestion.',
    warnings: Array.isArray(record.warnings)
      ? record.warnings.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      : [],
    values: coerceGeneratedCommandValues(command, record.values)
  }
}

export function parseCommandTreeGenerationResponse(
  command: CommandDefinition,
  content: string
): AICommandTreeGenerationResponse['suggestion'] {
  let payload: unknown

  try {
    payload = JSON.parse(extractJsonText(content))
  } catch {
    try {
      payload = JSON.parse(normalizeJsonLikeText(extractJsonText(content)))
    } catch {
      return {
        rootDescription: command.description || `${command.executable} Command Tree Root`,
        warnings: ['AI response could not be converted into a command tree automatically.'],
        rootOptions: command.options,
        rootPositionalArgs: command.positionalArgs,
        subcommands: []
      }
    }
  }

  const record = payload as Record<string, unknown>
  const rawSubcommands = Array.isArray(record.subcommands) ? record.subcommands : []

  return {
    rootDescription:
      typeof record.rootDescription === 'string' && record.rootDescription.trim().length > 0
        ? record.rootDescription.trim()
        : command.description || `${command.executable} Command Tree Root`,
    warnings: Array.isArray(record.warnings)
      ? record.warnings.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      : [],
    rootOptions: coerceCommandOptions(record.rootOptions),
    rootPositionalArgs: coercePositionalArgs(record.rootPositionalArgs),
    subcommands: rawSubcommands.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return []
      const subcommand = entry as Record<string, unknown>
      const name = typeof subcommand.name === 'string' ? subcommand.name.trim() : ''
      if (!name) return []

      return [{
        name,
        description:
          typeof subcommand.description === 'string' && subcommand.description.trim().length > 0
            ? subcommand.description.trim()
            : `${command.executable} ${name}`,
        options: coerceCommandOptions(subcommand.options),
        positionalArgs: coercePositionalArgs(subcommand.positionalArgs)
      }]
    })
  }
}

function renderStructuredCommandHelpContent(
  suggestion: AICommandHelpResponse['suggestion']
): string {
  const parts: string[] = []

  parts.push('Overview')
  parts.push(suggestion.overview)

  if (suggestion.commonOptions?.length) {
    parts.push('', 'Common Options')
    for (const group of suggestion.commonOptions) {
      parts.push('', group.title)
      for (const row of group.rows) {
        const platformSuffix = row.platform ? ` (${row.platform})` : ''
        parts.push(`- ${row.label}${platformSuffix}: ${row.description}`)
      }
    }
  }

  if (suggestion.arguments?.length) {
    parts.push('', 'Arguments')
    for (const row of suggestion.arguments) {
      const requiredSuffix = row.required ? ' [required]' : ''
      parts.push(`- ${row.label}${requiredSuffix}: ${row.description}`)
    }
  }

  if (suggestion.examples?.length) {
    parts.push('', 'Examples')
    for (const example of suggestion.examples) {
      parts.push(`${example.command}  # ${example.description}`)
    }
  }

  if (suggestion.platformNotes?.length) {
    parts.push('', 'Platform Notes')
    for (const note of suggestion.platformNotes) {
      parts.push(`- ${note}`)
    }
  }

  if (suggestion.cautions?.length) {
    parts.push('', 'Cautions')
    for (const caution of suggestion.cautions) {
      parts.push(`- ${caution}`)
    }
  }

  return parts.join('\n')
}

export function parseCommandHelpResponse(
  command: CommandDefinition,
  content: string
): AICommandHelpResponse['suggestion'] {
  let payload: unknown

  try {
    payload = JSON.parse(extractJsonText(content))
  } catch {
    try {
      payload = JSON.parse(normalizeJsonLikeText(extractJsonText(content)))
    } catch {
      return {
        overview:
          sanitizeAIText(content).split(/\n{2,}/).map((entry) => entry.trim()).find(Boolean) ??
          `${command.executable} command-line help.`,
        commonOptions: undefined,
        arguments: undefined,
        examples: undefined,
        platformNotes: undefined,
        cautions: ['AI help was saved as free-form text because it could not be converted into the structured help format automatically.']
      }
    }
  }

  const record = payload as Record<string, unknown>
  const overview =
    typeof record.overview === 'string' && record.overview.trim().length > 0
      ? record.overview.trim()
      : `${command.executable} command-line help.`

  return {
    overview,
    commonOptions: coerceReferenceHelpOptionGroups(record.commonOptions),
    arguments: coerceReferenceHelpRows(record.arguments),
    examples: coerceReferenceHelpExamples(record.examples),
    platformNotes: coerceStringList(record.platformNotes),
    cautions: coerceStringList(record.cautions)
  }
}

export function extractOpenAIText(payload: unknown): string {
  if (
    payload &&
    typeof payload === 'object' &&
    'output_text' in payload &&
    typeof payload.output_text === 'string' &&
    payload.output_text.trim()
  ) {
    return payload.output_text.trim()
  }

  const output = (payload as { output?: Array<{ content?: Array<{ text?: string }> }> })?.output
  const text = output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text?.trim())
    .find(Boolean)

  if (text) return text
  throw new Error('OpenAI response did not include any text output')
}

export function extractAnthropicText(payload: unknown): string {
  const content = (payload as { content?: Array<{ type?: string; text?: string }> })?.content
  const text = content
    ?.filter((item) => item.type === 'text')
    .map((item) => item.text?.trim())
    .find(Boolean)

  if (text) return text
  throw new Error('Anthropic response did not include any text output')
}

export function extractOllamaText(payload: unknown): string {
  const text = (payload as { message?: { content?: string } })?.message?.content?.trim()
  if (text) return text
  throw new Error('Ollama response did not include any text output')
}

export function extractChatCompletionsText(payload: unknown): string {
  const text = (payload as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content?.trim()
  if (text) return text
  throw new Error('Provider response did not include any text output')
}

export function extractGeminiText(payload: unknown): string {
  const text = (payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  })?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text?.trim())
    .find(Boolean)

  if (text) return text
  throw new Error('Gemini response did not include any text output')
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const body = await response.text()
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 300)}`)
  }

  try {
    return JSON.parse(body)
  } catch {
    throw new Error('AI provider returned invalid JSON')
  }
}

async function runOpenAIAction(
  provider: AIProvider,
  model: string,
  prompt: { instructions: string; input: string }
): Promise<string> {
  if (!provider.apiKey) throw new Error('Active OpenAI provider is missing an API key')

  const response = await fetch(`${provider.baseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      instructions: prompt.instructions,
      input: prompt.input
    })
  })

  return extractOpenAIText(await parseJsonResponse(response))
}

async function runAnthropicAction(
  provider: AIProvider,
  model: string,
  prompt: { instructions: string; input: string }
): Promise<string> {
  if (!provider.apiKey) throw new Error('Active Anthropic provider is missing an API key')

  const response = await fetch(`${provider.baseUrl}/v1/messages`, {
    method: 'POST',
        headers: {
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
      model,
      max_tokens: 600,
      system: prompt.instructions,
      messages: [{ role: 'user', content: prompt.input }]
    })
  })

  return extractAnthropicText(await parseJsonResponse(response))
}

async function runOllamaAction(
  provider: AIProvider,
  model: string,
  prompt: { instructions: string; input: string }
): Promise<string> {
  const response = await fetch(`${provider.baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: prompt.instructions },
        { role: 'user', content: prompt.input }
      ]
    })
  })

  return extractOllamaText(await parseJsonResponse(response))
}

async function runGeminiAction(
  provider: AIProvider,
  model: string,
  prompt: { instructions: string; input: string }
): Promise<string> {
  if (!provider.apiKey) throw new Error('Active Gemini provider is missing an API key')

  const response = await fetch(
    `${provider.baseUrl}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': provider.apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: prompt.instructions }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt.input }]
          }
        ]
      })
    }
  )

  return extractGeminiText(await parseJsonResponse(response))
}

async function runOpenAICompatibleAction(
  provider: AIProvider,
  model: string,
  prompt: { instructions: string; input: string }
): Promise<string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json'
  }
  if (provider.apiKey.trim()) {
    headers.Authorization = `Bearer ${provider.apiKey}`
  }

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: prompt.instructions },
        { role: 'user', content: prompt.input }
      ],
      stream: false
    })
  })

  return extractChatCompletionsText(await parseJsonResponse(response))
}

function getProviderModelCandidates(provider: AIProvider): string[] {
  return [
    provider.model,
    ...(provider.fallbackModels ?? [])
  ].filter((model, index, items): model is string => Boolean(model?.trim()) && items.indexOf(model) === index)
}

function getRoutingCandidates(
  settings: Awaited<ReturnType<typeof getSettings>>
): Array<{ provider: AIProvider; model: string }> {
  const enabledProviders = settings.aiProviders.filter((provider) => provider.enabled)
  const enabledById = new Map(enabledProviders.map((provider) => [provider.id, provider]))

  const normalizeRoutingTarget = (target: AIRoutingTarget | null): { provider: AIProvider; model: string } | null => {
    if (!target) return null
    const provider = enabledById.get(target.providerId)
    const model = target.model.trim()
    if (!provider || !model) return null
    return { provider, model }
  }

  const explicitTargets = [
    normalizeRoutingTarget(settings.aiRouting.primary),
    ...settings.aiRouting.fallbacks.map((target) => normalizeRoutingTarget(target))
  ].filter((entry): entry is { provider: AIProvider; model: string } => Boolean(entry))

  if (explicitTargets.length > 0) {
    const deduped = new Map<string, { provider: AIProvider; model: string }>()
    for (const target of explicitTargets) {
      deduped.set(`${target.provider.id}:${target.model}`, target)
    }
    return [...deduped.values()]
  }

  const legacyProvider = settings.aiProviders.find((entry) => entry.id === settings.activeAIProvider && entry.enabled)
  if (legacyProvider) {
    return getProviderModelCandidates(legacyProvider).map((model) => ({
      provider: legacyProvider,
      model
    }))
  }

  return enabledProviders.flatMap((provider) =>
    getProviderModelCandidates(provider).map((model) => ({
      provider,
      model
    }))
  )
}

export async function runAIAction(request: AIActionRequest): Promise<AIActionResponse> {
  const settings = await getSettings()
  const routingCandidates = getRoutingCandidates(settings)

  if (routingCandidates.length === 0) {
    throw new Error('Connect an AI provider and choose a primary model in Settings before using AI actions')
  }

  let prompt: { instructions: string; input: string }

  switch (request.action) {
    case 'command-generation':
      prompt = buildCommandGenerationPrompt(request)
      break
    case 'command-tree-generation':
      prompt = buildCommandTreeGenerationPrompt(request)
      break
    case 'command-help':
      prompt = buildCommandHelpPrompt(request)
      break
    case 'command-explain':
      prompt = buildCommandExplainPrompt(request)
      break
    case 'command-review':
      prompt = buildCommandReviewPrompt(request)
      break
    case 'output-review':
      prompt = buildOutputReviewPrompt(request)
      break
    case 'artifact-improvement':
      prompt = buildArtifactImprovementPrompt(request)
      break
    case 'chat-followup':
      prompt = buildChatFollowUpPrompt(request)
      break
    default:
      throw new Error(`Unsupported AI action: ${(request as { action?: string }).action ?? 'unknown'}`)
  }

  prompt = withLocaleInstruction(prompt, settings)

  let content: string | null = null
  let resolvedModel = routingCandidates[0].model
  let resolvedProvider = routingCandidates[0].provider
  let lastError: Error | null = null

  for (const candidate of routingCandidates) {
    try {
      switch (candidate.provider.id) {
        case 'openai':
          content = await runOpenAIAction(candidate.provider, candidate.model, prompt)
          resolvedModel = candidate.model
          resolvedProvider = candidate.provider
          lastError = null
          break
        case 'anthropic':
          content = await runAnthropicAction(candidate.provider, candidate.model, prompt)
          resolvedModel = candidate.model
          resolvedProvider = candidate.provider
          lastError = null
          break
        case 'ollama':
          content = await runOllamaAction(candidate.provider, candidate.model, prompt)
          resolvedModel = candidate.model
          resolvedProvider = candidate.provider
          lastError = null
          break
        case 'gemini':
          content = await runGeminiAction(candidate.provider, candidate.model, prompt)
          resolvedModel = candidate.model
          resolvedProvider = candidate.provider
          lastError = null
          break
        default:
          if (OPENAI_COMPATIBLE_PROVIDER_IDS.has(candidate.provider.id)) {
            content = await runOpenAICompatibleAction(candidate.provider, candidate.model, prompt)
            resolvedModel = candidate.model
            resolvedProvider = candidate.provider
            lastError = null
          }
          break
      }

      if (content) {
        break
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  if (!content) {
    throw lastError ?? new Error('AI provider returned an empty response')
  }

  content = sanitizeAIText(content)

  if (request.action === 'command-generation') {
    const suggestion = parseCommandGenerationResponse(request.command, content)
    return {
      action: request.action,
      providerId: resolvedProvider.id,
      providerLabel: resolvedProvider.label,
      model: resolvedModel,
      content: [suggestion.summary, suggestion.warnings.length > 0 ? `Warnings: ${suggestion.warnings.join(' ')}` : null]
        .filter(Boolean)
        .join('\n\n'),
      suggestion
    }
  }

  if (request.action === 'command-help') {
    const suggestion = parseCommandHelpResponse(request.command, content)
    return {
      action: request.action,
      providerId: resolvedProvider.id,
      providerLabel: resolvedProvider.label,
      model: resolvedModel,
      content: renderStructuredCommandHelpContent(suggestion),
      suggestion
    }
  }

  if (request.action === 'command-tree-generation') {
    const suggestion = parseCommandTreeGenerationResponse(request.command, content)
    return {
      action: request.action,
      providerId: resolvedProvider.id,
      providerLabel: resolvedProvider.label,
      model: resolvedModel,
      content: [
        suggestion.rootDescription,
        suggestion.warnings.length > 0 ? `Warnings: ${suggestion.warnings.join(' ')}` : null,
        suggestion.subcommands.length > 0
          ? `Generated ${suggestion.subcommands.length} top-level subcommand${suggestion.subcommands.length === 1 ? '' : 's'}.`
          : 'No top-level subcommands were generated.'
      ]
        .filter(Boolean)
        .join('\n\n'),
      suggestion
    }
  }

  if (request.action === 'command-explain') {
    content = normalizeCommandExplainContent(request, content)
  }

  return {
    action: request.action,
    providerId: resolvedProvider.id,
    providerLabel: resolvedProvider.label,
    model: resolvedModel,
    content
  }
}
