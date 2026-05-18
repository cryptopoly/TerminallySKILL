import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  ExternalLink,
  AlertTriangle,
  ShieldAlert,
  Shield,
  Star,
  Loader2,
  RefreshCw,
  Sparkles,
  CircleHelp,
  X
} from 'lucide-react'
import { useProjectStore } from '../../store/project-store'
import { useCommandStore } from '../../store/command-store'
import type { CommandDefinition } from '../../../../shared/command-schema'
import { getCommandDisplayDescription, getCommandDisplayName } from '../../lib/command-display'
import type { AICommandTreeGenerationSuggestion } from '../../../../shared/ai-schema'
import { useSettingsStore } from '../../store/settings-store'
import { HelpTip } from '../ui/HelpTip'
import { CommandReferenceHelpPanel } from './CommandReferenceHelpPanel'
import { buildCommandTreeFromReferenceHelp } from '../../lib/reference-help-command-tree'
import {
  findCLIInstallCatalogEntry,
  getPrimaryInstallRecipe
} from '../../../../shared/cli-install-catalog'
import { resolveAIResponseLocale } from '../../../../shared/locale-schema'
import { resolveAppLocale } from '../../i18n'
import { formatDateTime } from '../../i18n/format'

interface CommandHeaderProps {
  command: CommandDefinition
}

const dangerConfig = {
  safe: { icon: Shield, label: 'Safe', className: 'text-safe bg-safe/10 border-safe/20' },
  caution: {
    icon: AlertTriangle,
    label: 'Caution',
    className: 'text-caution bg-caution/10 border-caution/20'
  },
  destructive: {
    icon: ShieldAlert,
    label: 'Destructive',
    className: 'text-destructive bg-destructive/10 border-destructive/20'
  }
}

function getPlatformKind(): 'macos' | 'windows' | 'linux' {
  const platform = window.navigator.userAgent.toLowerCase()
  if (platform.includes('mac')) return 'macos'
  if (platform.includes('win')) return 'windows'
  return 'linux'
}

function getInstallHint(executable: string): string | null {
  const platform = getPlatformKind()
  const catalogEntry = findCLIInstallCatalogEntry(executable)
  const catalogRecipe = catalogEntry ? getPrimaryInstallRecipe(catalogEntry, platform) : null
  if (catalogRecipe) return catalogRecipe.command

  if (platform === 'macos') return `brew install ${executable}`
  if (platform === 'windows') return `winget install ${executable}`
  return `sudo apt install ${executable}`
}

function resolveParsedDescription(fallback: string, description: string | undefined): string {
  const normalized = description?.trim()
  if (!normalized || normalized === 'No description available') {
    return fallback
  }
  return normalized
}

function isTopLevelSubcommand(command: CommandDefinition, executable: string): boolean {
  return (
    command.executable === executable &&
    Array.isArray(command.subcommands) &&
    command.subcommands.length === 1 &&
    command.subcommands[0]?.trim().toLowerCase() !== executable.trim().toLowerCase()
  )
}

function hasStructuredTreeData(command: CommandDefinition, commands: CommandDefinition[]): boolean {
  return (
    (command.options?.length ?? 0) > 0 ||
    (command.positionalArgs?.length ?? 0) > 0 ||
    commands.some((candidate) => isTopLevelSubcommand(candidate, command.executable))
  )
}

function formatGeneratedHelpTimestamp(
  timestamp: string | undefined,
  settings: Parameters<typeof formatDateTime>[1]
): string | null {
  if (!timestamp) return null

  const value = new Date(timestamp)
  if (Number.isNaN(value.getTime())) return null

  return formatDateTime(value, settings)
}

