import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  CheckCircle2,
  Cloud,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FolderOpen,
  HardDrive,
  AlertTriangle,
  HelpCircle,
  KeyRound,
  Languages,
  Loader2,
  Palette,
  Plus,
  RefreshCw,
  Server,
  Sparkles,
  X,
  XCircle,
  Zap
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { useCommandStore } from '../../store/command-store'
import { useSettingsStore } from '../../store/settings-store'
import { UpdateReleaseNotes } from '../ui/UpdateReleaseNotes'
import type {
  AIProvider,
  AIRoutingTarget,
  AIProviderConnectionType,
  TerminalInputMode,
  Theme
} from '../../../../shared/settings-schema'
import type { AppUpdateCheckResult } from '../../../../shared/update-schema'
import {
  LOCALE_METADATA,
  SUPPORTED_LOCALES,
  type AIResponseLocalePreference,
  type LocalePreference,
  type SupportedLocale
} from '../../../../shared/locale-schema'
import { syncI18nWithSettings } from '../../i18n'
import { formatDateTime } from '../../i18n/format'

const THEMES: { id: Theme; label: string; dot: string; desc: string; family: 'dark' | 'light' }[] = [
  { id: 'void', label: 'Void', dot: '#06b6d4', desc: 'Dark · Teal', family: 'dark' },
  { id: 'ember', label: 'Ember', dot: '#f59e0b', desc: 'Warm · Amber', family: 'dark' },
  { id: 'dusk', label: 'Dusk', dot: '#818cf8', desc: 'Mid · Indigo', family: 'dark' },
  { id: 'forest', label: 'Forest', dot: '#22c55e', desc: 'Dark · Pine', family: 'dark' },
  { id: 'chalk', label: 'Chalk', dot: '#c2410c', desc: 'Light · Copper', family: 'light' },
  { id: 'sand', label: 'Latte', dot: '#a0714a', desc: 'Light · Espresso', family: 'light' },
  { id: 'stone', label: 'Sage', dot: '#5f8654', desc: 'Light · Olive', family: 'light' },
  { id: 'mist', label: 'Mist', dot: '#0f766e', desc: 'Light · Slate', family: 'light' }
]

const TERMINAL_INPUT_MODES: { id: TerminalInputMode; label: string; desc: string }[] = [
  {
    id: 'classic',
    label: 'Classic',
    desc: 'Type directly into the live shell prompt'
  },
  {
    id: 'editor',
    label: 'Editor Prompt',
    desc: 'Use an editor-style command bar when the shell is ready'
  }
]

type SettingsTabId = 'general' | 'data' | 'ai' | 'logs' | 'appearance' | 'about'

type ProviderCatalogEntry = {
  id: AIProvider['id']
  label: string
  badge: string
  description: string
  glyph: string
  glyphTone: string
  connectionTypes: AIProviderConnectionType[]
  apiKeyUrl?: string
}

const SETTINGS_TABS: {
  id: SettingsTabId
  label: string
  icon: JSX.Element
}[] = [
  { id: 'general', label: 'General', icon: <HelpCircle size={13} /> },
  { id: 'data', label: 'Data', icon: <HardDrive size={13} /> },
  { id: 'ai', label: 'AI', icon: <Zap size={13} /> },
  { id: 'logs', label: 'Logs', icon: <FolderOpen size={13} /> },
  { id: 'appearance', label: 'Theme', icon: <Palette size={13} /> },
  { id: 'about', label: 'About', icon: <Sparkles size={13} /> }
]

const PROVIDER_CATALOG: Record<AIProvider['id'], ProviderCatalogEntry> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    badge: 'Cloud',
    description: 'OpenAI API',
    glyph: '◎',
    glyphTone: 'from-emerald-400/20 to-cyan-300/20 text-emerald-300',
    connectionTypes: ['api-key'],
    apiKeyUrl: 'https://platform.openai.com/api-keys'
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    badge: 'API',
    description: 'Claude models and local-safe review flows',
    glyph: 'A',
    glyphTone: 'from-amber-300/20 to-orange-300/20 text-amber-200',
    connectionTypes: ['api-key'],
    apiKeyUrl: 'https://console.anthropic.com/settings/keys'
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    badge: 'Cloud',
    description: 'Gemini API',
    glyph: 'G',
    glyphTone: 'from-yellow-300/20 via-orange-300/20 to-red-300/20 text-yellow-200',
    connectionTypes: ['api-key'],
    apiKeyUrl: 'https://aistudio.google.com/apikey'
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    badge: 'API',
    description: 'Multi-provider routing through one API key',
    glyph: 'OR',
    glyphTone: 'from-emerald-300/20 to-lime-300/20 text-emerald-200',
    connectionTypes: ['api-key'],
    apiKeyUrl: 'https://openrouter.ai/keys'
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    badge: 'API',
    description: 'Fast OpenAI-compatible inference',
    glyph: 'GQ',
    glyphTone: 'from-orange-300/20 to-red-300/20 text-orange-200',
    connectionTypes: ['api-key'],
    apiKeyUrl: 'https://console.groq.com/keys'
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    badge: 'API',
    description: 'Mistral hosted models',
    glyph: 'M',
    glyphTone: 'from-amber-300/20 to-yellow-300/20 text-amber-200',
    connectionTypes: ['api-key'],
    apiKeyUrl: 'https://console.mistral.ai/api-keys/'
  },
  together: {
    id: 'together',
    label: 'Together.ai',
    badge: 'API',
    description: 'Hosted open models',
    glyph: 'TG',
    glyphTone: 'from-green-300/20 to-emerald-300/20 text-green-200',
    connectionTypes: ['api-key'],
    apiKeyUrl: 'https://api.together.xyz/settings/api-keys'
  },
  fireworks: {
    id: 'fireworks',
    label: 'Fireworks.ai',
    badge: 'API',
    description: 'High-performance hosted inference',
    glyph: 'FW',
    glyphTone: 'from-orange-300/20 to-pink-300/20 text-orange-200',
    connectionTypes: ['api-key'],
    apiKeyUrl: 'https://fireworks.ai/account/api-keys'
  },
  xai: {
    id: 'xai',
    label: 'xAI (Grok)',
    badge: 'API',
    description: 'Grok API endpoint',
    glyph: 'X',
    glyphTone: 'from-slate-300/20 to-zinc-200/20 text-slate-100',
    connectionTypes: ['api-key'],
    apiKeyUrl: 'https://console.x.ai/'
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    badge: 'API',
    description: 'DeepSeek hosted chat models',
    glyph: 'DS',
    glyphTone: 'from-indigo-300/20 to-blue-300/20 text-indigo-200',
    connectionTypes: ['api-key'],
    apiKeyUrl: 'https://platform.deepseek.com/api_keys'
  },
  'openai-compatible': {
    id: 'openai-compatible',
    label: 'OpenAI-Compatible',
    badge: 'Custom',
    description: 'Any API exposing /models and /chat/completions',
    glyph: 'OC',
    glyphTone: 'from-cyan-300/20 to-sky-300/20 text-cyan-200',
    connectionTypes: ['api-key']
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama',
    badge: 'Local',
    description: 'Local models running on your machine',
    glyph: 'O',
    glyphTone: 'from-slate-300/20 to-slate-100/20 text-slate-200',
    connectionTypes: ['local']
  },
  lmstudio: {
    id: 'lmstudio',
    label: 'LM Studio',
    badge: 'Local',
    description: 'OpenAI-compatible local runtime',
    glyph: 'LM',
    glyphTone: 'from-violet-300/20 to-indigo-300/20 text-violet-200',
    connectionTypes: ['local']
  }
}

type ProviderConnectionDraft = {
  providerId: AIProvider['id']
  connectionType: AIProviderConnectionType
  apiKey: string
  baseUrl: string
}

type ProviderStatusTone = 'active' | 'ready' | 'issue' | 'idle'

type ProviderModelState = {
  loading: boolean
  models: string[]
  error?: string
}

function getProviderConfig(providerId: AIProvider['id']): ProviderCatalogEntry {
  return PROVIDER_CATALOG[providerId]
}

function isProviderConfigured(provider: AIProvider): boolean {
  if (!provider.enabled) return false
  if (provider.connectionType === 'local') {
    return provider.baseUrl.trim().length > 0
  }
  return provider.apiKey.trim().length > 0
}

