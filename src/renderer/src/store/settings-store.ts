import { create } from 'zustand'
import type {
  AppSettings,
  AIProvider,
  TerminalInputMode,
  Theme
} from '../../../shared/settings-schema'
import { DEFAULT_SETTINGS } from '../../../shared/settings-schema'
import type { AIResponseLocalePreference, LocalePreference } from '../../../shared/locale-schema'

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

interface SettingsStore {
  settings: AppSettings
  settingsHydrated: boolean
  setSettings: (settings: AppSettings) => void
  updateProvider: (providerId: string, updates: Partial<AIProvider>) => void
  setActiveProvider: (providerId: string | null) => void
  setTheme: (theme: Theme) => void
  setShowHelpTooltips: (show: boolean) => void
  setTerminalInputMode: (mode: TerminalInputMode) => void
  setSafePasteMode: (enabled: boolean) => void
  setSaveTerminalLogs: (save: boolean) => void
  setLogDirectory: (dir: string) => void
  setHiddenCommandExecutables: (executables: string[]) => void
  setCheckForUpdatesOnStartup: (enabled: boolean) => void
  setDevUpdateFeedUrl: (url: string) => void
  setBackupDirectory: (dir: string) => void
  setLastBackupAt: (timestamp: string | null) => void
  setUiLocale: (locale: LocalePreference) => void
  setFormatLocale: (locale: LocalePreference) => void
  setAIResponseLocale: (locale: AIResponseLocalePreference) => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: structuredClone(DEFAULT_SETTINGS),
  settingsHydrated: false,
  setSettings: (settings) => {
    applyTheme(settings.theme ?? 'void')
    set({ settings, settingsHydrated: true })
  },
  updateProvider: (providerId, updates) =>
    set((state) => ({
      settings: {
        ...state.settings,
        aiProviders: state.settings.aiProviders.map((p) =>
          p.id === providerId ? { ...p, ...updates } : p
        )
      }
    })),
  setActiveProvider: (providerId) =>
    set((state) => ({
      settings: { ...state.settings, activeAIProvider: providerId }
    })),
  setTheme: (theme) => {
    applyTheme(theme)
    set((state) => ({ settings: { ...state.settings, theme } }))
  },
  setShowHelpTooltips: (show) =>
    set((state) => ({ settings: { ...state.settings, showHelpTooltips: show } })),
  setTerminalInputMode: (mode) =>
    set((state) => ({ settings: { ...state.settings, terminalInputMode: mode } })),
  setSafePasteMode: (enabled) =>
    set((state) => ({ settings: { ...state.settings, safePasteMode: enabled } })),
  setSaveTerminalLogs: (save) =>
    set((state) => ({ settings: { ...state.settings, saveTerminalLogs: save } })),
  setLogDirectory: (dir) =>
    set((state) => ({ settings: { ...state.settings, logDirectory: dir } })),
  setHiddenCommandExecutables: (executables) =>
    set((state) => ({ settings: { ...state.settings, hiddenCommandExecutables: executables } })),
  setCheckForUpdatesOnStartup: (enabled) =>
    set((state) => ({ settings: { ...state.settings, checkForUpdatesOnStartup: enabled } })),
  setDevUpdateFeedUrl: (url) =>
    set((state) => ({ settings: { ...state.settings, devUpdateFeedUrl: url } })),
  setBackupDirectory: (dir) =>
    set((state) => ({ settings: { ...state.settings, backupDirectory: dir } })),
  setLastBackupAt: (timestamp) =>
    set((state) => ({ settings: { ...state.settings, lastBackupAt: timestamp } })),
  setUiLocale: (locale) =>
    set((state) => ({ settings: { ...state.settings, uiLocale: locale } })),
  setFormatLocale: (locale) =>
    set((state) => ({ settings: { ...state.settings, formatLocale: locale } })),
  setAIResponseLocale: (locale) =>
    set((state) => ({ settings: { ...state.settings, aiResponseLocale: locale } }))
}))
