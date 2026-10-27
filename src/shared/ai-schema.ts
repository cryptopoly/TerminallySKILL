import type {
  CommandDefinition,
  CommandOption,
  PositionalArgument,
  CommandReferenceHelpSections
} from './command-schema'

export interface AICommandReviewRequest {
  action: 'command-review'
  commandName: string
  commandString: string
  commandDescription?: string
}

export interface AICommandExplainRequest {
  action: 'command-explain'
  commandName: string
  commandString: string
  commandDescription?: string
}

export interface AICommandHelpRequest {
  action: 'command-help'
  command: CommandDefinition
  cwd?: string
}

export interface AICommandGenerationRequest {
  action: 'command-generation'
  prompt: string
  command: CommandDefinition
  currentValues?: Record<string, unknown>
  cwd?: string
}

export interface AICommandTreeGenerationRequest {
  action: 'command-tree-generation'
  command: CommandDefinition
  knownSubcommands?: Array<{
    name: string
    description?: string
  }>
  cwd?: string
}

export interface AIOutputReviewRequest {
  action: 'output-review'
  source: 'terminal' | 'log'
  focus?: 'session' | 'command-block'
  title: string
  transcript: string
  cwd?: string
  shell?: string
  exitCode?: number | null
}

export interface AIArtifactImprovementRequest {
  action: 'artifact-improvement'
  artifactType: 'script' | 'snippet'
  title: string
  description?: string
  content: string
}

export interface AIChatFollowUpRequest {
  action: 'chat-followup'
  /** The original content being discussed (terminal output, command, log text, etc.) */
  context: string
  /** The full conversation so far (initial review + follow-ups) */
  conversation: string
  /** The user's latest question */
  question: string
}

export type AIActionRequest =
  | AICommandGenerationRequest
  | AICommandTreeGenerationRequest
  | AICommandReviewRequest
  | AICommandExplainRequest
  | AICommandHelpRequest
  | AIOutputReviewRequest
  | AIArtifactImprovementRequest
  | AIChatFollowUpRequest

interface AIActionResponseBase {
  action: AIActionRequest['action']
  providerId: string
  providerLabel: string
  model: string
}

export interface AINarrativeActionResponse extends AIActionResponseBase {
  action: Exclude<AIActionRequest['action'], 'command-generation' | 'command-tree-generation' | 'command-help'>
  content: string
  /** Output reviews of a failed command: single-line fixes extracted from the answer, never auto-run */
  suggestedCommands?: string[]
}

export interface AICommandGenerationSuggestion {
  summary: string
  warnings: string[]
  values: Record<string, unknown>
}

export interface AICommandGenerationResponse extends AIActionResponseBase {
  action: 'command-generation'
  content: string
  suggestion: AICommandGenerationSuggestion
}

export interface AICommandHelpSuggestion extends CommandReferenceHelpSections {
  overview: string
}

export interface AICommandHelpResponse extends AIActionResponseBase {
  action: 'command-help'
  content: string
  suggestion: AICommandHelpSuggestion
}

export interface AICommandTreeSubcommandSuggestion {
  name: string
  description: string
  options?: CommandOption[]
  positionalArgs?: PositionalArgument[]
}

export interface AICommandTreeGenerationSuggestion {
  rootDescription: string
  warnings: string[]
  rootOptions?: CommandOption[]
  rootPositionalArgs?: PositionalArgument[]
  subcommands: AICommandTreeSubcommandSuggestion[]
}

export interface AICommandTreeGenerationResponse extends AIActionResponseBase {
  action: 'command-tree-generation'
  content: string
  suggestion: AICommandTreeGenerationSuggestion
}

export type AIActionResponse =
  | AINarrativeActionResponse
  | AICommandHelpResponse
  | AICommandGenerationResponse
  | AICommandTreeGenerationResponse
