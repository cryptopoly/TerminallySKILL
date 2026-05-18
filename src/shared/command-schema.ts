import type { SupportedLocale } from './locale-schema'

export interface CommandDefinition {
  id: string
  name: string
  executable: string
  subcommands?: string[]
  description: string
  category: string
  tags?: string[]
  platforms?: ('darwin' | 'linux' | 'win32')[]
  dangerLevel?: 'safe' | 'caution' | 'destructive'
  docsUrl?: string
  options?: CommandOption[]
  positionalArgs?: PositionalArgument[]
  exclusiveGroups?: ExclusiveGroup[]
  examples?: CommandExample[]
  source?: 'builtin' | 'detected' | 'manual'
  installed?: boolean
  enriched?: boolean
  presetValues?: Record<string, unknown>
  referenceHelp?: CommandReferenceHelp
}

export interface CommandReferenceHelp {
  source: 'ai'
  content: string
  generatedAt: string
  providerLabel?: string
  model?: string
  locale?: SupportedLocale
  format?: 'legacy-text' | 'structured-v1'
  sections?: CommandReferenceHelpSections
}

export interface CommandReferenceHelpSections {
  overview?: string
  commonOptions?: CommandReferenceHelpOptionGroup[]
  arguments?: CommandReferenceHelpRow[]
  examples?: CommandReferenceHelpExample[]
  platformNotes?: string[]
  cautions?: string[]
}

export interface CommandReferenceHelpOptionGroup {
  title: string
  rows: CommandReferenceHelpRow[]
}

export interface CommandReferenceHelpRow {
  label: string
  description: string
  platform?: string
  required?: boolean
}

export interface CommandReferenceHelpExample {
  command: string
  description: string
}

export interface DiscoveredCommand {
  executable: string
  path: string
  source: 'detected' | 'manual'
  enriched: boolean
  addedAt: string
  category?: string
}

export interface DiscoveredCommandsData {
  commands: DiscoveredCommand[]
}

export interface CommandOption {
  id: string
  long?: string
  short?: string
  label: string
  description?: string
  type: OptionType
  defaultValue?: unknown
  required?: boolean
  showWhen?: Condition
  validation?: ValidationRules
  choices?: EnumChoice[]
  repeatable?: boolean
  separator?: 'space' | 'equals' | 'none'
  group?: string
  order?: number
}

export type OptionType =
  | 'boolean'
  | 'string'
  | 'number'
  | 'enum'
  | 'multi-select'
  | 'file-path'
  | 'directory-path'
  | 'repeatable'
  | 'key-value'

export interface PositionalArgument {
  id: string
  label: string
  description?: string
  type: 'string' | 'file-path' | 'directory-path' | 'enum'
  required?: boolean
  defaultValue?: string
  choices?: EnumChoice[]
  validation?: ValidationRules
  variadic?: boolean
  position: number
}

export interface EnumChoice {
  value: string
  label: string
  description?: string
}

export interface ExclusiveGroup {
  label: string
  optionIds: string[]
  required?: boolean
}

export interface Condition {
  optionId: string
  operator: 'equals' | 'notEquals' | 'isSet' | 'isNotSet' | 'greaterThan' | 'lessThan' | 'contains'
  value?: unknown
  and?: Condition[]
  or?: Condition[]
}

export interface ValidationRules {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  message?: string
}

export interface CommandExample {
  label: string
  values: Record<string, unknown>
}

/**
 * Result from parsing a subcommand's --help output
 */
export interface ParsedSubcommand {
  /** Subcommand name (e.g., "agent" or "cron") */
  name: string
  /** Full subcommand chain (e.g., ["cron", "add"]) */
  chain: string[]
  /** Description from help output */
  description: string
  /** Parsed options */
  options?: CommandOption[]
  /** Parsed positional arguments */
  positionalArgs?: PositionalArgument[]
}

/**
 * Full result from parsing a command's --help output, including subcommands
 */
export interface ParsedHelpResult {
  /** Description of the root command */
  description: string
  /** Top-level options */
  options?: CommandOption[]
  /** Top-level positional arguments */
  positionalArgs?: PositionalArgument[]
  /** Discovered subcommands with their own options */
  subcommands: ParsedSubcommand[]
}