export function CommandHeader({ command }: CommandHeaderProps): JSX.Element {
  const { t } = useTranslation('commandBuilder')
  const danger = dangerConfig[command.dangerLevel || 'safe']
  const DangerIcon = danger.icon
  const activeProject = useProjectStore((s) => s.activeProject)
  const updateProjectInStore = useProjectStore((s) => s.updateProjectInStore)
  const settings = useSettingsStore((s) => s.settings)
  const activeAIProvider = settings.activeAIProvider
  const commands = useCommandStore((s) => s.commands)
  const { updateCommand, addCommands, removeCommand } = useCommandStore()
  const [parsing, setParsing] = useState(false)
  const [aiHelping, setAiHelping] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parseSuccess, setParseSuccess] = useState<string | null>(null)
  const [aiHelpError, setAiHelpError] = useState<string | null>(null)
  const [aiHelpSuccess, setAiHelpSuccess] = useState<string | null>(null)
  const [helpDialogOpen, setHelpDialogOpen] = useState(false)
  const [generatingTreeFromReferenceHelp, setGeneratingTreeFromReferenceHelp] = useState(false)

  const isFavorite = activeProject?.favoriteCommandIds?.includes(command.id) ?? false
  const isDetectedOrManual = command.source === 'detected' || command.source === 'manual'
  const isCliRoot =
    command.tags?.includes('cli-root') === true ||
    ((!command.subcommands || command.subcommands.length === 0) &&
      command.name.trim().toLowerCase() === command.executable.trim().toLowerCase())
  const isRefresh = command.enriched || isCliRoot
  const rootTags = isCliRoot ? [...new Set([...(command.tags ?? []), 'cli-root'])] : command.tags
  const description = getCommandDisplayDescription(command)
  const displayName = getCommandDisplayName(command)
  const hasStructuredTree = useMemo(
    () => hasStructuredTreeData(command, commands),
    [command, commands]
  )
  const showHelpButton =
    !hasStructuredTree &&
    (isDetectedOrManual || isCliRoot) &&
    (!command.subcommands || command.subcommands.length === 0)
  const showInlineReferenceHelp = !hasStructuredTree && Boolean(command.referenceHelp?.content)
  const showTopAIHelpButton = showHelpButton && !command.referenceHelp?.content
  const showSavedHelpIcon = hasStructuredTree && Boolean(command.referenceHelp?.content)
  const savedHelpTimestamp = formatGeneratedHelpTimestamp(command.referenceHelp?.generatedAt, settings)
  const referenceHelpTreeSuggestion = useMemo(
    () => buildCommandTreeFromReferenceHelp(command.referenceHelp?.sections),
    [command.referenceHelp?.sections]
  )

  const applyGeneratedTree = async (
    rootDescription: string,
    rootOptions: CommandDefinition['options'],
    rootPositionalArgs: CommandDefinition['positionalArgs'],
    subcommands: AICommandTreeGenerationSuggestion['subcommands'],
    sourceLabel: '--help' | 'AI' | 'AI Help'
  ): Promise<void> => {
    const enrichedParent: CommandDefinition = {
      ...command,
      description: resolveParsedDescription(command.description, rootDescription),
      options: rootOptions || command.options,
      positionalArgs: rootPositionalArgs || command.positionalArgs,
      enriched: true,
      tags: rootTags
    }
    updateCommand(enrichedParent)

    const allDefinitions: CommandDefinition[] = [enrichedParent]
    const source = command.source || 'detected'
    const existingTopLevelSubcommands = useCommandStore
      .getState()
      .commands.filter((candidate) => isTopLevelSubcommand(candidate, command.executable))

    if (sourceLabel === '--help' && isRefresh) {
      for (const old of existingTopLevelSubcommands) {
        removeCommand(old.id)
      }
    }

    const validSubcommands = subcommands
      .filter((sub) => sub.name.trim().toLowerCase() !== command.executable.trim().toLowerCase())
      .filter((sub, index, items) => items.findIndex((candidate) => candidate.name === sub.name) === index)

    const nextTopLevelSubcommands =
      sourceLabel === 'AI'
        ? (() => {
            const merged = new Map<string, CommandDefinition>()

            for (const existing of existingTopLevelSubcommands) {
              const name = existing.subcommands?.[0]
              if (!name) continue
              merged.set(name, existing)
            }

            for (const sub of validSubcommands) {
              const existing = merged.get(sub.name)
              merged.set(sub.name, {
                id: existing?.id ?? `${source}-${command.executable}-${sub.name}`,
                name: `${command.executable} ${sub.name}`,
                executable: command.executable,
                subcommands: [sub.name],
                description: sub.description || existing?.description || `${command.executable} ${sub.name}`,
                category: command.category || command.executable,
                source: existing?.source ?? source,
                installed: existing?.installed ?? true,
                enriched: true,
                options: sub.options ?? existing?.options,
                positionalArgs: sub.positionalArgs ?? existing?.positionalArgs,
                tags: existing?.tags
              })
            }

            return [...merged.values()]
          })()
        : validSubcommands.map((sub) => ({
            id: `${source}-${command.executable}-${sub.name}`,
            name: `${command.executable} ${sub.name}`,
            executable: command.executable,
            subcommands: [sub.name],
            description: sub.description,
            category: command.category || command.executable,
            source,
            installed: true,
            enriched: true,
            options: sub.options,
            positionalArgs: sub.positionalArgs
          }))

    const newSubcommands: CommandDefinition[] = []

    for (const subDef of nextTopLevelSubcommands) {
      const existing = useCommandStore.getState().commands.find(
        (candidate) =>
          candidate.executable === subDef.executable &&
          candidate.subcommands?.length === 1 &&
          candidate.subcommands[0] === subDef.subcommands?.[0]
      )

      if (existing) {
        const updated = {
          ...existing,
          ...subDef,
          id: existing.id
        }
        updateCommand(updated)
        allDefinitions.push(updated)
        continue
      }

      newSubcommands.push(subDef)
      allDefinitions.push(subDef)
    }

    if (newSubcommands.length > 0) {
      addCommands(newSubcommands)
    }

    try {
      await window.electronAPI.saveEnrichedBulk(command.executable, allDefinitions)
    } catch (saveErr) {
      console.error(`Failed to persist ${sourceLabel} generated command tree:`, saveErr)
    }

    const optionCount = (rootOptions?.length || 0) + validSubcommands.reduce(
      (sum, sub) => sum + (sub.options?.length || 0),
      0
    )
    const positionalCount = (rootPositionalArgs?.length || 0) + validSubcommands.reduce(
      (sum, sub) => sum + (sub.positionalArgs?.length || 0),
      0
    )
    const preservedCount =
      sourceLabel === 'AI'
        ? Math.max(nextTopLevelSubcommands.length - validSubcommands.length, 0)
        : 0

    setParseSuccess(
      `${sourceLabel} generated ${validSubcommands.length} top-level subcommand${validSubcommands.length === 1 ? '' : 's'}` +
      (optionCount > 0 ? ` with ${optionCount} total options` : '') +
      (positionalCount > 0 ? ` and ${positionalCount} positional argument${positionalCount === 1 ? '' : 's'}` : '') +
      (preservedCount > 0 ? ` while preserving ${preservedCount} existing subcommand${preservedCount === 1 ? '' : 's'}` : '')
    )
  }

  const buildPersistedDefinitionsForExecutable = (nextRoot: CommandDefinition): CommandDefinition[] => {
    const executableDefinitions = commands.filter((candidate) => candidate.executable === command.executable)
    const persistedDefinitions = executableDefinitions.map((candidate) =>
      candidate.id === nextRoot.id ? nextRoot : candidate
    )

    if (!persistedDefinitions.some((candidate) => candidate.id === nextRoot.id)) {
      persistedDefinitions.unshift(nextRoot)
    }

    return persistedDefinitions
  }

  useEffect(() => {
    setParseError(null)
    setParseSuccess(null)
    setParsing(false)
    setAiHelpError(null)
    setAiHelpSuccess(null)
    setAiHelping(false)
    setHelpDialogOpen(false)
    setGeneratingTreeFromReferenceHelp(false)
  }, [command.id])

  const handleGenerateTreeFromReferenceHelp = async (): Promise<void> => {
    if (!referenceHelpTreeSuggestion) {
      setAiHelpError(t('referenceHelp.insufficientStructuredHelp'))
      return
    }

    setGeneratingTreeFromReferenceHelp(true)
    setAiHelpError(null)
    setAiHelpSuccess(null)
    setParseError(null)
    setParseSuccess(null)

    try {
      await applyGeneratedTree(
        command.referenceHelp?.sections?.overview || command.description,
        referenceHelpTreeSuggestion.options,
        referenceHelpTreeSuggestion.positionalArgs,
        [],
        'AI Help'
      )
      setAiHelpSuccess(t('referenceHelp.generatedTreeSuccess', { executable: command.executable }))
    } catch (error) {
      console.error('AI help command-tree generation error:', error)
      setAiHelpError(error instanceof Error ? error.message : String(error))
    } finally {
      setGeneratingTreeFromReferenceHelp(false)
    }
  }

  const toggleFavorite = async (): Promise<void> => {
    if (!activeProject) return
    const newFavorites = await window.electronAPI.toggleFavoriteCommand(
      activeProject.id,
      command.id
    )
    updateProjectInStore({
      ...activeProject,
      favoriteCommandIds: newFavorites
    })
  }

  const handleParseHelp = async (): Promise<void> => {
    setParsing(true)
    setParseError(null)
    setParseSuccess(null)
    setAiHelpError(null)
    setAiHelpSuccess(null)
    try {
      const resolvedPath = await window.electronAPI.findCommand(command.executable)
      if (!resolvedPath) {
        const installHint = getInstallHint(command.executable)
        setParseError(
          [
            t('referenceHelp.notFoundForHelp', { executable: command.executable }),
            installHint ? t('referenceHelp.tryInstallHint', { hint: installHint }) : null
          ].filter(Boolean).join('. ')
        )
        return
      }

      const result = await window.electronAPI.parseHelp(command.executable)
      if (!result) {
        setParseError(t('referenceHelp.noStructuredHelp'))
        return
      }

      const topLevelSubcommands = (result.subcommands ?? []).filter((sub) => sub.chain.length === 1)
      const hasStructuredResult =
        (result.options?.length ?? 0) > 0 ||
        (result.positionalArgs?.length ?? 0) > 0 ||
        topLevelSubcommands.length > 0

      if (!hasStructuredResult) {
        setParseError(t('referenceHelp.noMachineHelp'))
        return
      }

      await applyGeneratedTree(
        result.description,
        result.options,
        result.positionalArgs,
        topLevelSubcommands.map((sub) => ({
          name: sub.chain[0],
          description: sub.description,
          options: sub.options,
          positionalArgs: sub.positionalArgs
        })),
        '--help'
      )

      if (activeProject) {
        const category = command.category || command.executable
        if (!activeProject.enabledCategories.includes(category)) {
          const merged = [...new Set([...activeProject.enabledCategories, category])]
          const updated = await window.electronAPI.updateProject(activeProject.id, {
            enabledCategories: merged
          })
          if (updated) updateProjectInStore(updated)
        }
      }
    } catch (err) {
      console.error('Help parse error:', err)
      setParseError(t('referenceHelp.parseFailed'))
    } finally {
      setParsing(false)
    }
  }

  const handleGenerateReferenceHelp = async (): Promise<void> => {
    setAiHelping(true)
    setAiHelpError(null)
    setAiHelpSuccess(null)
    setParseError(null)

    try {
      let response

      try {
        response = await window.electronAPI.runAIAction({
          action: 'command-help',
          command,
          cwd: activeProject?.workingDirectory
        })
      } catch (aiError) {
        const message = aiError instanceof Error ? aiError.message : String(aiError)
        if (!message.includes('Unsupported AI action: command-help')) {
          throw aiError
        }

        response = await window.electronAPI.runAIAction({
          action: 'command-review',
          commandName: command.name,
          commandString: command.name,
          commandDescription: description
        })
      }

      const helpFormat = response.action === 'command-help' ? 'structured-v1' : 'legacy-text'
      const helpSections = response.action === 'command-help' ? response.suggestion : undefined

      const nextCommand: CommandDefinition = {
        ...command,
        enriched: true,
        tags: rootTags,
        referenceHelp: {
          source: 'ai',
          content: response.content,
          generatedAt: new Date().toISOString(),
          providerLabel: response.providerLabel,
          model: response.model,
          locale: resolveAIResponseLocale(settings.aiResponseLocale, resolveAppLocale(settings)),
          format: helpFormat,
          sections: helpSections
        }
      }

      updateCommand(nextCommand)

      try {
        await window.electronAPI.saveEnrichedBulk(
          command.executable,
          buildPersistedDefinitionsForExecutable(nextCommand)
        )
      } catch (saveErr) {
        console.error('Failed to persist AI help:', saveErr)
      }

      setAiHelpSuccess(t('referenceHelp.savedAIHelpSuccess', { executable: command.executable }))
      setHelpDialogOpen(hasStructuredTree)
    } catch (aiError) {
      console.error('AI help generation error:', aiError)
      setAiHelpError(aiError instanceof Error ? aiError.message : String(aiError))
    } finally {
      setAiHelping(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold font-mono text-gray-200">{displayName}</h1>
        {command.source && command.source !== 'builtin' && (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-gray-600/30 text-gray-500 bg-gray-600/10 cursor-default"
            title={command.source === 'detected' ? t('referenceHelp.detectedTitle') : t('referenceHelp.manualTitle')}
          >
            {command.source === 'detected' ? t('referenceHelp.detected') : t('referenceHelp.saved')}
          </span>
        )}
        {showSavedHelpIcon && (
          <HelpTip
            label={t('referenceHelp.savedHelp')}
            description={t('referenceHelp.savedHelpDescription')}
          >
            <button
              type="button"
              onClick={() => setHelpDialogOpen(true)}
              className="text-gray-500 hover:text-accent-light transition-colors"
              title={t('referenceHelp.openSavedHelp')}
            >
              <CircleHelp size={16} />
            </button>
          </HelpTip>
        )}
        {activeProject && (
          <button
            onClick={toggleFavorite}
            className={`transition-colors ${
              isFavorite
                ? 'text-caution'
                : 'text-gray-600 hover:text-caution'
            }`}
            title={isFavorite ? t('commands:favorites.remove') : t('commands:favorites.add')}
          >
            <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        )}
        {command.docsUrl && (
          <a
            href={command.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-gray-500 hover:text-accent-light transition-colors"
            title={t('referenceHelp.openDocumentation')}
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
      <p className="text-sm text-gray-400 mt-2">{description}</p>

      {showHelpButton && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleParseHelp}
              disabled={parsing}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-gray-600/30 bg-gray-600/10 text-gray-300 hover:bg-gray-600/20"
            >
              {parsing ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  {t('referenceHelp.generatingFromHelp')}
                </>
              ) : (
                <>
                  <RefreshCw size={12} />
                  {t('referenceHelp.generateFromHelp')}
                </>
              )}
            </button>
            {showTopAIHelpButton && (
              <button
                type="button"
                onClick={handleGenerateReferenceHelp}
                disabled={aiHelping || !activeAIProvider}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-gray-600/30 bg-gray-600/10 text-accent-light hover:bg-gray-600/20"
                title={
                  activeAIProvider
                    ? t('referenceHelp.generateHelpFromAIEnabled')
                    : t('referenceHelp.generateHelpFromAIDisabled')
                }
              >
                {aiHelping ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    {t('referenceHelp.generatingHelpFromAI')}
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    {t('referenceHelp.generateHelpFromAI')}
                  </>
                )}
              </button>
            )}
          </div>
          {parseError && (
            <p className="text-xs text-destructive mt-1.5">{parseError}</p>
          )}
          {parseSuccess && (
            <p className="text-xs text-safe mt-1.5">{parseSuccess}</p>
          )}
          {aiHelpError && (
            <p className="text-xs text-destructive mt-1.5">{aiHelpError}</p>
          )}
          {aiHelpSuccess && (
            <p className="text-xs text-safe mt-1.5">{aiHelpSuccess}</p>
          )}
        </div>
      )}

      {showInlineReferenceHelp && command.referenceHelp && (
        <CommandReferenceHelpPanel
          help={command.referenceHelp}
          executable={command.executable}
          footer={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {referenceHelpTreeSuggestion && (
                <button
                  type="button"
                  onClick={handleGenerateTreeFromReferenceHelp}
                  disabled={generatingTreeFromReferenceHelp}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-gray-600/30 bg-gray-600/10 text-gray-300 hover:bg-gray-600/20"
                  title={t('referenceHelp.generateTreeFromSavedHelpTitle')}
                >
                  {generatingTreeFromReferenceHelp ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      {t('referenceHelp.generatingCommandTree')}
                    </>
                  ) : (
                    <>
                      <RefreshCw size={12} />
                      {t('referenceHelp.generateTreeFromSavedHelp')}
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerateReferenceHelp}
                disabled={aiHelping || !activeAIProvider}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-gray-600/30 bg-gray-600/10 text-accent-light hover:bg-gray-600/20"
                title={
                  activeAIProvider
                    ? t('referenceHelp.refreshHelpEnabled')
                    : t('referenceHelp.refreshHelpDisabled')
                }
              >
                {aiHelping ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    {t('referenceHelp.refreshingHelpFromAI')}
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    {t('referenceHelp.refreshHelpFromAI')}
                  </>
                )}
              </button>
            </div>
          }
        />
      )}

      {helpDialogOpen &&
        command.referenceHelp?.content &&
        hasStructuredTree &&
        createPortal(
          <div
            className="fixed inset-0 z-[190] bg-black/60 backdrop-blur-[1px] px-4 py-8"
            onClick={() => setHelpDialogOpen(false)}
          >
            <div
              className="mx-auto flex max-h-[calc(100vh-64px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface-light shadow-2xl shadow-black/45"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-surface-border px-5 py-4">
                <CircleHelp size={18} className="text-accent-light" />
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-200">{t('referenceHelp.title', { executable: command.executable })}</h2>
                  <div className="text-xs text-gray-500">
                    {command.referenceHelp.providerLabel ?? t('referenceHelp.aiProviderFallback')}{command.referenceHelp.model ? ` · ${command.referenceHelp.model}` : ''}
                    {savedHelpTimestamp ? ` · ${t('referenceHelp.savedMeta', { timestamp: savedHelpTimestamp })}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHelpDialogOpen(false)}
                  className="ml-auto rounded-lg p-2 text-gray-500 hover:bg-surface hover:text-gray-200 transition-colors"
                  title={t('referenceHelp.closeSavedHelp')}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto">
                <CommandReferenceHelpPanel
                  help={command.referenceHelp}
                  executable={command.executable}
                  showHeader={false}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