function getProviderStatusMeta(
  provider: AIProvider,
  activeProviderId: string | null,
  testResults: Record<string, { success: boolean; error?: string } | undefined>,
  translate: (key: string, options?: Record<string, unknown>) => string
): {
  tone: ProviderStatusTone
  label: string
  detail: string
  dotClassName: string
} {
  const latest = testResults[provider.id]

  if (!provider.enabled) {
    return {
      tone: 'idle',
      label: translate('ai.status.notConnected'),
      detail: translate('ai.status.available'),
      dotClassName: 'bg-gray-600'
    }
  }

  if (latest && !latest.success) {
    return {
      tone: 'issue',
      label: translate('ai.status.needsAttention'),
      detail: latest.error || translate('ai.status.testFailed'),
      dotClassName: 'bg-destructive'
    }
  }

  if (!isProviderConfigured(provider)) {
    return {
      tone: 'issue',
      label: translate('ai.status.missingDetails'),
      detail: translate('ai.status.completeFields'),
      dotClassName: 'bg-caution'
    }
  }

  if (activeProviderId === provider.id) {
    return {
      tone: 'active',
      label: translate('ai.status.active'),
      detail: translate('ai.status.activeDetail'),
      dotClassName: 'bg-safe'
    }
  }

  return {
    tone: 'ready',
    label: translate('ai.status.connected'),
    detail: translate('ai.status.backupReady'),
    dotClassName: 'bg-emerald-400'
  }
}

function getProviderConnectionHelp(
  provider: AIProvider,
  translate: (key: string, options?: Record<string, unknown>) => string
): string {
  if (provider.connectionType === 'local') {
    return translate('ai.connectionHelp.local')
  }
  return translate('ai.connectionHelp.apiKey')
}

