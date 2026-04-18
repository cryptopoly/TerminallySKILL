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
import clsx from 'clsx'
import { useCommandStore } from '../../store/command-store'
import { useSettingsStore } from '../../store/settings-store'
import type {
  AIProvider,
  AIRoutingTarget,
  AIProviderConnectionType,
  TerminalInputMode,
  Theme
} from '../../../../shared/settings-schema'
import type { AppUpdateCheckResult } from '../../../../shared/update-schema'

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

const CONNECTION_LABELS: Record<AIProviderConnectionType, string> = {
  'api-key': 'API Key',
  local: 'Local'
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
  testResults: Record<string, { success: boolean; error?: string } | undefined>
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
      label: 'Not connected',
      detail: 'Available to add',
      dotClassName: 'bg-gray-600'
    }
  }

  if (latest && !latest.success) {
    return {
      tone: 'issue',
      label: 'Needs attention',
      detail: latest.error || 'Last connection test failed',
      dotClassName: 'bg-destructive'
    }
  }

  if (!isProviderConfigured(provider)) {
    return {
      tone: 'issue',
      label: 'Missing details',
      detail: 'Complete the connection fields',
      dotClassName: 'bg-caution'
    }
  }

  if (activeProviderId === provider.id) {
    return {
      tone: 'active',
      label: 'Active',
      detail: 'Used for AI reviews and drafts',
      dotClassName: 'bg-safe'
    }
  }

  return {
    tone: 'ready',
    label: 'Connected',
    detail: 'Ready as backup or alternate provider',
    dotClassName: 'bg-emerald-400'
  }
}

function getProviderConnectionHelp(provider: AIProvider): string {
  if (provider.connectionType === 'local') {
    return 'Local runtime on your machine'
  }
  return 'API key connection'
}

