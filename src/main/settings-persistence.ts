import type { AppSettings, AIProvider } from '../shared/settings-schema'
import { DEFAULT_SETTINGS } from '../shared/settings-schema'
import {
  normalizeAIResponseLocalePreference,
  normalizeLocalePreference
} from '../shared/locale-schema'

export function backfillSettings(raw: Partial<AppSettings>): AppSettings {
  const rawProviders = raw.aiProviders ?? []
  const validProviderIds = new Set(DEFAULT_SETTINGS.aiProviders.map((provider) => provider.id))
  const normalizeConnectionType = (
    connectionType: AIProvider['connectionType'] | 'oauth' | undefined,
    fallback: AIProvider['connectionType']
  ): AIProvider['connectionType'] => {
    if (connectionType === 'api-key' || connectionType === 'local') {
      return connectionType
    }
    return fallback
  }

  const providers: AIProvider[] = [
    ...DEFAULT_SETTINGS.aiProviders.map((defaultProvider) => {
      const existing = rawProviders.find((provider) => provider.id === defaultProvider.id)
      return {
        ...defaultProvider,
        ...existing,
        apiKey: existing?.apiKey ?? defaultProvider.apiKey ?? '',
        fallbackModels: Array.isArray(existing?.fallbackModels)
          ? existing!.fallbackModels.filter((model): model is string => typeof model === 'string')
          : defaultProvider.fallbackModels,
        connectionType: normalizeConnectionType(
          existing?.connectionType as AIProvider['connectionType'] | 'oauth' | undefined,
          defaultProvider.connectionType
        )
      }
    }),
    ...rawProviders
      .filter((provider) => !DEFAULT_SETTINGS.aiProviders.some((p) => p.id === provider.id))
      .map((provider) => ({
        ...provider,
        apiKey: provider.apiKey ?? '',
        fallbackModels: Array.isArray(provider.fallbackModels)
          ? provider.fallbackModels.filter((model): model is string => typeof model === 'string')
          : [],
        connectionType: normalizeConnectionType(
          provider.connectionType as AIProvider['connectionType'] | 'oauth' | undefined,
          'api-key'
        )
      }))
  ]

  const normalizeRoutingTarget = (
    target: { providerId?: string; model?: string } | null | undefined
  ): AppSettings['aiRouting']['primary'] => {
    if (!target?.providerId || !validProviderIds.has(target.providerId as AIProvider['id'])) {
      return null
    }
    const model = typeof target.model === 'string' ? target.model.trim() : ''
    return {
      providerId: target.providerId as AIProvider['id'],
      model
    }
  }

  const primary = normalizeRoutingTarget(raw.aiRouting?.primary)
  const fallbacks = Array.isArray(raw.aiRouting?.fallbacks)
    ? raw.aiRouting!.fallbacks
        .map((target) => normalizeRoutingTarget(target))
        .filter((target): target is NonNullable<typeof primary> => Boolean(target))
    : []

  return {
    activeAIProvider: raw.activeAIProvider ?? DEFAULT_SETTINGS.activeAIProvider,
    aiRouting: {
      primary,
      fallbacks
    },
    theme: raw.theme ?? DEFAULT_SETTINGS.theme,
    showHelpTooltips: raw.showHelpTooltips ?? DEFAULT_SETTINGS.showHelpTooltips,
    terminalInputMode: raw.terminalInputMode ?? DEFAULT_SETTINGS.terminalInputMode,
    safePasteMode: raw.safePasteMode ?? DEFAULT_SETTINGS.safePasteMode,
    saveTerminalLogs: raw.saveTerminalLogs ?? DEFAULT_SETTINGS.saveTerminalLogs,
    logDirectory: raw.logDirectory ?? DEFAULT_SETTINGS.logDirectory,
    hiddenCommandExecutables: Array.isArray(raw.hiddenCommandExecutables)
      ? raw.hiddenCommandExecutables.filter((value): value is string => typeof value === 'string')
      : DEFAULT_SETTINGS.hiddenCommandExecutables,
    checkForUpdatesOnStartup:
      raw.checkForUpdatesOnStartup ?? DEFAULT_SETTINGS.checkForUpdatesOnStartup,
    devUpdateFeedUrl:
      typeof raw.devUpdateFeedUrl === 'string'
        ? raw.devUpdateFeedUrl
        : DEFAULT_SETTINGS.devUpdateFeedUrl,
    backupDirectory:
      typeof raw.backupDirectory === 'string'
        ? raw.backupDirectory
        : DEFAULT_SETTINGS.backupDirectory,
    lastBackupAt:
      typeof raw.lastBackupAt === 'string' || raw.lastBackupAt === null
        ? raw.lastBackupAt
        : DEFAULT_SETTINGS.lastBackupAt,
    sidebarTabOrder:
      Array.isArray(raw.sidebarTabOrder)
        ? raw.sidebarTabOrder
        : DEFAULT_SETTINGS.sidebarTabOrder,
    customDataDirectory:
      typeof raw.customDataDirectory === 'string'
        ? raw.customDataDirectory
        : DEFAULT_SETTINGS.customDataDirectory,
    startupBehavior:
      raw.startupBehavior === 'last-project' ? 'last-project' : 'dashboard',
    uiLocale: normalizeLocalePreference(raw.uiLocale),
    formatLocale: normalizeLocalePreference(raw.formatLocale),
    aiResponseLocale: normalizeAIResponseLocalePreference(raw.aiResponseLocale),
    aiProviders: providers
  }
}

export function extractProviderApiKeys(settings: AppSettings): Record<string, string> {
  const apiKeys: Record<string, string> = {}

  for (const provider of settings.aiProviders) {
    if (!provider.apiKey.trim()) continue
    apiKeys[provider.id] = provider.apiKey
  }

  return apiKeys
}

export function stripProviderApiKeys(settings: AppSettings): AppSettings {
  return {
    ...settings,
    aiProviders: settings.aiProviders.map((provider) => ({
      ...provider,
      apiKey: ''
    }))
  }
}

export function applyProviderApiKeys(
  settings: AppSettings,
  apiKeys: Record<string, string>
): AppSettings {
  return {
    ...settings,
    aiProviders: settings.aiProviders.map((provider) => ({
      ...provider,
      apiKey: apiKeys[provider.id] ?? provider.apiKey ?? ''
    }))
  }
}