export function SettingsPanel({ hideHeader = false }: { hideHeader?: boolean }): JSX.Element {
  const { t } = useTranslation(['settings', 'common'])
  const setCommands = useCommandStore((s) => s.setCommands)
  const setActiveCommand = useCommandStore((s) => s.setActiveCommand)
  const {
    settings,
    updateProvider,
    setActiveProvider,
    setSettings,
    setTheme,
    setShowHelpTooltips,
    setTerminalInputMode,
    setSafePasteMode,
    setSaveTerminalLogs,
    setLogDirectory,
    setCheckForUpdatesOnStartup,
    setDevUpdateFeedUrl,
    setUiLocale,
    setFormatLocale,
    setAIResponseLocale
  } = useSettingsStore()
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general')
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string } | undefined>>({})
  const [providerPickerOpen, setProviderPickerOpen] = useState(false)
  const [connectDraft, setConnectDraft] = useState<ProviderConnectionDraft | null>(null)
  const [selectedProviderId, setSelectedProviderId] = useState<AIProvider['id'] | null>(
    (settings.aiRouting.primary?.providerId as AIProvider['id'] | null) ??
      (settings.activeAIProvider as AIProvider['id'] | null)
  )
  const [fallbackDraft, setFallbackDraft] = useState<{ providerId: AIProvider['id'] | ''; model: string }>({
    providerId: '',
    model: ''
  })
  const [modelResults, setModelResults] = useState<Record<string, ProviderModelState | undefined>>({})
  const [appVersion, setAppVersion] = useState('...')
  const [updateFeedDraft, setUpdateFeedDraft] = useState(settings.devUpdateFeedUrl)
  const [updateCheck, setUpdateCheck] = useState<AppUpdateCheckResult | null>(null)
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const [installingUpdate, setInstallingUpdate] = useState(false)
  const [updateActionMessage, setUpdateActionMessage] = useState<string | null>(null)
  const [backingUp, setBackingUp] = useState(false)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [dataDirInfo, setDataDirInfo] = useState<{ currentPath: string; defaultPath: string; isCustom: boolean } | null>(null)
  const [dataDirMoving, setDataDirMoving] = useState(false)
  const [dataDirMessage, setDataDirMessage] = useState<string | null>(null)
  const [dataDirError, setDataDirError] = useState<string | null>(null)
  const isMac = navigator.platform.toLowerCase().includes('mac')

  const handleResetCommandTrees = async (): Promise<void> => {
    const confirmed = window.confirm(
      t('general.resetCommandTrees.confirm', { ns: 'settings' })
    )
    if (!confirmed) return

    await window.electronAPI.resetCommandTrees()
    const refreshedCommands = await window.electronAPI.loadAllCommands()
    setCommands(refreshedCommands)
    setActiveCommand(null)
  }

  const enabledProviders = useMemo(
    () => settings.aiProviders.filter((provider) => provider.enabled),
    [settings.aiProviders]
  )

  const selectedProvider = useMemo(
    () =>
      settings.aiProviders.find((provider) => provider.id === selectedProviderId) ??
      enabledProviders[0] ??
      null,
    [enabledProviders, selectedProviderId, settings.aiProviders]
  )

  const localeOptions = useMemo(
    () =>
      SUPPORTED_LOCALES.map((code) => ({
        code,
        meta: LOCALE_METADATA[code]
      })),
    []
  )

  useEffect(() => {
    if (selectedProviderId && settings.aiProviders.some((provider) => provider.id === selectedProviderId)) {
      return
    }
    setSelectedProviderId(
      (settings.aiRouting.primary?.providerId as AIProvider['id'] | null) ??
        (settings.activeAIProvider as AIProvider['id'] | null) ??
        enabledProviders[0]?.id ??
        null
    )
  }, [enabledProviders, selectedProviderId, settings.activeAIProvider, settings.aiRouting.primary, settings.aiProviders])

  useEffect(() => {
    setFallbackDraft({ providerId: '', model: '' })
  }, [selectedProviderId])

  useEffect(() => {
    setUpdateFeedDraft(settings.devUpdateFeedUrl)
  }, [settings.devUpdateFeedUrl])

  useEffect(() => {
    void window.electronAPI.getAppVersion().then(setAppVersion)
  }, [])

  useEffect(() => {
    void window.electronAPI.getDataDirectoryInfo().then(setDataDirInfo)
  }, [])

  const toggleShowKey = (id: string): void => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const persistProvider = async (
    providerId: string,
    updates: Partial<AIProvider>
  ): Promise<void> => {
    updateProvider(providerId, updates)
    const result = await window.electronAPI.updateProvider(providerId, updates)
    setSettings(result)
  }

  const persistSettings = async (
    updates: Partial<typeof settings>
  ): Promise<void> => {
    const result = await window.electronAPI.updateSettings(updates)
    setSettings(result)
  }

  const persistUpdateFeedUrl = async (): Promise<string> => {
    const nextUrl = updateFeedDraft.trim()
    setDevUpdateFeedUrl(nextUrl)
    await persistSettings({ devUpdateFeedUrl: nextUrl })
    return nextUrl
  }

  const formatSavedTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return t('data.noBackup', { ns: 'settings' })
    return formatDateTime(timestamp, settings)
  }

  const handleUseICloudBackup = async (): Promise<void> => {
    setBackupMessage(null)
    setBackupError(null)

    const suggestion = await window.electronAPI.getDefaultICloudBackupDirectory()
    if (!suggestion.available || !suggestion.path) {
      setBackupError(suggestion.reason ?? t('data.iCloudUnavailable', { ns: 'settings' }))
      return
    }

    await persistSettings({ backupDirectory: suggestion.path })
    setBackupMessage(t('data.iCloudReadyMessage', { ns: 'settings' }))
  }

  const handleChooseBackupDirectory = async (): Promise<void> => {
    setBackupMessage(null)
    setBackupError(null)

    const dir = await window.electronAPI.openDirectoryDialog()
    if (!dir) return

    await persistSettings({ backupDirectory: dir })
    setBackupMessage(t('data.backupFolderUpdated', { ns: 'settings' }))
  }

  const handleRunBackup = async (): Promise<void> => {
    setBackupMessage(null)
    setBackupError(null)

    const targetDir = settings.backupDirectory.trim()
    if (!targetDir) {
      setBackupError(t('data.chooseBackupFolder', { ns: 'settings' }))
      return
    }

    setBackingUp(true)
    try {
      const result = await window.electronAPI.createAppDataBackup(targetDir)
      if (!result.success) {
        setBackupError(result.error ?? t('data.backupFailed', { ns: 'settings' }))
        return
      }

      await persistSettings({
        backupDirectory: targetDir,
        lastBackupAt: result.createdAt ?? new Date().toISOString()
      })

      setBackupMessage(
        result.backupPath
          ? t('data.backupSaved', { ns: 'settings', path: result.backupPath })
          : result.message ?? t('data.backupCreated', { ns: 'settings' })
      )
    } finally {
      setBackingUp(false)
    }
  }

  const handleCheckForUpdates = async (): Promise<void> => {
    setCheckingUpdates(true)
    setUpdateActionMessage(null)

    try {
      if (updateFeedDraft.trim() !== settings.devUpdateFeedUrl.trim()) {
        await persistUpdateFeedUrl()
      }

      const result = await window.electronAPI.checkForAppUpdate()
      setUpdateCheck(result)
    } catch (error) {
      setUpdateCheck({
        status: 'error',
        currentVersion: appVersion,
        checkedAt: new Date().toISOString(),
        feedUrl: settings.devUpdateFeedUrl.trim() || null,
        message: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setCheckingUpdates(false)
    }
  }

  const handleDownloadUpdate = async (): Promise<void> => {
    setInstallingUpdate(true)
    setUpdateActionMessage(null)

    try {
      if (updateFeedDraft.trim() !== settings.devUpdateFeedUrl.trim()) {
        await persistUpdateFeedUrl()
      }

      const result = await window.electronAPI.downloadAndOpenAppUpdate()
      setUpdateActionMessage(result.message)

      const refreshed = await window.electronAPI.checkForAppUpdate()
      setUpdateCheck(refreshed)
    } catch (error) {
      setUpdateActionMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setInstallingUpdate(false)
    }
  }

  const updateActionLabel =
    updateCheck?.delivery === 'electron-updater'
      ? t('about.downloadInstall', { ns: 'settings' })
      : t('about.downloadOpen', { ns: 'settings' })

  const installingActionLabel =
    updateCheck?.delivery === 'electron-updater'
      ? t('about.installing', { ns: 'settings' })
      : t('about.opening', { ns: 'settings' })

  const loadModels = async (providerId: string, force = false): Promise<void> => {
    const existing = modelResults[providerId]
    if (!force && (existing?.loading || existing?.models.length || existing?.error)) {
      return
    }

    setModelResults((prev) => ({
      ...prev,
      [providerId]: { loading: true, models: prev[providerId]?.models ?? [] }
    }))

    const result = await window.electronAPI.listAIModels(providerId)
    setModelResults((prev) => ({
      ...prev,
      [providerId]: {
        loading: false,
        models: result.models,
        error: result.success ? undefined : result.error
      }
    }))
  }

  const handleSetActive = async (providerId: string): Promise<void> => {
    const provider = settings.aiProviders.find((entry) => entry.id === providerId)
    if (!provider?.enabled) return

    const newActive = settings.activeAIProvider === providerId ? null : providerId
    setActiveProvider(newActive)
    await persistSettings({ activeAIProvider: newActive })
  }

  const handleThemeChange = async (theme: Theme): Promise<void> => {
    setTheme(theme)
    await window.electronAPI.updateSettings({ theme })
  }

  const handleTerminalInputModeChange = async (mode: TerminalInputMode): Promise<void> => {
    setTerminalInputMode(mode)
    await window.electronAPI.updateSettings({ terminalInputMode: mode })
  }

  const handleUiLocaleChange = async (uiLocale: LocalePreference): Promise<void> => {
    setUiLocale(uiLocale)
    await syncI18nWithSettings({ uiLocale })
    const result = await window.electronAPI.updateSettings({ uiLocale })
    setSettings(result)
    await syncI18nWithSettings(result)
  }

  const handleFormatLocaleChange = async (formatLocale: LocalePreference): Promise<void> => {
    setFormatLocale(formatLocale)
    const result = await window.electronAPI.updateSettings({ formatLocale })
    setSettings(result)
  }

  const handleAIResponseLocaleChange = async (
    aiResponseLocale: AIResponseLocalePreference
  ): Promise<void> => {
    setAIResponseLocale(aiResponseLocale)
    const result = await window.electronAPI.updateSettings({ aiResponseLocale })
    setSettings(result)
  }

  const handleTest = async (providerId: string): Promise<void> => {
    setTesting(providerId)
    setTestResults((prev) => ({ ...prev, [providerId]: undefined }))
    const result = await window.electronAPI.testAIConnection(providerId)
    setTestResults((prev) => ({ ...prev, [providerId]: result }))
    setTesting(null)
    if (result.success) {
      await loadModels(providerId, true)
    }
  }

  const openConnectModal = (providerId: AIProvider['id']): void => {
    const provider = settings.aiProviders.find((entry) => entry.id === providerId)
    if (!provider) return
    setConnectDraft({
      providerId,
      connectionType: provider.connectionType,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl
    })
    setProviderPickerOpen(false)
  }

  const handleConnectProvider = async (): Promise<void> => {
    if (!connectDraft) return

    const provider = settings.aiProviders.find((entry) => entry.id === connectDraft.providerId)
    if (!provider) return

    const updates: Partial<AIProvider> = {
      enabled: true,
      connectionType: connectDraft.connectionType,
      baseUrl: connectDraft.baseUrl.trim(),
      apiKey: connectDraft.connectionType === 'api-key' ? connectDraft.apiKey.trim() : ''
    }

    updateProvider(provider.id, updates)
    let result = await window.electronAPI.updateProvider(provider.id, updates)

    if (!result.aiRouting.primary) {
      result = await window.electronAPI.updateSettings({
        activeAIProvider: provider.id,
        aiRouting: {
          primary: { providerId: provider.id, model: provider.model },
          fallbacks: []
        }
      })
      setActiveProvider(provider.id)
    }

    setSettings(result)
    setSelectedProviderId(provider.id)
    setConnectDraft(null)
    await loadModels(provider.id, true)
  }

  const handleDisconnectProvider = async (provider: AIProvider): Promise<void> => {
    updateProvider(provider.id, {
      enabled: false,
      apiKey: '',
      connectionType: provider.id === 'ollama' || provider.id === 'lmstudio' ? 'local' : 'api-key'
    })
    let result = await window.electronAPI.updateProvider(provider.id, {
      enabled: false,
      apiKey: '',
      connectionType: provider.id === 'ollama' || provider.id === 'lmstudio' ? 'local' : 'api-key'
    })

    const nextPrimary =
      result.aiRouting.primary?.providerId === provider.id ? null : result.aiRouting.primary
    const nextFallbacks = result.aiRouting.fallbacks.filter((entry) => entry.providerId !== provider.id)
    const nextActiveProvider = result.activeAIProvider === provider.id ? null : result.activeAIProvider

    if (
      nextPrimary !== result.aiRouting.primary ||
      nextFallbacks.length !== result.aiRouting.fallbacks.length ||
      nextActiveProvider !== result.activeAIProvider
    ) {
      result = await window.electronAPI.updateSettings({
        activeAIProvider: nextActiveProvider,
        aiRouting: {
          primary: nextPrimary,
          fallbacks: nextFallbacks
        }
      })
    }

    if (!nextActiveProvider) {
      setActiveProvider(null)
    }

    setSettings(result)
    setTestResults((prev) => ({ ...prev, [provider.id]: undefined }))
    if (selectedProviderId === provider.id) {
      const nextEnabled = result.aiProviders.filter((entry) => entry.enabled)
      setSelectedProviderId(nextEnabled[0]?.id ?? null)
    }
  }

  const updateRouting = async (
    primary: AIRoutingTarget | null,
    fallbacks: AIRoutingTarget[]
  ): Promise<void> => {
    await persistSettings({
      activeAIProvider: primary?.providerId ?? null,
      aiRouting: {
        primary,
        fallbacks
      }
    })
  }

  useEffect(() => {
    if (activeTab !== 'ai' || !selectedProvider || !isProviderConfigured(selectedProvider)) {
      return
    }
    void loadModels(selectedProvider.id)
  }, [activeTab, selectedProvider?.id, selectedProvider?.apiKey, selectedProvider?.baseUrl, selectedProvider?.connectionType])

  useEffect(() => {
    if (!fallbackDraft.providerId) return
    const provider = settings.aiProviders.find((entry) => entry.id === fallbackDraft.providerId)
    if (!provider || !isProviderConfigured(provider)) return
    void loadModels(provider.id)
  }, [fallbackDraft.providerId, settings.aiProviders, activeTab])

  const addRoutingFallback = async (): Promise<void> => {
    const providerId = fallbackDraft.providerId
    const model = fallbackDraft.model.trim()
    if (!providerId || !model) return

    const nextFallbacks = [
      ...settings.aiRouting.fallbacks,
      { providerId, model }
    ].filter(
      (target, index, items) =>
        items.findIndex((entry) => entry.providerId === target.providerId && entry.model === target.model) === index
    )

    setFallbackDraft({ providerId: '', model: '' })
    await updateRouting(settings.aiRouting.primary, nextFallbacks)
  }

  const removeRoutingFallback = async (target: AIRoutingTarget): Promise<void> => {
    await updateRouting(
      settings.aiRouting.primary,
      settings.aiRouting.fallbacks.filter(
        (entry) => !(entry.providerId === target.providerId && entry.model === target.model)
      )
    )
  }

  const getProviderDisplayName = (providerId: AIProvider['id']): string =>
    settings.aiProviders.find((provider) => provider.id === providerId)?.label ?? providerId

  const renderLocaleOption = (code: SupportedLocale): JSX.Element => {
    const meta = LOCALE_METADATA[code]
    return (
      <option key={code} value={code}>
        {meta.nativeName} ({meta.englishName}) [{code}]
      </option>
    )
  }

  const renderGeneralTab = (): JSX.Element => (
    <div className="space-y-4">
      <SectionHeader icon={<HelpCircle size={12} />} title={t('general.title', { ns: 'settings' })} />
      <div className="space-y-3">
        <div className="rounded-xl border border-surface-border bg-surface-light p-4">
          <div className="mb-3 flex items-start gap-2">
            <Languages size={15} className="mt-0.5 text-accent-light" />
            <div>
              <div className="text-sm font-medium text-gray-200">
                {t('locale.title', { ns: 'settings' })}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t('locale.description', { ns: 'settings' })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.16em] text-gray-600">
                {t('locale.uiLanguage', { ns: 'settings' })}
              </span>
              <select
                value={settings.uiLocale}
                onChange={(event) => void handleUiLocaleChange(event.target.value as LocalePreference)}
                className="tv-input-compact"
              >
                <option value="system">{t('states.system', { ns: 'common' })}</option>
                {localeOptions.map((entry) => renderLocaleOption(entry.code))}
              </select>
              <span className="block text-[11px] leading-4 text-gray-600">
                {t('locale.systemDescription', { ns: 'settings' })}
              </span>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.16em] text-gray-600">
                {t('locale.formatLocale', { ns: 'settings' })}
              </span>
              <select
                value={settings.formatLocale}
                onChange={(event) => void handleFormatLocaleChange(event.target.value as LocalePreference)}
                className="tv-input-compact"
              >
                <option value="system">{t('states.system', { ns: 'common' })}</option>
                {localeOptions.map((entry) => renderLocaleOption(entry.code))}
              </select>
              <span className="block text-[11px] leading-4 text-gray-600">
                {t('locale.formatDescription', { ns: 'settings' })}
              </span>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.16em] text-gray-600">
                {t('locale.aiLanguage', { ns: 'settings' })}
              </span>
              <select
                value={settings.aiResponseLocale}
                onChange={(event) =>
                  void handleAIResponseLocaleChange(event.target.value as AIResponseLocalePreference)
                }
                className="tv-input-compact"
              >
                <option value="app">{t('locale.appLanguage', { ns: 'settings' })}</option>
                {localeOptions.map((entry) => renderLocaleOption(entry.code))}
              </select>
              <span className="block text-[11px] leading-4 text-gray-600">
                {t('locale.aiDescription', { ns: 'settings' })}
              </span>
            </label>
          </div>
        </div>

        <SettingToggleCard
          title={t('general.helpTooltips.title', { ns: 'settings' })}
          description={t('general.helpTooltips.description', { ns: 'settings' })}
          enabled={settings.showHelpTooltips}
          onToggle={async () => {
            const next = !settings.showHelpTooltips
            setShowHelpTooltips(next)
            await window.electronAPI.updateSettings({ showHelpTooltips: next })
          }}
        />

        <div className="rounded-xl border border-surface-border bg-surface-light p-4">
          <div className="mb-3">
            <div className="text-sm font-medium text-gray-200">
              {t('general.startupBehavior.title', { ns: 'settings' })}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {t('general.startupBehavior.description', { ns: 'settings' })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([
              {
                id: 'dashboard',
                label: t('general.startupBehavior.options.dashboard.label', { ns: 'settings' }),
                desc: t('general.startupBehavior.options.dashboard.description', { ns: 'settings' })
              },
              {
                id: 'last-project',
                label: t('general.startupBehavior.options.lastProject.label', { ns: 'settings' }),
                desc: t('general.startupBehavior.options.lastProject.description', { ns: 'settings' })
              }
            ] as const).map((opt) => (
              <button
                key={opt.id}
                onClick={async () => {
                  setSettings({ ...settings, startupBehavior: opt.id })
                  await window.electronAPI.updateSettings({ startupBehavior: opt.id })
                }}
                className={clsx(
                  'rounded-xl border px-3 py-3 text-left transition-colors',
                  settings.startupBehavior === opt.id
                    ? 'border-accent bg-accent/10 text-gray-200'
                    : 'border-surface-border bg-surface text-gray-500 hover:text-gray-300 hover:border-gray-500'
                )}
              >
                <span className="block text-sm font-medium">{opt.label}</span>
                <span className="mt-1 block text-xs text-gray-600 leading-5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-light p-4">
          <div className="mb-3">
            <div className="text-sm font-medium text-gray-200">
              {t('general.terminalInput.title', { ns: 'settings' })}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {t('general.terminalInput.description', { ns: 'settings' })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TERMINAL_INPUT_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => void handleTerminalInputModeChange(mode.id)}
                className={clsx(
                  'rounded-xl border px-3 py-3 text-left transition-colors',
                  settings.terminalInputMode === mode.id
                    ? 'border-accent bg-accent/10 text-gray-200'
                    : 'border-surface-border bg-surface text-gray-500 hover:text-gray-300 hover:border-gray-500'
                )}
              >
                <span className="block text-sm font-medium">
                  {t(`general.terminalInput.modes.${mode.id}.label`, { ns: 'settings', defaultValue: mode.label })}
                </span>
                <span className="mt-1 block text-xs text-gray-600 leading-5">
                  {t(`general.terminalInput.modes.${mode.id}.description`, { ns: 'settings', defaultValue: mode.desc })}
                </span>
              </button>
            ))}
          </div>
        </div>

        <SettingToggleCard
          title={t('general.safePaste.title', { ns: 'settings' })}
          description={t('general.safePaste.description', { ns: 'settings' })}
          enabled={settings.safePasteMode}
          onToggle={async () => {
            const next = !settings.safePasteMode
            setSafePasteMode(next)
            await window.electronAPI.updateSettings({ safePasteMode: next })
          }}
        />

        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-200">
                {t('general.resetCommandTrees.title', { ns: 'settings' })}
              </div>
              <div className="text-xs text-gray-500 mt-1 leading-5">
                {t('general.resetCommandTrees.description', { ns: 'settings' })}
              </div>
            </div>
            <button
              onClick={() => void handleResetCommandTrees()}
              className="shrink-0 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              {t('actions.reset', { ns: 'common' })}
            </button>
          </div>
          <div className="mt-3 text-[11px] text-gray-600 leading-5">
            {t('general.resetCommandTrees.unaffected', { ns: 'settings' })}
          </div>
        </div>
      </div>
    </div>
  )

  const renderLogsTab = (): JSX.Element => (
    <div className="space-y-4">
      <SectionHeader icon={<FolderOpen size={12} />} title={t('logs.title', { ns: 'settings' })} />
      <div className="space-y-3">
        <SettingToggleCard
          title={t('logs.saveTerminalLogs', { ns: 'settings' })}
          description={t('logs.saveTerminalLogsDescription', { ns: 'settings' })}
          enabled={settings.saveTerminalLogs}
          onToggle={async () => {
            const next = !settings.saveTerminalLogs
            setSaveTerminalLogs(next)
            await window.electronAPI.updateSettings({ saveTerminalLogs: next })
          }}
        />

        <div className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-light p-4 gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-200">{t('logs.storageFolder', { ns: 'settings' })}</div>
            <div className="text-xs text-gray-500 mt-1">{t('logs.storageFolderDescription', { ns: 'settings' })}</div>
            <div className="text-[11px] font-mono text-gray-600 mt-2 truncate">
              {settings.logDirectory?.trim() || t('logs.defaultFolder', { ns: 'settings' })}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {settings.logDirectory?.trim() && (
              <button
                onClick={async () => {
                  setLogDirectory('')
                  await window.electronAPI.updateSettings({ logDirectory: '' })
                }}
                className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-surface transition-colors"
              >
                {t('logs.reset', { ns: 'settings' })}
              </button>
            )}
            <button
              onClick={async () => {
                const dir = await window.electronAPI.openDirectoryDialog()
                if (dir) {
                  setLogDirectory(dir)
                  await window.electronAPI.updateSettings({ logDirectory: dir })
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
            >
              <FolderOpen size={12} />
              {t('logs.browse', { ns: 'settings' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAppearanceTab = (): JSX.Element => (
    <div className="space-y-4">
      <SectionHeader icon={<Palette size={12} />} title={t('appearance.title', { ns: 'settings' })} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {([
          { id: 'dark', label: t('appearance.darkThemes', { ns: 'settings' }), description: t('appearance.darkThemesDescription', { ns: 'settings' }) },
          { id: 'light', label: t('appearance.lightThemes', { ns: 'settings' }), description: t('appearance.lightThemesDescription', { ns: 'settings' }) }
        ] as const).map((group) => (
          <div key={group.id} className="rounded-xl border border-surface-border bg-surface-light/70 p-3">
            <div className="mb-3">
              <div className="text-sm font-semibold text-gray-200">{group.label}</div>
              <div className="mt-1 text-xs text-gray-500">{group.description}</div>
            </div>
            <div className="space-y-3">
              {THEMES.filter((theme) => theme.family === group.id).map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => void handleThemeChange(theme.id)}
                  className={clsx(
                    'w-full rounded-xl border px-4 py-4 text-left transition-colors',
                    settings.theme === theme.id
                      ? 'border-accent bg-accent/10 text-gray-200'
                      : 'border-surface-border bg-surface text-gray-500 hover:text-gray-300 hover:border-gray-500'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-4 w-4 rounded-full border border-white/15"
                      style={{ background: theme.dot }}
                    />
                    <div>
                      <div className="text-sm font-medium">
                        {t(`appearance.themes.${theme.id}.label`, { ns: 'settings', defaultValue: theme.label })}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {t(`appearance.themes.${theme.id}.description`, { ns: 'settings', defaultValue: theme.desc })}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderDataTab = (): JSX.Element => (
    <div className="space-y-4">
      <SectionHeader icon={<HardDrive size={12} />} title={t('data.title', { ns: 'settings' })} />
      <div className="space-y-3">
        <div className="rounded-xl border border-surface-border bg-surface-light p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-200">{t('data.storageTitle', { ns: 'settings' })}</div>
              <div className="text-xs text-gray-500 mt-1 leading-5">
                {t('data.storageDescription', { ns: 'settings' })}
              </div>
            </div>
            <div className="shrink-0">
              <HardDrive size={16} className="text-gray-500" />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-surface-border bg-surface p-3">
            <div className="text-xs uppercase tracking-[0.24em] text-gray-600">{t('data.folderLabel', { ns: 'settings' })}</div>
            <div className="mt-2 text-sm text-gray-300 break-all">
              {dataDirInfo?.currentPath ?? t('data.loading', { ns: 'settings' })}
            </div>
            {dataDirInfo?.isCustom && (
              <div className="mt-2 text-[11px] text-accent-light">{t('data.customLocationActive', { ns: 'settings' })}</div>
            )}
          </div>

          <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 flex items-start gap-2">
            <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
            <span className="text-[11px] text-amber-300/80 leading-4">
              {t('data.syncWarning', { ns: 'settings' })}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={async () => {
                const dir = await window.electronAPI.openDirectoryDialog()
                if (!dir) return
                const confirmed = window.confirm(
                  t('data.moveConfirm', { ns: 'settings', dir })
                )
                if (!confirmed) return
                setDataDirMoving(true)
                setDataDirMessage(null)
                setDataDirError(null)
                try {
                  await window.electronAPI.moveDataDirectory(dir)
                  const info = await window.electronAPI.getDataDirectoryInfo()
                  setDataDirInfo(info)
                  setDataDirMessage(t('data.movedMessage', { ns: 'settings', dir }))
                } catch (err) {
                  setDataDirError(err instanceof Error ? err.message : t('data.moveFailed', { ns: 'settings' }))
                } finally {
                  setDataDirMoving(false)
                }
              }}
              disabled={dataDirMoving}
              className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors disabled:opacity-50"
            >
              {dataDirMoving ? <Loader2 size={12} className="animate-spin" /> : <FolderOpen size={12} />}
              {dataDirMoving ? t('data.moving', { ns: 'settings' }) : t('data.moveFolder', { ns: 'settings' })}
            </button>

            {dataDirInfo?.isCustom && (
              <>
                <button
                  onClick={() => void window.electronAPI.openInExplorer(dataDirInfo.currentPath)}
                  className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
                >
                  <ExternalLink size={12} />
                  {t('data.openFolder', { ns: 'settings' })}
                </button>

                <button
                  onClick={async () => {
                    const confirmed = window.confirm(
                      t('data.resetConfirm', { ns: 'settings' })
                    )
                    if (!confirmed) return
                    setDataDirMoving(true)
                    setDataDirMessage(null)
                    setDataDirError(null)
                    try {
                      await window.electronAPI.resetDataDirectory()
                      const info = await window.electronAPI.getDataDirectoryInfo()
                      setDataDirInfo(info)
                      setDataDirMessage(t('data.resetMessage', { ns: 'settings' }))
                    } catch (err) {
                      setDataDirError(err instanceof Error ? err.message : t('data.resetFailed', { ns: 'settings' }))
                    } finally {
                      setDataDirMoving(false)
                    }
                  }}
                  disabled={dataDirMoving}
                  className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} />
                  {t('data.resetToDefault', { ns: 'settings' })}
                </button>
              </>
            )}
          </div>

          {dataDirMessage && (
            <div className="mt-4 rounded-lg border border-safe/20 bg-safe/10 px-3 py-2 text-xs text-safe">
              {dataDirMessage}
            </div>
          )}

          {dataDirError && (
            <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {dataDirError}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-light p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-200">{t('data.backupsTitle', { ns: 'settings' })}</div>
              <div className="text-xs text-gray-500 mt-1 leading-5">
                {t('data.backupsDescription', { ns: 'settings' })}
              </div>
            </div>
            <div className="shrink-0 rounded-full border border-surface-border bg-surface px-2.5 py-1 text-[11px] text-gray-400">
              {isMac ? t('data.iCloudReady', { ns: 'settings' }) : t('data.manualSnapshots', { ns: 'settings' })}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-surface-border bg-surface p-3">
            <div className="text-xs uppercase tracking-[0.24em] text-gray-600">{t('data.backupFolder', { ns: 'settings' })}</div>
            <div className="mt-2 text-sm text-gray-300 break-all">
              {settings.backupDirectory?.trim() || t('data.notConfigured', { ns: 'settings' })}
            </div>
            <div className="mt-3 text-[11px] text-gray-500">
              {t('data.lastBackup', { ns: 'settings', timestamp: formatSavedTimestamp(settings.lastBackupAt) })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {isMac && (
              <button
                onClick={() => void handleUseICloudBackup()}
                className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
              >
                <Cloud size={12} />
                {t('data.useICloud', { ns: 'settings' })}
              </button>
            )}

            <button
              onClick={() => void handleChooseBackupDirectory()}
              className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
            >
              <FolderOpen size={12} />
              {t('logs.browse', { ns: 'settings' })}
            </button>

            {settings.backupDirectory?.trim() && (
              <button
                onClick={() => void window.electronAPI.openInExplorer(settings.backupDirectory)}
                className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
              >
                <ExternalLink size={12} />
                {t('data.openFolder', { ns: 'settings' })}
              </button>
            )}

            <button
              onClick={() => void handleRunBackup()}
              disabled={backingUp || !settings.backupDirectory.trim()}
              className={clsx(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                backingUp || !settings.backupDirectory.trim()
                  ? 'border-surface-border text-gray-600 cursor-not-allowed'
                  : 'border-accent/30 text-accent-light hover:border-accent hover:bg-accent/10'
              )}
            >
              {backingUp ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              {backingUp ? t('data.backingUp', { ns: 'settings' }) : t('data.backUpNow', { ns: 'settings' })}
            </button>
          </div>

          {backupMessage && (
            <div className="mt-4 rounded-lg border border-safe/20 bg-safe/10 px-3 py-2 text-xs text-safe">
              {backupMessage}
            </div>
          )}

          {backupError && (
            <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {backupError}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderAboutTab = (): JSX.Element => (
    <div className="space-y-4">
      <SectionHeader icon={<Sparkles size={12} />} title={t('about.title', { ns: 'settings' })} />
      <div className="space-y-3">
        <div className="rounded-xl border border-surface-border bg-surface-light p-4">
          <div className="text-sm font-medium text-gray-200">TerminallySKILL</div>
          <div className="text-xs text-gray-500 mt-1">{t('about.description', { ns: 'settings' })}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
            <span className="rounded-full border border-surface-border bg-surface px-2.5 py-1 font-mono text-gray-300">
              {t('about.version', { ns: 'settings', version: appVersion })}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-light p-4 space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-200">{t('about.updatesTitle', { ns: 'settings' })}</div>
            <div className="text-xs text-gray-500 mt-1">
              {t('about.updatesDescription', { ns: 'settings' })}
            </div>
          </div>

          <SettingToggleCard
            title={t('about.checkOnStartup', { ns: 'settings' })}
            description={t('about.checkOnStartupDescription', { ns: 'settings' })}
            enabled={settings.checkForUpdatesOnStartup}
            onToggle={async () => {
              const next = !settings.checkForUpdatesOnStartup
              setCheckForUpdatesOnStartup(next)
              await window.electronAPI.updateSettings({ checkForUpdatesOnStartup: next })
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void handleCheckForUpdates()}
              disabled={checkingUpdates}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-2 text-xs text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors disabled:opacity-60"
            >
              {checkingUpdates ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  {t('about.checking', { ns: 'settings' })}
                </>
              ) : (
                <>
                  <RefreshCw size={12} />
                  {t('about.checkForUpdates', { ns: 'settings' })}
                </>
              )}
            </button>

            {updateCheck?.status === 'update-available' && (
              <button
                onClick={() => void handleDownloadUpdate()}
                disabled={installingUpdate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-slate-950 hover:bg-cyan-300 transition-colors disabled:opacity-60"
              >
                {installingUpdate ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    {installingActionLabel}
                  </>
                ) : (
                  <>
                    <Download size={12} />
                    {updateActionLabel}
                  </>
                )}
              </button>
            )}
          </div>

          {(updateCheck || updateActionMessage) && (
            <div className="space-y-3 rounded-xl border border-surface-border bg-surface p-3">
              {updateCheck && (
                <>
                  <div
                    className={clsx(
                      'rounded-lg px-3 py-2 text-xs',
                      updateCheck.status === 'update-available'
                        ? 'bg-safe/10 text-safe'
                        : updateCheck.status === 'up-to-date'
                          ? 'bg-accent/10 text-accent-light'
                          : updateCheck.status === 'not-configured'
                            ? 'bg-caution/10 text-caution'
                            : 'bg-destructive/10 text-destructive'
                    )}
                  >
                    {updateCheck.message}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-gray-600">{t('about.current', { ns: 'settings' })}</div>
                      <div className="mt-1 text-sm font-mono text-gray-200">{updateCheck.currentVersion}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-gray-600">{t('about.latest', { ns: 'settings' })}</div>
                      <div className="mt-1 text-sm font-mono text-gray-200">{updateCheck.latestVersion ?? t('about.noReleaseFound', { ns: 'settings' })}</div>
                    </div>
                  </div>

                  {updateCheck.feedUrl && (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-gray-600">{t('about.resolvedFeed', { ns: 'settings' })}</div>
                      <div className="mt-1 truncate text-xs font-mono text-gray-400">{updateCheck.feedUrl}</div>
                    </div>
                  )}

                  {(updateCheck.assetLabel || updateCheck.fileName || updateCheck.publishedAt) && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-gray-600">{t('about.asset', { ns: 'settings' })}</div>
                        <div className="mt-1 text-xs text-gray-300">{updateCheck.assetLabel ?? updateCheck.fileName ?? t('about.autoSelectedBuild', { ns: 'settings' })}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-gray-600">{t('about.published', { ns: 'settings' })}</div>
                        <div className="mt-1 text-xs text-gray-300">
	                          {updateCheck.publishedAt
	                            ? formatDateTime(updateCheck.publishedAt, settings)
	                            : formatDateTime(updateCheck.checkedAt, settings)}
                        </div>
                      </div>
                    </div>
                  )}

                  {updateCheck.notes && (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-gray-600">{t('about.releaseNotes', { ns: 'settings' })}</div>
                      <UpdateReleaseNotes
                        notes={updateCheck.notes}
                        hint={t('about.releaseNotesHint', { ns: 'settings' })}
                        className="mt-2"
                      />
                    </div>
                  )}
                </>
              )}

              {updateActionMessage && (
                <div className="rounded-lg bg-surface-light px-3 py-2 text-xs text-gray-300">
                  {updateActionMessage}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-light p-4">
          <div className="text-sm font-medium text-gray-200">{t('about.support', { ns: 'settings' })}</div>
          <div className="text-xs text-gray-500 mt-1 leading-5">
            {t('about.supportDescription', { ns: 'settings' })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => void window.electronAPI.openExternal('https://buymeacoffee.com/cryptoraptor')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
            >
              <ExternalLink size={12} />
              {t('about.buyCoffee', { ns: 'settings' })}
            </button>
            <button
              onClick={() => void window.electronAPI.openExternal('https://www.paypal.com/donate/?hosted_button_id=5VJ5KLNBQ9LRN')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
            >
              <ExternalLink size={12} />
              PayPal
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAITab = (): JSX.Element => (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-accent-light" />
            <h3 className="text-sm font-semibold text-gray-200">{t('ai.title', { ns: 'settings' })}</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t('ai.description', { ns: 'settings' })}
          </p>
        </div>
        <button
          onClick={() => setProviderPickerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-slate-950 text-sm font-medium hover:bg-cyan-300 transition-colors shrink-0"
        >
          <Plus size={14} />
          {t('ai.addProvider', { ns: 'settings' })}
        </button>
      </div>

      {enabledProviders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface-light/60 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent-light">
            <Bot size={20} />
          </div>
          <div className="mt-4 text-sm font-medium text-gray-200">{t('ai.emptyTitle', { ns: 'settings' })}</div>
          <div className="mt-1 text-xs text-gray-500">
            {t('ai.emptyDescription', { ns: 'settings' })}
          </div>
          <button
            onClick={() => setProviderPickerOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-accent/30 text-sm text-accent-light hover:border-accent hover:bg-accent/10 transition-colors"
          >
            <Plus size={14} />
            {t('ai.addProvider', { ns: 'settings' })}
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-surface-border bg-surface-light p-4 space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-200">{t('ai.routingTitle', { ns: 'settings' })}</div>
              <div className="mt-1 text-xs text-gray-500">
                {t('ai.routingDescription', { ns: 'settings' })}
              </div>
            </div>

            <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">{t('ai.primaryProvider', { ns: 'settings' })}</label>
                <select
                  value={settings.aiRouting.primary?.providerId ?? ''}
                  onChange={async (event) => {
                    const providerId = event.target.value as AIProvider['id']
                    if (!providerId) {
                      await updateRouting(null, settings.aiRouting.fallbacks)
                      return
                    }
                    const provider = settings.aiProviders.find((entry) => entry.id === providerId)
                    const model = settings.aiRouting.primary?.providerId === providerId
                      ? settings.aiRouting.primary.model
                      : provider?.model ?? ''
                    await updateRouting({ providerId, model }, settings.aiRouting.fallbacks)
                    setSelectedProviderId(providerId)
                    if (provider && isProviderConfigured(provider)) {
                      void loadModels(providerId)
                    }
                  }}
                  className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-accent/40"
                >
                  <option value="">{t('ai.selectProvider', { ns: 'settings' })}</option>
                  {enabledProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">{t('ai.primaryModel', { ns: 'settings' })}</label>
                <input
                  type="text"
                  list={`routing-primary-models-${settings.aiRouting.primary?.providerId ?? 'none'}`}
                  value={settings.aiRouting.primary?.model ?? ''}
                  onChange={async (event) => {
                    if (!settings.aiRouting.primary) return
                    await updateRouting(
                      {
                        ...settings.aiRouting.primary,
                        model: event.target.value
                      },
                      settings.aiRouting.fallbacks
                    )
                  }}
                  placeholder={t('ai.primaryModelPlaceholder', { ns: 'settings' })}
                  className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent/40"
                />
                <datalist id={`routing-primary-models-${settings.aiRouting.primary?.providerId ?? 'none'}`}>
                  {(settings.aiRouting.primary ? modelResults[settings.aiRouting.primary.providerId]?.models ?? [] : []).map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">{t('ai.fallbackChain', { ns: 'settings' })}</label>
              <div className="rounded-xl border border-surface-border bg-surface p-3">
                <div className="flex flex-wrap gap-2">
                  {settings.aiRouting.fallbacks.length === 0 && (
                    <span className="text-xs text-gray-600">{t('ai.noFallbacks', { ns: 'settings' })}</span>
                  )}
                  {settings.aiRouting.fallbacks.map((target, index) => (
                    <span
                      key={`${target.providerId}:${target.model}:${index}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-light px-2.5 py-1 text-[11px] text-gray-300"
                    >
                      <span className="font-medium text-gray-200">{getProviderDisplayName(target.providerId)}</span>
                      <span className="text-gray-500">/</span>
                      <span className="font-mono">{target.model}</span>
                      <button
                        onClick={() => void removeRoutingFallback(target)}
                        className="text-gray-500 hover:text-gray-200 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-[180px_minmax(0,1fr)_auto] gap-2">
                  <select
                    value={fallbackDraft.providerId}
                    onChange={(event) =>
                      setFallbackDraft((prev) => ({ ...prev, providerId: event.target.value as AIProvider['id'] | '' }))
                    }
                    className="rounded-lg border border-surface-border bg-surface-light px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-accent/40"
                  >
                    <option value="">{t('ai.fallbackProvider', { ns: 'settings' })}</option>
                    {enabledProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    list={`routing-fallback-models-${fallbackDraft.providerId || 'none'}`}
                    value={fallbackDraft.model}
                    onChange={(event) =>
                      setFallbackDraft((prev) => ({ ...prev, model: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void addRoutingFallback()
                      }
                    }}
                    placeholder={t('ai.fallbackModelPlaceholder', { ns: 'settings' })}
                    className="rounded-lg border border-surface-border bg-surface-light px-3 py-2 text-xs font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent/40"
                  />
                  <button
                    onClick={() => void addRoutingFallback()}
                    className="px-3 py-2 rounded-lg border border-surface-border text-xs text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors"
                  >
                    {t('ai.add', { ns: 'settings' })}
                  </button>
                  <datalist id={`routing-fallback-models-${fallbackDraft.providerId || 'none'}`}>
                    {((fallbackDraft.providerId ? modelResults[fallbackDraft.providerId]?.models : []) ?? []).map((model) => (
                      <option key={model} value={model} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {enabledProviders.map((provider) => {
              const catalog = getProviderConfig(provider.id)
              const activeProviderId = settings.aiRouting.primary?.providerId ?? settings.activeAIProvider
              const status = getProviderStatusMeta(provider, activeProviderId, testResults, t)
              const discoveredModels = modelResults[provider.id]?.models.length ?? 0
              const configuredModels = provider.model.trim().length > 0 ? 1 : 0
              return (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProviderId(provider.id)}
                  className={clsx(
                    'rounded-2xl border p-4 text-left transition-colors',
                    selectedProvider?.id === provider.id
                      ? 'border-accent/40 bg-accent/5'
                      : 'border-surface-border bg-surface-light hover:border-gray-500'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <ProviderGlyph providerId={provider.id} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-gray-200">{provider.label}</span>
                        {(settings.aiRouting.primary?.providerId ?? settings.activeAIProvider) === provider.id && (
                          <span className="rounded-full bg-safe/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-safe">
                            {t('ai.active', { ns: 'settings' })}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span>{t(`ai.connection.${provider.connectionType === 'api-key' ? 'apiKey' : 'local'}`, { ns: 'settings' })}</span>
                        <span>·</span>
                        <span>
                          {t('ai.model', { ns: 'settings', count: discoveredModels > 0 ? discoveredModels : configuredModels })}
                        </span>
                      </div>
                    </div>
                    <span className={clsx('h-2.5 w-2.5 rounded-full shrink-0', status.dotClassName)} />
                  </div>
                  <div className="mt-3 text-[11px] text-gray-500">
                    {status.label} · {status.detail}
                  </div>
                </button>
              )
            })}
          </div>

          {selectedProvider && (
            <div className="rounded-2xl border border-surface-border bg-surface-light p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ProviderGlyph providerId={selectedProvider.id} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-200">{selectedProvider.label}</h4>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-gray-500">
                        {getProviderConnectionHelp(selectedProvider, t)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {getProviderStatusMeta(
                        selectedProvider,
                        settings.aiRouting.primary?.providerId ?? settings.activeAIProvider,
                        testResults,
                        t
                      ).detail}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => void loadModels(selectedProvider.id, true)}
                    disabled={!isProviderConfigured(selectedProvider) || modelResults[selectedProvider.id]?.loading}
                    className="px-3 py-1.5 rounded-lg border border-surface-border text-xs text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors disabled:opacity-60"
                  >
                    {modelResults[selectedProvider.id]?.loading ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 size={11} className="animate-spin" />
                        {t('ai.loadingModels', { ns: 'settings' })}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <RefreshCw size={11} />
                        {t('ai.refreshModels', { ns: 'settings' })}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => void handleTest(selectedProvider.id)}
                    disabled={testing === selectedProvider.id}
                    className="px-3 py-1.5 rounded-lg border border-surface-border text-xs text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors disabled:opacity-60"
                  >
                    {testing === selectedProvider.id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 size={11} className="animate-spin" />
                        {t('ai.testing', { ns: 'settings' })}
                      </span>
                    ) : (
                      t('ai.test', { ns: 'settings' })
                    )}
                  </button>
                  <button
                    onClick={() => void handleDisconnectProvider(selectedProvider)}
                    className="px-3 py-1.5 rounded-lg border border-destructive/30 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    {t('ai.disconnect', { ns: 'settings' })}
                  </button>
                </div>
              </div>

              {testResults[selectedProvider.id] && (
                <div
                  className={clsx(
                    'mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-xs',
                    testResults[selectedProvider.id]?.success
                      ? 'bg-safe/10 text-safe'
                      : 'bg-destructive/10 text-destructive'
                  )}
                >
                  {testResults[selectedProvider.id]?.success ? (
                    <>
                      <CheckCircle2 size={13} />
                      {t('ai.connectionPassed', { ns: 'settings' })}
                    </>
                  ) : (
                    <>
                      <XCircle size={13} />
                      {testResults[selectedProvider.id]?.error || t('ai.connectionFailed', { ns: 'settings' })}
                    </>
                  )}
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">{t('ai.connectionType', { ns: 'settings' })}</label>
                    <div className="flex flex-wrap gap-2">
                      {getProviderConfig(selectedProvider.id).connectionTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => void persistProvider(selectedProvider.id, { connectionType: type })}
                          className={clsx(
                            'rounded-lg border px-3 py-1.5 text-xs transition-colors',
                            selectedProvider.connectionType === type
                              ? 'border-accent bg-accent/10 text-accent-light'
                              : 'border-surface-border bg-surface text-gray-400 hover:text-gray-200 hover:border-gray-500'
                          )}
                        >
                          {t(`ai.connection.${type === 'api-key' ? 'apiKey' : 'local'}`, { ns: 'settings' })}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedProvider.connectionType === 'api-key' && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">{t('ai.apiKey', { ns: 'settings' })}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type={showKeys[selectedProvider.id] ? 'text' : 'password'}
                          value={selectedProvider.apiKey}
                          onChange={(event) => updateProvider(selectedProvider.id, { apiKey: event.target.value })}
                          onBlur={async (event) => {
                            await persistProvider(selectedProvider.id, { apiKey: event.target.value })
                          }}
                          placeholder={t('ai.pasteKey', { ns: 'settings', provider: selectedProvider.label })}
                          className="flex-1 rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent/40"
                        />
                        <button
                          onClick={() => toggleShowKey(selectedProvider.id)}
                          className="p-2 rounded-lg border border-surface-border text-gray-500 hover:text-gray-200 hover:border-gray-500 transition-colors"
                        >
                          {showKeys[selectedProvider.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">{t('ai.baseUrl', { ns: 'settings' })}</label>
                    <input
                      type="text"
                      value={selectedProvider.baseUrl}
                      onChange={(event) => updateProvider(selectedProvider.id, { baseUrl: event.target.value })}
                      onBlur={async (event) => {
                        await persistProvider(selectedProvider.id, { baseUrl: event.target.value })
                      }}
                      className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent/40"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-surface-border bg-surface p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium text-gray-200">{t('ai.availableModels', { ns: 'settings' })}</div>
                        <div className="mt-1 text-[11px] text-gray-500">
                          {modelResults[selectedProvider.id]?.error
                            ? modelResults[selectedProvider.id]?.error
                            : modelResults[selectedProvider.id]?.models.length
                              ? t('ai.modelsDiscovered', {
                                ns: 'settings',
                                count: modelResults[selectedProvider.id]?.models.length ?? 0,
                                provider: selectedProvider.label
                              })
                              : isProviderConfigured(selectedProvider)
                                ? t('ai.loadModels', { ns: 'settings' })
                                : t('ai.connectToDiscover', { ns: 'settings' })}
                        </div>
                      </div>
                      {modelResults[selectedProvider.id]?.models.length ? (
                        <span className="rounded-full bg-safe/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-safe">
                          {t('ai.synced', { ns: 'settings' })}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-surface-border bg-surface p-3">
                    <div className="text-xs font-medium text-gray-200">{t('ai.providerDefaultModel', { ns: 'settings' })}</div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      {t('ai.providerDefaultDescription', { ns: 'settings' })}
                    </div>
                    <input
                      type="text"
                      list={`provider-models-${selectedProvider.id}`}
                      value={selectedProvider.model}
                      onChange={(event) => updateProvider(selectedProvider.id, { model: event.target.value })}
                      onBlur={async (event) => {
                        await persistProvider(selectedProvider.id, { model: event.target.value })
                      }}
                      placeholder={t('ai.defaultModelPlaceholder', { ns: 'settings' })}
                      className="mt-3 w-full rounded-lg border border-surface-border bg-surface-light px-3 py-2 text-xs font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent/40"
                    />
                  </div>
                  <datalist id={`provider-models-${selectedProvider.id}`}>
                    {(modelResults[selectedProvider.id]?.models ?? []).map((model) => (
                      <option key={model} value={model} />
                    ))}
                  </datalist>
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  )

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {!hideHeader && (
        <div className="p-3 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-gray-200">
            {t('title', { ns: 'settings' })}
          </h2>
        </div>
      )}

      <div className="border-b border-surface-border px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors shrink-0',
                activeTab === tab.id
                  ? 'bg-accent/10 text-accent-light border border-accent/20'
                  : 'text-gray-500 border border-transparent hover:text-gray-200 hover:border-surface-border'
              )}
            >
              {tab.icon}
              {t(`tabs.${tab.id}`, { ns: 'settings', defaultValue: tab.label })}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'data' && renderDataTab()}
        {activeTab === 'ai' && renderAITab()}
        {activeTab === 'logs' && renderLogsTab()}
        {activeTab === 'appearance' && renderAppearanceTab()}
        {activeTab === 'about' && renderAboutTab()}
      </div>

      {providerPickerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 backdrop-blur-sm">
          <div className="w-[760px] max-w-[calc(100vw-2rem)] rounded-2xl border border-surface-border bg-surface shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-surface-border">
              <div>
                <div className="text-base font-semibold text-gray-200">{t('ai.pickerTitle', { ns: 'settings' })}</div>
                <div className="text-xs text-gray-500 mt-1">{t('ai.pickerDescription', { ns: 'settings' })}</div>
              </div>
              <button
                onClick={() => setProviderPickerOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-light transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 p-5">
              {settings.aiProviders.map((provider) => {
                const status = getProviderStatusMeta(provider, settings.activeAIProvider, testResults, t)
                return (
                  <button
                    key={provider.id}
                    onClick={() => openConnectModal(provider.id)}
                    className="rounded-2xl border border-surface-border bg-surface-light p-4 text-left hover:border-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ProviderGlyph providerId={provider.id} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-200 truncate">{provider.label}</div>
                        <div className="mt-1 text-xs text-gray-500">{getProviderConfig(provider.id).description}</div>
                      </div>
                      <span className={clsx('h-2.5 w-2.5 rounded-full shrink-0', status.dotClassName)} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                      <span>{status.label}</span>
                      <span>{provider.enabled ? t('ai.configure', { ns: 'settings' }) : t('ai.connect', { ns: 'settings' })}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {connectDraft && (
        <ProviderConnectDialog
          draft={connectDraft}
          provider={settings.aiProviders.find((entry) => entry.id === connectDraft.providerId)!}
          showApiKey={showKeys[connectDraft.providerId]}
          onToggleShowKey={() => toggleShowKey(connectDraft.providerId)}
          onClose={() => setConnectDraft(null)}
          onChange={setConnectDraft}
          onConnect={() => void handleConnectProvider()}
        />
      )}
    </div>
  )
}

function ProviderConnectDialog({
  draft,
  provider,
  showApiKey,
  onToggleShowKey,
  onClose,
  onChange,
  onConnect
}: {
  draft: ProviderConnectionDraft
  provider: AIProvider
  showApiKey: boolean
  onToggleShowKey: () => void
  onClose: () => void
  onChange: (draft: ProviderConnectionDraft) => void
  onConnect: () => void
}): JSX.Element {
  const { t } = useTranslation(['settings', 'common'])
  const catalog = getProviderConfig(provider.id)
  const selectedType = draft.connectionType
  const needsApiKey = selectedType === 'api-key'
  const canConnect =
    selectedType === 'local'
      ? draft.baseUrl.trim().length > 0
      : selectedType === 'api-key'
        ? draft.apiKey.trim().length > 0 && draft.baseUrl.trim().length > 0
        : false

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[720px] max-w-[calc(100vw-2rem)] rounded-2xl border border-surface-border bg-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <ProviderGlyph providerId={provider.id} />
            <div>
              <div className="text-lg font-semibold text-gray-200">
                {t('ai.connectTitle', { ns: 'settings', provider: provider.label })}
              </div>
              <div className="text-xs text-gray-500 mt-1">{t('ai.connectDescription', { ns: 'settings' })}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-light transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {catalog.connectionTypes.map((type) => (
              <button
                key={type}
                onClick={() => onChange({ ...draft, connectionType: type })}
                className={clsx(
                  'rounded-2xl border p-4 text-left transition-colors',
                  selectedType === type
                    ? 'border-accent bg-accent/10'
                    : 'border-surface-border bg-surface-light hover:border-gray-500'
                )}
              >
                <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
                  {type === 'api-key' ? <KeyRound size={14} /> : <Server size={14} />}
                  {t(`ai.connection.${type === 'api-key' ? 'apiKey' : 'local'}`, { ns: 'settings' })}
                </div>
                <div className="mt-2 text-xs text-gray-500 leading-5">
                  {type === 'api-key'
                    ? t('ai.apiKeyConnectionDescription', { ns: 'settings' })
                    : t('ai.localConnectionDescription', { ns: 'settings' })}
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-light p-4 space-y-4">
            {needsApiKey && (
              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <label className="text-xs text-gray-500">{t('ai.apiKey', { ns: 'settings' })}</label>
                  {catalog.apiKeyUrl && (
                    <button
                      onClick={() => void window.electronAPI.openExternal(catalog.apiKeyUrl!)}
                      className="inline-flex items-center gap-1 text-[11px] text-accent-light hover:text-accent transition-colors"
                    >
                      <ExternalLink size={11} />
                      {t('ai.getApiKey', { ns: 'settings' })}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={draft.apiKey}
                      onChange={(event) => onChange({ ...draft, apiKey: event.target.value })}
                      placeholder={
                        provider.id === 'openai'
                          ? 'sk-...'
                          : provider.id === 'anthropic'
                            ? 'sk-ant-...'
                            : provider.id === 'gemini'
                              ? 'AIza...'
                              : ''
                      }
                      className="flex-1 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent/40"
                    />
                  <button
                    onClick={onToggleShowKey}
                    className="p-2 rounded-lg border border-surface-border text-gray-500 hover:text-gray-200 hover:border-gray-500 transition-colors"
                  >
                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                {selectedType === 'local'
                  ? t('ai.localBaseUrl', { ns: 'settings' })
                  : t('ai.baseUrl', { ns: 'settings' })}
              </label>
              <input
                type="text"
                value={draft.baseUrl}
                onChange={(event) => onChange({ ...draft, baseUrl: event.target.value })}
                className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent/40"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-surface-border bg-surface-light/30">
          <div className="text-xs text-gray-500">
            {t('ai.keysStayLocal', { ns: 'settings' })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              {t('actions.cancel', { ns: 'common' })}
            </button>
            <button
              onClick={onConnect}
              disabled={!canConnect}
              className="px-4 py-1.5 rounded-xl bg-accent text-slate-950 text-sm font-medium hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('ai.connectProvider', { ns: 'settings', provider: provider.label })}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProviderGlyph({ providerId }: { providerId: AIProvider['id'] }): JSX.Element {
  const config = getProviderConfig(providerId)
  return (
    <div
      className={clsx(
        'flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br text-lg font-semibold',
        config.glyphTone
      )}
    >
      {config.glyph}
    </div>
  )
}

function SectionHeader({
  icon,
  title
}: {
  icon: JSX.Element
  title: string
}): JSX.Element {
  const { t } = useTranslation('settings')

  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
      {icon}
      {title}
    </div>
  )
}

function SettingToggleCard({
  title,
  description,
  enabled,
  onToggle
}: {
  title: string
  description: string
  enabled: boolean
  onToggle: () => void | Promise<void>
}): JSX.Element {
  const { t } = useTranslation('settings')

  return (
    <button
      type="button"
      onClick={() => void onToggle()}
      className="w-full flex items-center gap-4 rounded-xl border border-surface-border bg-surface-light p-4 text-left transition-colors hover:border-accent/20 hover:bg-surface-light/80"
    >
      <div className="min-w-0 flex-1">
        <span className="text-sm text-gray-200">{title}</span>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <span
        role="switch"
        aria-checked={enabled}
        className={clsx(
          'relative isolate shrink-0 inline-flex h-11 w-28 items-center rounded-full border px-1 transition-all',
          enabled
            ? 'border-accent/30 bg-accent/10 shadow-[0_0_28px_rgba(6,182,212,0.15)]'
            : 'border-gray-500/40 bg-surface-light/60 shadow-inner'
        )}
      >
        <span className="absolute inset-0 rounded-full bg-gradient-to-r from-white/[0.02] via-transparent to-transparent" />
        <span
          className={clsx(
            'absolute top-1 bottom-1 w-[54px] rounded-full border transition-all duration-200',
            enabled
              ? 'left-[52px] border-accent/40 bg-gradient-to-r from-accent to-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.28)]'
              : 'left-1 border-gray-500/30 bg-gradient-to-r from-gray-500/50 to-gray-600/40'
          )}
        />
        <span className="relative z-10 flex w-full items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-[0.22em]">
          <span className={enabled ? 'text-gray-500' : 'text-white'}>{t('toggle.off')}</span>
          <span className={enabled ? 'text-slate-950' : 'text-gray-500'}>{t('toggle.on')}</span>
        </span>
      </span>
    </button>
  )
}