export function SettingsPanel({ hideHeader = false }: { hideHeader?: boolean }): JSX.Element {
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
    setDevUpdateFeedUrl
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
      'Reset all discovered/manual command trees and generated help data?\n\nThis keeps your scripts, snippets, projects, settings, and logs.'
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
    if (!timestamp) return 'No backup created yet'
    const parsed = new Date(timestamp)
    return Number.isNaN(parsed.getTime()) ? timestamp : parsed.toLocaleString()
  }

  const handleUseICloudBackup = async (): Promise<void> => {
    setBackupMessage(null)
    setBackupError(null)

    const suggestion = await window.electronAPI.getDefaultICloudBackupDirectory()
    if (!suggestion.available || !suggestion.path) {
      setBackupError(suggestion.reason ?? 'iCloud Drive is not available right now.')
      return
    }

    await persistSettings({ backupDirectory: suggestion.path })
    setBackupMessage('iCloud Drive backup folder is ready.')
  }

  const handleChooseBackupDirectory = async (): Promise<void> => {
    setBackupMessage(null)
    setBackupError(null)

    const dir = await window.electronAPI.openDirectoryDialog()
    if (!dir) return

    await persistSettings({ backupDirectory: dir })
    setBackupMessage('Backup folder updated.')
  }

  const handleRunBackup = async (): Promise<void> => {
    setBackupMessage(null)
    setBackupError(null)

    const targetDir = settings.backupDirectory.trim()
    if (!targetDir) {
      setBackupError('Choose a backup folder first.')
      return
    }

    setBackingUp(true)
    try {
      const result = await window.electronAPI.createAppDataBackup(targetDir)
      if (!result.success) {
        setBackupError(result.error ?? 'Backup failed.')
        return
      }

      await persistSettings({
        backupDirectory: targetDir,
        lastBackupAt: result.createdAt ?? new Date().toISOString()
      })

      setBackupMessage(
        result.backupPath
          ? `Backup saved to ${result.backupPath}`
          : result.message ?? 'Backup created successfully.'
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
      ? 'Download & Install Update'
      : 'Download & Open Update'

  const installingActionLabel =
    updateCheck?.delivery === 'electron-updater'
      ? 'Installing Update'
      : 'Opening Update'

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

  const renderGeneralTab = (): JSX.Element => (
    <div className="space-y-4">
      <SectionHeader icon={<HelpCircle size={12} />} title="General" />
      <div className="space-y-3">
        <SettingToggleCard
          title="Help Tooltips"
          description="Show richer descriptions when hovering over controls"
          enabled={settings.showHelpTooltips}
          onToggle={async () => {
            const next = !settings.showHelpTooltips
            setShowHelpTooltips(next)
            await window.electronAPI.updateSettings({ showHelpTooltips: next })
          }}
        />

        <div className="rounded-xl border border-surface-border bg-surface-light p-4">
          <div className="mb-3">
            <div className="text-sm font-medium text-gray-200">Startup Behavior</div>
            <div className="text-xs text-gray-500 mt-1">
              Choose what to show when TerminallySKILL launches.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'dashboard', label: 'Show Dashboard', desc: 'Open with the project dashboard showing recent runs and quick actions' },
              { id: 'last-project', label: 'Resume Last Project', desc: 'Auto-open your last used project and restore the previous sidebar tab' }
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
            <div className="text-sm font-medium text-gray-200">Terminal Input</div>
            <div className="text-xs text-gray-500 mt-1">
              Choose between direct shell input and the editor-style command bar.
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
                <span className="block text-sm font-medium">{mode.label}</span>
                <span className="mt-1 block text-xs text-gray-600 leading-5">{mode.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <SettingToggleCard
          title="Safe Paste Mode"
          description="Warn before sending suspicious or multi-line pastes into the shell"
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
              <div className="text-sm font-medium text-gray-200">Reset Command Trees</div>
              <div className="text-xs text-gray-500 mt-1 leading-5">
                Clear discovered/manual commands and generated help-enriched command trees so you can test from a clean command catalog.
              </div>
            </div>
            <button
              onClick={() => void handleResetCommandTrees()}
              className="shrink-0 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              Reset
            </button>
          </div>
          <div className="mt-3 text-[11px] text-gray-600 leading-5">
            Scripts, snippets, projects, settings, and logs are not affected.
          </div>
        </div>
      </div>
    </div>
  )

  const renderLogsTab = (): JSX.Element => (
    <div className="space-y-4">
      <SectionHeader icon={<FolderOpen size={12} />} title="Logs" />
      <div className="space-y-3">
        <SettingToggleCard
          title="Save Terminal Logs"
          description="Auto-save terminal sessions when they close, unless a project overrides this"
          enabled={settings.saveTerminalLogs}
          onToggle={async () => {
            const next = !settings.saveTerminalLogs
            setSaveTerminalLogs(next)
            await window.electronAPI.updateSettings({ saveTerminalLogs: next })
          }}
        />

        <div className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-light p-4 gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-200">Log Storage Folder</div>
            <div className="text-xs text-gray-500 mt-1">Base folder for project-named terminal logs</div>
            <div className="text-[11px] font-mono text-gray-600 mt-2 truncate">
              {settings.logDirectory?.trim() || 'Default (app data folder)'}
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
                Reset
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
              Browse
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAppearanceTab = (): JSX.Element => (
    <div className="space-y-4">
      <SectionHeader icon={<Palette size={12} />} title="Theme" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {([
          { id: 'dark', label: 'Dark Themes', description: 'Low-glare palettes for longer terminal sessions.' },
          { id: 'light', label: 'Light Themes', description: 'Brighter palettes with softer contrast and paper-like surfaces.' }
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
                      <div className="text-sm font-medium">{theme.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{theme.desc}</div>
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
      <SectionHeader icon={<HardDrive size={12} />} title="Data" />
      <div className="space-y-3">
        <div className="rounded-xl border border-surface-border bg-surface-light p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-200">Data Storage</div>
              <div className="text-xs text-gray-500 mt-1 leading-5">
                Move your TerminallySKILL data to a custom folder — useful for Dropbox, Google Drive, or an external drive.
              </div>
            </div>
            <div className="shrink-0">
              <HardDrive size={16} className="text-gray-500" />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-surface-border bg-surface p-3">
            <div className="text-xs uppercase tracking-[0.24em] text-gray-600">Data Folder</div>
            <div className="mt-2 text-sm text-gray-300 break-all">
              {dataDirInfo?.currentPath ?? 'Loading...'}
            </div>
            {dataDirInfo?.isCustom && (
              <div className="mt-2 text-[11px] text-accent-light">Custom location active</div>
            )}
          </div>

          <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 flex items-start gap-2">
            <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
            <span className="text-[11px] text-amber-300/80 leading-4">
              Do not run TerminallySKILL on multiple machines pointing at the same folder simultaneously — this can corrupt your data. Use backups for safe cross-machine sync.
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={async () => {
                const dir = await window.electronAPI.openDirectoryDialog()
                if (!dir) return
                const confirmed = window.confirm(
                  `Move all TerminallySKILL data to:\n${dir}\n\nYour projects, scripts, snippets, settings, and logs will be copied. The app should be restarted after moving.`
                )
                if (!confirmed) return
                setDataDirMoving(true)
                setDataDirMessage(null)
                setDataDirError(null)
                try {
                  await window.electronAPI.moveDataDirectory(dir)
                  const info = await window.electronAPI.getDataDirectoryInfo()
                  setDataDirInfo(info)
                  setDataDirMessage(`Data moved to ${dir}. Restart the app to complete the switch.`)
                } catch (err) {
                  setDataDirError(err instanceof Error ? err.message : 'Failed to move data directory')
                } finally {
                  setDataDirMoving(false)
                }
              }}
              disabled={dataDirMoving}
              className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors disabled:opacity-50"
            >
              {dataDirMoving ? <Loader2 size={12} className="animate-spin" /> : <FolderOpen size={12} />}
              {dataDirMoving ? 'Moving...' : 'Move Data Folder'}
            </button>

            {dataDirInfo?.isCustom && (
              <>
                <button
                  onClick={() => void window.electronAPI.openInExplorer(dataDirInfo.currentPath)}
                  className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
                >
                  <ExternalLink size={12} />
                  Open Folder
                </button>

                <button
                  onClick={async () => {
                    const confirmed = window.confirm(
                      'Move data back to the default location?\n\nAll data will be copied back. The app should be restarted after resetting.'
                    )
                    if (!confirmed) return
                    setDataDirMoving(true)
                    setDataDirMessage(null)
                    setDataDirError(null)
                    try {
                      await window.electronAPI.resetDataDirectory()
                      const info = await window.electronAPI.getDataDirectoryInfo()
                      setDataDirInfo(info)
                      setDataDirMessage('Data moved back to default location. Restart the app to complete.')
                    } catch (err) {
                      setDataDirError(err instanceof Error ? err.message : 'Failed to reset data directory')
                    } finally {
                      setDataDirMoving(false)
                    }
                  }}
                  disabled={dataDirMoving}
                  className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} />
                  Reset to Default
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
              <div className="text-sm font-medium text-gray-200">Backups</div>
              <div className="text-xs text-gray-500 mt-1 leading-5">
                Save snapshot backups of your TerminallySKILL data folder to iCloud Drive or another folder. API secrets are intentionally excluded.
              </div>
            </div>
            <div className="shrink-0 rounded-full border border-surface-border bg-surface px-2.5 py-1 text-[11px] text-gray-400">
              {isMac ? 'iCloud-ready' : 'Manual snapshots'}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-surface-border bg-surface p-3">
            <div className="text-xs uppercase tracking-[0.24em] text-gray-600">Backup Folder</div>
            <div className="mt-2 text-sm text-gray-300 break-all">
              {settings.backupDirectory?.trim() || 'Not configured yet'}
            </div>
            <div className="mt-3 text-[11px] text-gray-500">
              Last backup: {formatSavedTimestamp(settings.lastBackupAt)}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {isMac && (
              <button
                onClick={() => void handleUseICloudBackup()}
                className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
              >
                <Cloud size={12} />
                Use iCloud Drive
              </button>
            )}

            <button
              onClick={() => void handleChooseBackupDirectory()}
              className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
            >
              <FolderOpen size={12} />
              Browse
            </button>

            {settings.backupDirectory?.trim() && (
              <button
                onClick={() => void window.electronAPI.openInExplorer(settings.backupDirectory)}
                className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
              >
                <ExternalLink size={12} />
                Open Folder
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
              {backingUp ? 'Backing Up' : 'Back Up Now'}
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
      <SectionHeader icon={<Sparkles size={12} />} title="About" />
      <div className="space-y-3">
        <div className="rounded-xl border border-surface-border bg-surface-light p-4">
          <div className="text-sm font-medium text-gray-200">TerminallySKILL</div>
          <div className="text-xs text-gray-500 mt-1">Prompt-aware terminal workspace, workflows, logs, and AI helpers.</div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
            <span className="rounded-full border border-surface-border bg-surface px-2.5 py-1 font-mono text-gray-300">
              Version {appVersion}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-light p-4 space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-200">App Updates</div>
            <div className="text-xs text-gray-500 mt-1">
              Check a release feed for newer builds, then download and open the matching installer in one click.
            </div>
          </div>

          <SettingToggleCard
            title="Check for Updates on Startup"
            description="Automatically check the configured release feed when TerminallySKILL launches"
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
                  Checking
                </>
              ) : (
                <>
                  <RefreshCw size={12} />
                  Check for Updates
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
                      <div className="text-[11px] uppercase tracking-[0.16em] text-gray-600">Current</div>
                      <div className="mt-1 text-sm font-mono text-gray-200">{updateCheck.currentVersion}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-gray-600">Latest</div>
                      <div className="mt-1 text-sm font-mono text-gray-200">{updateCheck.latestVersion ?? 'No release found'}</div>
                    </div>
                  </div>

                  {updateCheck.feedUrl && (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-gray-600">Resolved Feed</div>
                      <div className="mt-1 truncate text-xs font-mono text-gray-400">{updateCheck.feedUrl}</div>
                    </div>
                  )}

                  {(updateCheck.assetLabel || updateCheck.fileName || updateCheck.publishedAt) && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-gray-600">Asset</div>
                        <div className="mt-1 text-xs text-gray-300">{updateCheck.assetLabel ?? updateCheck.fileName ?? 'Auto-selected platform build'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-gray-600">Published</div>
                        <div className="mt-1 text-xs text-gray-300">
                          {updateCheck.publishedAt
                            ? new Date(updateCheck.publishedAt).toLocaleString()
                            : new Date(updateCheck.checkedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {updateCheck.notes && (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-gray-600">Release Notes</div>
                      <div className="mt-1 whitespace-pre-wrap text-xs leading-6 text-gray-300">{updateCheck.notes}</div>
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
          <div className="text-sm font-medium text-gray-200">Support</div>
          <div className="text-xs text-gray-500 mt-1 leading-5">
            TerminallySKILL is a solo indie project. If it&apos;s useful to you, tips help keep it going.
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => void window.electronAPI.openExternal('https://buymeacoffee.com/cryptoraptor')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
            >
              <ExternalLink size={12} />
              Buy me a coffee
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
            <h3 className="text-sm font-semibold text-gray-200">AI Providers</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Configure the providers this app can use for reviews, drafts, and fixes.
          </p>
        </div>
        <button
          onClick={() => setProviderPickerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-slate-950 text-sm font-medium hover:bg-cyan-300 transition-colors shrink-0"
        >
          <Plus size={14} />
          Add Provider
        </button>
      </div>

      {enabledProviders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface-light/60 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent-light">
            <Bot size={20} />
          </div>
          <div className="mt-4 text-sm font-medium text-gray-200">No providers connected yet</div>
          <div className="mt-1 text-xs text-gray-500">
            Add OpenAI, Anthropic, or Ollama and pick which one should handle AI actions.
          </div>
          <button
            onClick={() => setProviderPickerOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-accent/30 text-sm text-accent-light hover:border-accent hover:bg-accent/10 transition-colors"
          >
            <Plus size={14} />
            Add Provider
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-surface-border bg-surface-light p-4 space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-200">AI Routing</div>
              <div className="mt-1 text-xs text-gray-500">
                Pick one primary provider/model pair, then stack cross-provider fallbacks in order.
              </div>
            </div>

            <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Primary Provider</label>
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
                  <option value="">Select provider</option>
                  {enabledProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Primary Model</label>
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
                  placeholder="Primary model id"
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
              <label className="block text-xs text-gray-500 mb-1.5">Fallback Chain</label>
              <div className="rounded-xl border border-surface-border bg-surface p-3">
                <div className="flex flex-wrap gap-2">
                  {settings.aiRouting.fallbacks.length === 0 && (
                    <span className="text-xs text-gray-600">No cross-provider fallbacks yet</span>
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
                    <option value="">Fallback provider</option>
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
                    placeholder="Fallback model id"
                    className="rounded-lg border border-surface-border bg-surface-light px-3 py-2 text-xs font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent/40"
                  />
                  <button
                    onClick={() => void addRoutingFallback()}
                    className="px-3 py-2 rounded-lg border border-surface-border text-xs text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors"
                  >
                    Add
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
              const status = getProviderStatusMeta(provider, activeProviderId, testResults)
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
                            Active
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span>{CONNECTION_LABELS[provider.connectionType]}</span>
                        <span>·</span>
                        <span>
                          {discoveredModels > 0 ? discoveredModels : configuredModels} model
                          {(discoveredModels > 1 || configuredModels > 1) ? 's' : ''}
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
                        {getProviderConnectionHelp(selectedProvider)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {getProviderStatusMeta(
                        selectedProvider,
                        settings.aiRouting.primary?.providerId ?? settings.activeAIProvider,
                        testResults
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
                        Loading Models
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <RefreshCw size={11} />
                        Refresh Models
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
                        Testing
                      </span>
                    ) : (
                      'Test'
                    )}
                  </button>
                  <button
                    onClick={() => void handleDisconnectProvider(selectedProvider)}
                    className="px-3 py-1.5 rounded-lg border border-destructive/30 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    Disconnect
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
                      Connection test passed
                    </>
                  ) : (
                    <>
                      <XCircle size={13} />
                      {testResults[selectedProvider.id]?.error || 'Connection failed'}
                    </>
                  )}
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Connection Type</label>
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
                          {CONNECTION_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedProvider.connectionType === 'api-key' && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">API Key</label>
                      <div className="flex items-center gap-2">
                        <input
                          type={showKeys[selectedProvider.id] ? 'text' : 'password'}
                          value={selectedProvider.apiKey}
                          onChange={(event) => updateProvider(selectedProvider.id, { apiKey: event.target.value })}
                          onBlur={async (event) => {
                            await persistProvider(selectedProvider.id, { apiKey: event.target.value })
                          }}
                          placeholder={`Paste ${selectedProvider.label} key`}
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
                    <label className="block text-xs text-gray-500 mb-1.5">Base URL</label>
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
                        <div className="text-xs font-medium text-gray-200">Available Models</div>
                        <div className="mt-1 text-[11px] text-gray-500">
                          {modelResults[selectedProvider.id]?.error
                            ? modelResults[selectedProvider.id]?.error
                            : modelResults[selectedProvider.id]?.models.length
                              ? `${modelResults[selectedProvider.id]?.models.length} models discovered from ${selectedProvider.label}`
                              : isProviderConfigured(selectedProvider)
                                ? 'Load provider models to get searchable pickers.'
                                : 'Connect this provider to discover models.'}
                        </div>
                      </div>
                      {modelResults[selectedProvider.id]?.models.length ? (
                        <span className="rounded-full bg-safe/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-safe">
                          Synced
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-surface-border bg-surface p-3">
                    <div className="text-xs font-medium text-gray-200">Provider Default Model</div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      Used as the suggested model when you choose this provider for primary routing.
                    </div>
                    <input
                      type="text"
                      list={`provider-models-${selectedProvider.id}`}
                      value={selectedProvider.model}
                      onChange={(event) => updateProvider(selectedProvider.id, { model: event.target.value })}
                      onBlur={async (event) => {
                        await persistProvider(selectedProvider.id, { model: event.target.value })
                      }}
                      placeholder="Default model id"
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
          <h2 className="text-sm font-semibold text-gray-200">Settings</h2>
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
              {tab.label}
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
                <div className="text-base font-semibold text-gray-200">Add AI Provider</div>
                <div className="text-xs text-gray-500 mt-1">Pick a provider and then choose how this app should connect to it.</div>
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
                const status = getProviderStatusMeta(provider, settings.activeAIProvider, testResults)
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
                      <span>{provider.enabled ? 'Configure' : 'Connect'}</span>
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
              <div className="text-lg font-semibold text-gray-200">Connect {provider.label}</div>
              <div className="text-xs text-gray-500 mt-1">Choose how TerminallySKILL should talk to this provider.</div>
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
                  {CONNECTION_LABELS[type]}
                </div>
                <div className="mt-2 text-xs text-gray-500 leading-5">
                  {type === 'api-key'
                    ? 'Paste a key and keep full app access local.'
                    : 'Connect to a local runtime on your machine.'}
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-light p-4 space-y-4">
            {needsApiKey && (
              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <label className="text-xs text-gray-500">API Key</label>
                  {catalog.apiKeyUrl && (
                    <button
                      onClick={() => void window.electronAPI.openExternal(catalog.apiKeyUrl!)}
                      className="inline-flex items-center gap-1 text-[11px] text-accent-light hover:text-accent transition-colors"
                    >
                      <ExternalLink size={11} />
                      Get API key
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
                {selectedType === 'local' ? 'Local Base URL' : 'Base URL'}
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
            API keys stay local and use system-protected storage when available.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConnect}
              disabled={!canConnect}
              className="px-4 py-1.5 rounded-xl bg-accent text-slate-950 text-sm font-medium hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Connect {provider.label}
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
          <span className={enabled ? 'text-gray-500' : 'text-white'}>Off</span>
          <span className={enabled ? 'text-slate-950' : 'text-gray-500'}>On</span>
        </span>
      </span>
    </button>
  )
}
