import type { AIResponseLocalePreference, LocalePreference } from './locale-schema'
import {
  DEFAULT_AI_RESPONSE_LOCALE,
  DEFAULT_FORMAT_LOCALE,
  DEFAULT_UI_LOCALE
} from './locale-schema'

export type Theme = 'void' | 'ember' | 'dusk' | 'forest' | 'chalk' | 'mist' | 'sand' | 'stone'
export type TerminalInputMode = 'classic' | 'editor'
export type AIProviderConnectionType = 'api-key' | 'local'

export interface AIProvider {
  id:
    | 'openai'
    | 'anthropic'
    | 'gemini'
    | 'openrouter'
    | 'groq'
    | 'mistral'
    | 'together'
    | 'fireworks'
    | 'xai'
    | 'deepseek'
    | 'openai-compatible'
    | 'ollama'
    | 'lmstudio'
  label: string
  apiKey: string
  baseUrl: string
  model: string
  fallbackModels: string[]
  connectionType: AIProviderConnectionType
  enabled: boolean
}

export interface AIRoutingTarget {
  providerId: AIProvider['id']
  model: string
}

export interface AppSettings {
  activeAIProvider: string | null
  aiProviders: AIProvider[]
  aiRouting: {
    primary: AIRoutingTarget | null
    fallbacks: AIRoutingTarget[]
  }
  theme: Theme
  showHelpTooltips: boolean
  terminalInputMode: TerminalInputMode
  safePasteMode: boolean
  saveTerminalLogs: boolean
  /** Custom log storage directory. Empty string = use default userData/logs path */
  logDirectory: string
  /** Command tree roots hidden from the catalog UI */
  hiddenCommandExecutables: string[]
  /** Automatically check the configured release feed when the app starts */
  checkForUpdatesOnStartup: boolean
  /** Dev-only override for the app update feed. Empty string = built-in feed. */
  devUpdateFeedUrl: string
  /** Optional directory where manual app-data backups are written */
  backupDirectory: string
  /** Timestamp of the last successful manual backup */
  lastBackupAt: string | null
  /** User-defined order of sidebar tabs */
  sidebarTabOrder: string[]
  /** What to show on app startup: 'dashboard' or 'last-project' (auto-open last used) */
  startupBehavior: 'dashboard' | 'last-project'
  /** Custom data directory. Empty string = use default Electron userData path */
  customDataDirectory: string
  /** UI language. "system" follows the OS/browser preference. */
  uiLocale: LocalePreference
  /** Locale used for date, time, number, and sort formatting. */
  formatLocale: LocalePreference
  /** Language requested for AI prose responses. Commands and code stay literal. */
  aiResponseLocale: AIResponseLocalePreference
}

export const DEFAULT_SETTINGS: AppSettings = {
  activeAIProvider: null,
  aiRouting: {
    primary: null,
    fallbacks: []
  },
  theme: 'void',
  showHelpTooltips: true,
  terminalInputMode: 'editor',
  safePasteMode: true,
  saveTerminalLogs: true,
  logDirectory: '',
  hiddenCommandExecutables: [],
  checkForUpdatesOnStartup: true,
  devUpdateFeedUrl: '',
  backupDirectory: '',
  lastBackupAt: null,
  sidebarTabOrder: ['scripts', 'commands', 'snippets', 'files', 'logs'],
  startupBehavior: 'dashboard',
  customDataDirectory: '',
  uiLocale: DEFAULT_UI_LOCALE,
  formatLocale: DEFAULT_FORMAT_LOCALE,
  aiResponseLocale: DEFAULT_AI_RESPONSE_LOCALE,
  aiProviders: [
    {
      id: 'openai',
      label: 'OpenAI',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      fallbackModels: [],
      connectionType: 'api-key',
      enabled: false
    },
    {
      id: 'anthropic',
      label: 'Anthropic',
      apiKey: '',
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-sonnet-4-20250514',
      fallbackModels: [],
      connectionType: 'api-key',
      enabled: false
    },
    {
      id: 'gemini',
      label: 'Google Gemini',
      apiKey: '',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.5-pro',
      fallbackModels: [],
      connectionType: 'api-key',
      enabled: false
    },
    {
      id: 'openrouter',
      label: 'OpenRouter',
      apiKey: '',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'openai/gpt-4o-mini',
      fallbackModels: [],
      connectionType: 'api-key',
      enabled: false
    },
    {
      id: 'groq',
      label: 'Groq',
      apiKey: '',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile',
      fallbackModels: [],
      connectionType: 'api-key',
      enabled: false
    },
    {
      id: 'mistral',
      label: 'Mistral',
      apiKey: '',
      baseUrl: 'https://api.mistral.ai/v1',
      model: 'mistral-large-latest',
      fallbackModels: [],
      connectionType: 'api-key',
      enabled: false
    },
    {
      id: 'together',
      label: 'Together.ai',
      apiKey: '',
      baseUrl: 'https://api.together.xyz/v1',
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      fallbackModels: [],
      connectionType: 'api-key',
      enabled: false
    },
    {
      id: 'fireworks',
      label: 'Fireworks.ai',
      apiKey: '',
      baseUrl: 'https://api.fireworks.ai/inference/v1',
      model: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
      fallbackModels: [],
      connectionType: 'api-key',
      enabled: false
    },
    {
      id: 'xai',
      label: 'xAI (Grok)',
      apiKey: '',
      baseUrl: 'https://api.x.ai/v1',
      model: 'grok-3-mini',
      fallbackModels: [],
      connectionType: 'api-key',
      enabled: false
    },
    {
      id: 'deepseek',
      label: 'DeepSeek',
      apiKey: '',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      fallbackModels: [],
      connectionType: 'api-key',
      enabled: false
    },
    {
      id: 'openai-compatible',
      label: 'OpenAI-Compatible',
      apiKey: '',
      baseUrl: 'http://localhost:4000/v1',
      model: 'model-name',
      fallbackModels: [],
      connectionType: 'api-key',
      enabled: false
    },
    {
      id: 'ollama',
      label: 'Ollama (Local)',
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      model: 'llama3',
      fallbackModels: [],
      connectionType: 'local',
      enabled: false
    },
    {
      id: 'lmstudio',
      label: 'LM Studio (Local)',
      apiKey: '',
      baseUrl: 'http://127.0.0.1:1234/v1',
      model: 'local-model',
      fallbackModels: [],
      connectionType: 'local',
      enabled: false
    }
  ]
}
