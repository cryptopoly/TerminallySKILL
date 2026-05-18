import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../shared/settings-schema'
import {
  applyProviderApiKeys,
  backfillSettings,
  extractProviderApiKeys,
  stripProviderApiKeys
} from './settings-persistence'

describe('settings-persistence helpers', () => {
  it('backfills missing settings fields and providers', () => {
    const settings = backfillSettings({
      theme: 'chalk',
      aiProviders: [
        {
          id: 'openai',
          label: 'OpenAI',
          apiKey: 'sk-test',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-test',
          fallbackModels: ['gpt-fallback'],
          connectionType: 'api-key',
          enabled: true
        }
      ]
    })

    expect(settings.theme).toBe('chalk')
    expect(settings.aiRouting.primary).toBeNull()
    expect(settings.aiRouting.fallbacks).toEqual([])
    expect(settings.showHelpTooltips).toBe(true)
    expect(settings.terminalInputMode).toBe('editor')
    expect(settings.safePasteMode).toBe(true)
    expect(settings.saveTerminalLogs).toBe(true)
    expect(settings.logDirectory).toBe('')
    expect(settings.hiddenCommandExecutables).toEqual([])
    expect(settings.checkForUpdatesOnStartup).toBe(true)
    expect(settings.devUpdateFeedUrl).toBe('')
    expect(settings.backupDirectory).toBe('')
    expect(settings.lastBackupAt).toBeNull()
    expect(settings.uiLocale).toBe('system')
    expect(settings.formatLocale).toBe('system')
    expect(settings.aiResponseLocale).toBe('app')
    expect(settings.aiProviders).toHaveLength(DEFAULT_SETTINGS.aiProviders.length)
    expect(settings.aiProviders.find((provider) => provider.id === 'openai')?.apiKey).toBe('sk-test')
    expect(settings.aiProviders.find((provider) => provider.id === 'openai')?.fallbackModels).toEqual(['gpt-fallback'])
    expect(settings.aiProviders.find((provider) => provider.id === 'anthropic')?.apiKey).toBe('')
    expect(settings.aiProviders.find((provider) => provider.id === 'anthropic')?.connectionType).toBe('api-key')
  })

  it('strips and reapplies provider api keys without mutating other fields', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.activeAIProvider = 'openai'
    settings.aiRouting.primary = { providerId: 'openai', model: 'gpt-5' }
    settings.aiRouting.fallbacks = [{ providerId: 'gemini', model: 'gemini-2.5-flash' }]
    settings.safePasteMode = false
    settings.hiddenCommandExecutables = ['find']
    settings.checkForUpdatesOnStartup = false
    settings.devUpdateFeedUrl = 'http://localhost:9090'
    settings.backupDirectory = '/Users/dan/Library/Mobile Documents/com~apple~CloudDocs/TerminallySKILL Backups'
    settings.lastBackupAt = '2026-03-20T10:15:00.000Z'
    settings.uiLocale = 'de-DE'
    settings.formatLocale = 'en-GB'
    settings.aiResponseLocale = 'fr-FR'
    settings.aiProviders[0].apiKey = 'sk-openai'
    settings.aiProviders[0].fallbackModels = ['gpt-5-mini']
    settings.aiProviders[1].apiKey = 'sk-anthropic'

    const stripped = stripProviderApiKeys(settings)
    expect(stripped.aiProviders.every((provider) => provider.apiKey === '')).toBe(true)

    const restored = applyProviderApiKeys(stripped, {
      openai: 'sk-openai',
      anthropic: 'sk-anthropic'
    })

    expect(restored.activeAIProvider).toBe('openai')
    expect(restored.aiRouting.primary).toEqual({ providerId: 'openai', model: 'gpt-5' })
    expect(restored.aiRouting.fallbacks).toEqual([{ providerId: 'gemini', model: 'gemini-2.5-flash' }])
    expect(restored.safePasteMode).toBe(false)
    expect(restored.hiddenCommandExecutables).toEqual(['find'])
    expect(restored.checkForUpdatesOnStartup).toBe(false)
    expect(restored.devUpdateFeedUrl).toBe('http://localhost:9090')
    expect(restored.backupDirectory).toBe(
      '/Users/dan/Library/Mobile Documents/com~apple~CloudDocs/TerminallySKILL Backups'
    )
    expect(restored.lastBackupAt).toBe('2026-03-20T10:15:00.000Z')
    expect(restored.uiLocale).toBe('de-DE')
    expect(restored.formatLocale).toBe('en-GB')
    expect(restored.aiResponseLocale).toBe('fr-FR')
    expect(restored.aiProviders[0].apiKey).toBe('sk-openai')
    expect(restored.aiProviders[0].fallbackModels).toEqual(['gpt-5-mini'])
    expect(restored.aiProviders[1].apiKey).toBe('sk-anthropic')
  })

  it('extracts only non-empty api keys', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.aiProviders[0].apiKey = 'sk-live'
    settings.aiProviders[1].apiKey = ''

    expect(extractProviderApiKeys(settings)).toEqual({ openai: 'sk-live' })
  })
})
