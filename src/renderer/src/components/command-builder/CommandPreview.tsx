import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { Copy, Play, Check, Terminal, Sparkles, Loader2, X, RotateCcw, Plus, ShieldCheck, Wand2, SendHorizontal } from 'lucide-react'
import { useBuilderStore } from '../../store/builder-store'
import { useCommandStore } from '../../store/command-store'
import { resolveProjectTerminalContext, useTerminalStore } from '../../store/terminal-store'
import { useProjectStore } from '../../store/project-store'
import { useSettingsStore } from '../../store/settings-store'
import { serializeCommand } from '../../lib/command-serializer'
import { buildSavedCommandDefinition } from '../../lib/terminal-promotion'
import { AddToScriptMenu } from '../scripts/AddToScriptMenu'
import { HelpTip } from '../ui/HelpTip'
import type { AICommandGenerationSuggestion } from '../../../../shared/ai-schema'
import type { CommandDefinition } from '../../../../shared/command-schema'
import {
  buildProjectExecutionCommand,
  createProjectTerminalSession,
  ensureProjectExecutionSession
} from '../../lib/workspace-session'

interface CommandPreviewProps {
  command: CommandDefinition
}

export function CommandPreview({ command }: CommandPreviewProps): JSX.Element {
  const { t } = useTranslation('commandBuilder')
  const values = useBuilderStore((s) => s.values)
  const setValues = useBuilderStore((s) => s.setValues)
  const allCommands = useCommandStore((s) => s.commands)
  const addCommands = useCommandStore((s) => s.addCommands)
  const setActiveCommand = useCommandStore((s) => s.setActiveCommand)
  const { addSession, activeSessionId, splitSessionId, sessions, addToHistory, setTerminalVisible } = useTerminalStore()
  const activeProject = useProjectStore((s) => s.activeProject)
  const activeAIProvider = useSettingsStore((s) => s.settings.activeAIProvider)
  const [copied, setCopied] = useState(false)
  const [manualCommandString, setManualCommandString] = useState<string | null>(null)
  const [isPreviewEditing, setIsPreviewEditing] = useState(false)
  const [aiReview, setAIReview] = useState<string | null>(null)
  const [aiReviewMeta, setAIReviewMeta] = useState<{ providerLabel: string; model: string } | null>(null)
  const [aiLoading, setAILoading] = useState(false)
  const [aiError, setAIError] = useState<string | null>(null)
  const [showAIReview, setShowAIReview] = useState(false)
  const [showAIGenerator, setShowAIGenerator] = useState(false)
  const [aiPrompt, setAIPrompt] = useState('')
  const [aiDraft, setAIDraft] = useState<AICommandGenerationSuggestion | null>(null)
  const [aiDraftMeta, setAIDraftMeta] = useState<{ providerLabel: string; model: string } | null>(null)
  const [aiDraftLoading, setAIDraftLoading] = useState(false)
  const [aiDraftError, setAIDraftError] = useState<string | null>(null)
  const [addingCommand, setAddingCommand] = useState(false)
  const [addCommandFeedback, setAddCommandFeedback] = useState<string | null>(null)
  const [executeError, setExecuteError] = useState<string | null>(null)
  const previewInputRef = useRef<HTMLTextAreaElement>(null)
  const { activeProjectSessionId } = useMemo(
    () => resolveProjectTerminalContext(sessions, activeProject?.id ?? null, activeSessionId, splitSessionId),
    [activeProject?.id, activeSessionId, sessions, splitSessionId]
  )

  const builderCommandString = serializeCommand(command, values)
  const commandString = manualCommandString ?? builderCommandString
  const aiDraftCommandString = useMemo(
    () => (aiDraft ? serializeCommand(command, aiDraft.values) : ''),
    [aiDraft, command]
  )

  const beginPreviewEdit = useCallback((): void => {
    setIsPreviewEditing(true)
    requestAnimationFrame(() => {
      const input = previewInputRef.current
      if (!input) return
      input.focus()
      const length = input.value.length
      input.setSelectionRange(length, length)
    })
  }, [])

  // Detect when running a bare command that expects subcommands or arguments.
  // Only applies to cli-root commands (e.g. git, docker) where running bare
  // is meaningless. Plain executables including Windows .exe commands should
  // always be runnable on their own.
  const requiresSubcommandSelection = useMemo(() => {
    const isBareCommand = commandString.trim() === command.executable

    if (!isBareCommand) return false
    if (!command.tags?.includes('cli-root')) return false

    return allCommands.some(
      (c) =>
        c.executable === command.executable &&
        c.id !== command.id &&
        c.subcommands &&
        c.subcommands.length > 0
    )
  }, [allCommands, command.executable, command.id, command.tags, commandString])

  const missingRequiredArgs = useMemo(
    () =>
      manualCommandString
        ? []
        :
      (command.positionalArgs ?? []).filter((arg) => {
        if (!arg.required) return false
        const value = values[arg.id]
        if (arg.variadic) {
          return !Array.isArray(value) || value.every((entry) => !String(entry ?? '').trim())
        }
        return typeof value !== 'string' || value.trim().length === 0
      }),
    [command.positionalArgs, manualCommandString, values]
  )

  const executeDisabledReason = useMemo(() => {
    if (requiresSubcommandSelection) {
      return 'Select a subcommand from the command tree before executing'
    }
    if (missingRequiredArgs.length > 0) {
      return `Fill in the required argument${missingRequiredArgs.length === 1 ? '' : 's'} before executing`
    }
    return null
  }, [missingRequiredArgs.length, requiresSubcommandSelection])

  const canAddCommand = useMemo(() => {
    const normalized = commandString.trim()
    if (!normalized) return false
    if (manualCommandString !== null) return false
    return normalized !== command.executable.trim()
  }, [command.executable, commandString, manualCommandString])

  const handleCopy = async (): Promise<void> => {
    await window.electronAPI.writeClipboard(commandString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAIReview = useCallback(async (): Promise<void> => {
    setAILoading(true)
    setAIError(null)
    try {
      const response = await window.electronAPI.runAIAction({
        action: 'command-review',
        commandName: command.name,
        commandDescription: command.description,
        commandString
      })
      setAIReview(response.content)
      setAIReviewMeta({
        providerLabel: response.providerLabel,
        model: response.model
      })
    } catch (error) {
      setAIError(error instanceof Error ? error.message : String(error))
      setAIReview(null)
      setAIReviewMeta(null)
    } finally {
      setAILoading(false)
    }
  }, [command.name, command.description, commandString])

  const handleAIGenerate = useCallback(async (): Promise<void> => {
    if (!aiPrompt.trim()) {
      setAIDraftError(t('preview.errors.aiPromptRequired'))
      setAIDraft(null)
      setAIDraftMeta(null)
      return
    }

    setAIDraftLoading(true)
    setAIDraftError(null)
    try {
      const response = await window.electronAPI.runAIAction({
        action: 'command-generation',
        prompt: aiPrompt.trim(),
        command,
        currentValues: values,
        cwd: activeProject?.workingDirectory
      })

      if (response.action !== 'command-generation') {
        throw new Error('AI provider returned an unexpected response')
      }

      setAIDraft(response.suggestion)
      setAIDraftMeta({
        providerLabel: response.providerLabel,
        model: response.model
      })
    } catch (error) {
      setAIDraftError(error instanceof Error ? error.message : String(error))
      setAIDraft(null)
      setAIDraftMeta(null)
    } finally {
      setAIDraftLoading(false)
    }
  }, [aiPrompt, command, values, activeProject?.workingDirectory, t])

  const handleAddCommand = useCallback(async (): Promise<void> => {
    if (!canAddCommand) return

    setAddingCommand(true)
    setAddCommandFeedback(null)

    try {
      const normalizedCommand = commandString.trim().replace(/\s+/g, ' ')
      const existing = allCommands.find(
        (candidate) =>
          candidate.tags?.includes('saved-command') &&
          candidate.executable === command.executable &&
          candidate.name.trim().toLowerCase() === normalizedCommand.toLowerCase()
      )

      const nextCommand = buildSavedCommandDefinition(
        command,
        normalizedCommand,
        values,
        existing?.id
      )

      const persistedDefinitions = [
        ...allCommands.filter(
          (candidate) =>
            candidate.executable === command.executable &&
            candidate.id !== nextCommand.id
        ),
        nextCommand
      ]

      await window.electronAPI.saveEnrichedBulk(command.executable, persistedDefinitions)

      addCommands([nextCommand])
      setActiveCommand(nextCommand)
      setAddCommandFeedback(existing ? 'Updated saved command' : 'Added command')
      window.setTimeout(() => setAddCommandFeedback(null), 2200)
    } catch (error) {
      console.error('Failed to save command preset:', error)
      setAddCommandFeedback('Failed to add command')
      window.setTimeout(() => setAddCommandFeedback(null), 3200)
    } finally {
      setAddingCommand(false)
    }
  }, [addCommands, allCommands, canAddCommand, command, commandString, setActiveCommand, values])

  useEffect(() => {
    setManualCommandString(null)
    setIsPreviewEditing(false)
    setAIReview(null)
    setAIReviewMeta(null)
    setAIError(null)
    setAILoading(false)
    setShowAIReview(false)
    setShowAIGenerator(false)
    setAIPrompt('')
    setAIDraft(null)
    setAIDraftMeta(null)
    setAIDraftError(null)
    setAIDraftLoading(false)
    setAddingCommand(false)
    setAddCommandFeedback(null)
    setExecuteError(null)
  }, [command.id])

  useEffect(() => {
    if (manualCommandString !== null && manualCommandString === builderCommandString) {
      setManualCommandString(null)
    }
  }, [builderCommandString, manualCommandString])

  useEffect(() => {
    const handleOpenDraft = (event: Event): void => {
      const customEvent = event as CustomEvent<{ prompt?: string }>
      setShowAIGenerator(true)
      setAIDraftError(null)
      setAIDraft(null)
      setAIDraftMeta(null)
      if (typeof customEvent.detail?.prompt === 'string') {
        setAIPrompt(customEvent.detail.prompt)
      }
    }

    window.addEventListener('tv:open-ai-draft', handleOpenDraft as EventListener)
    return () => {
      window.removeEventListener('tv:open-ai-draft', handleOpenDraft as EventListener)
    }
  }, [])


  /** Execute the command in a specific terminal session (existing or new) */
  const executeInSession = useCallback(async (forceNew: boolean): Promise<void> => {
    const envOverrides = useProjectStore.getState().getActiveEnvOverrides()
    let sessionId = forceNew ? null : activeProjectSessionId
    if (!sessionId) {
      sessionId = await createProjectTerminalSession(
        activeProject,
        addSession,
        envOverrides
      )
    } else if (!forceNew) {
      sessionId = await ensureProjectExecutionSession(
        activeProject,
        sessionId,
        (candidateId) =>
          useTerminalStore.getState().sessions.find((session) => session.id === candidateId)?.mode ?? null,
        addSession,
        envOverrides
      )
    }
    setTerminalVisible(true)
    addToHistory(commandString)
    window.electronAPI.writeToTerminal(
      sessionId,
      buildProjectExecutionCommand(activeProject, commandString, envOverrides) + '\n'
    )

    if (activeProject) {
      window.electronAPI.addRecentCommand(activeProject.id, command.id, commandString)
    }
  }, [activeProjectSessionId, commandString, command.id, activeProject, addSession, addToHistory, setTerminalVisible])

  const handleExecute = useCallback((): void => {
    if (executeDisabledReason) return
    setExecuteError(null)
    void executeInSession(false).catch((error) => {
      console.error('Failed to execute command:', error)
      setExecuteError(error instanceof Error ? error.message : t('preview.errors.executeFailed'))
    })
  }, [executeDisabledReason, executeInSession, t])

  return (
    <div className="sticky bottom-0 bg-surface border-t border-surface-border px-4 py-2 shadow-lg shadow-black/20">
      <div className="pb-1">
        <div className="flex items-center gap-2 pr-1">
        <HelpTip label={t('preview.title')} description={t('preview.description')}>
          <span className="flex items-center justify-center shrink-0 text-gray-500">
            <Terminal size={22} />
          </span>
        </HelpTip>
        {manualCommandString !== null && (
          <HelpTip label={t('preview.resetToBuilder')} description={t('preview.resetDescription')}>
            <button
              onClick={() => setManualCommandString(null)}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-surface-lighter border border-surface-border text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors shrink-0"
            >
              <RotateCcw size={16} />
            </button>
          </HelpTip>
        )}
        <div className="min-w-0 flex-1 rounded-lg border border-surface-border bg-surface-light h-[42px]">
          {isPreviewEditing ? (
            <input
              ref={previewInputRef as unknown as React.RefObject<HTMLInputElement>}
              type="text"
              value={commandString}
              onBlur={() => setIsPreviewEditing(false)}
              onChange={(event) => {
                const nextValue = event.target.value
                setManualCommandString(nextValue === builderCommandString ? null : nextValue)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  setIsPreviewEditing(false)
                  ;(event.target as HTMLInputElement).blur()
                  handleExecute()
                } else if (event.key === 'Escape') {
                  setIsPreviewEditing(false)
                  ;(event.target as HTMLInputElement).blur()
                }
              }}
              spellCheck={false}
              autoComplete="off"
              className="w-full h-full rounded-lg bg-transparent px-4 font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder={t('preview.editPlaceholder')}
            />
          ) : (
            <div
              onClick={beginPreviewEdit}
              className="h-full flex items-center cursor-text overflow-x-auto px-4 font-mono text-sm text-gray-200"
              title={t('preview.clickToEdit')}
            >
              <div className="whitespace-nowrap">
                <CommandHighlight command={commandString} />
              </div>
            </div>
          )}
        </div>
        <HelpTip label={copied ? t('preview.copied') : t('preview.copy')} description={t('preview.copyDescription')}>
          <button
            onClick={handleCopy}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-surface-lighter border border-surface-border text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors shrink-0"
          >
            {copied ? <Check size={16} className="text-safe" /> : <Copy size={16} />}
          </button>
        </HelpTip>
        <HelpTip
          label={t('preview.addCommand')}
          description={
            manualCommandString !== null
              ? t('preview.addManualFirst')
              : t('preview.addCurrent')
          }
        >
          <button
            onClick={() => void handleAddCommand()}
            disabled={!canAddCommand || addingCommand}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-surface-lighter border border-surface-border text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {addingCommand ? (
              <Loader2 size={16} className="animate-spin" />
            ) : addCommandFeedback === 'Added command' || addCommandFeedback === 'Updated saved command' ? (
              <Check size={16} className="text-safe" />
            ) : (
              <Plus size={16} />
            )}
          </button>
        </HelpTip>
        <AddToScriptMenu
          commandString={commandString}
          commandId={command.id}
          commandName={command.name}
        />
        <HelpTip
          label={t('preview.aiReview')}
          description={
            activeAIProvider
              ? t('preview.aiReviewEnabled')
              : t('preview.aiReviewDisabled')
          }
        >
          <button
            onClick={() => {
              setShowAIReview(true)
              void handleAIReview()
            }}
            disabled={aiLoading}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-surface-lighter border border-surface-border text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          </button>
        </HelpTip>
        <HelpTip
          label={t('preview.aiDraft')}
          description={
            activeAIProvider
              ? t('preview.aiDraftEnabled')
              : t('preview.aiDraftDisabled')
          }
        >
          <button
            onClick={() => {
              setShowAIGenerator(true)
              setAIDraftError(null)
            }}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-surface-lighter border border-surface-border text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors shrink-0"
          >
            <Wand2 size={16} />
          </button>
        </HelpTip>
        <HelpTip
          label={t('preview.execute')}
          description={executeDisabledReason ?? t('preview.runInTerminal')}
          shortcut="Enter"
        >
          <button
            onClick={handleExecute}
            disabled={Boolean(executeDisabledReason)}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-accent hover:bg-accent-light text-white transition-colors shrink-0 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-accent"
          >
            <Play size={16} />
          </button>
        </HelpTip>
        </div>
      </div>
      {executeError && (
        <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {executeError}
        </div>
      )}
      {showAIReview && createPortal(
        <AIReviewDialog
          loading={aiLoading}
          error={aiError}
          review={aiReview}
          meta={aiReviewMeta}
          commandString={commandString}
          onRerun={() => void handleAIReview()}
          onClose={() => {
            if (aiLoading) return
            setShowAIReview(false)
            setAIReview(null)
            setAIReviewMeta(null)
            setAIError(null)
          }}
        />,
        document.body
      )}
      {showAIGenerator && createPortal(
        <AICommandDraftDialog
          prompt={aiPrompt}
          onPromptChange={setAIPrompt}
          onClose={() => {
            if (aiDraftLoading) return
            setShowAIGenerator(false)
          }}
          onGenerate={() => void handleAIGenerate()}
          onApplyToPreview={() => {
            if (!aiDraftCommandString) return
            setManualCommandString(aiDraftCommandString)
            setShowAIGenerator(false)
          }}
          onApply={() => {
            if (!aiDraft) return
            setValues(aiDraft.values)
            setManualCommandString(null)
            setShowAIGenerator(false)
          }}
          loading={aiDraftLoading}
          error={aiDraftError}
          suggestion={aiDraft}
          suggestionMeta={aiDraftMeta}
          suggestionCommand={aiDraftCommandString}
        />,
        document.body
      )}
    </div>
  )
}

function AIReviewDialog(props: {
  loading: boolean
  error: string | null
  review: string | null
  meta: { providerLabel: string; model: string } | null
  commandString: string
  onRerun: () => void
  onClose: () => void
}): JSX.Element {
  const { t } = useTranslation('commandBuilder')
  const { loading, error, review, meta, commandString, onRerun, onClose } = props
  const [followUps, setFollowUps] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [followUpInput, setFollowUpInput] = useState('')
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset follow-ups when review changes (re-run)
  useEffect(() => {
    setFollowUps([])
    setFollowUpInput('')
  }, [review])

  const sendFollowUp = useCallback(async () => {
    const question = followUpInput.trim()
    if (!question || followUpLoading) return

    const currentFollowUps = [...followUps, { role: 'user' as const, content: question }]
    setFollowUps(currentFollowUps)
    setFollowUpInput('')
    setFollowUpLoading(true)

    const conversation = [
      review ? `AI: ${review}` : null,
      ...currentFollowUps.slice(0, -1).map((m) =>
        m.role === 'user' ? `User: ${m.content}` : `AI: ${m.content}`
      )
    ]
      .filter(Boolean)
      .join('\n\n')

    try {
      const response = await window.electronAPI.runAIAction({
        action: 'chat-followup',
        context: commandString,
        conversation,
        question
      })
      setFollowUps((prev) => [...prev, { role: 'assistant', content: response.content }])
    } catch (err) {
      setFollowUps((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : String(err)}` }
      ])
    } finally {
      setFollowUpLoading(false)
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      })
    }
  }, [followUpInput, followUpLoading, followUps, review, commandString])

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center overflow-y-auto p-6">
      <div className="w-full max-w-3xl max-h-[calc(100vh-3rem)] rounded-2xl border border-surface-border bg-surface-light shadow-2xl shadow-black/50 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-surface-border shrink-0">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-accent-light" />
            <div>
              <h3 className="text-lg font-semibold text-gray-200">{t('aiReview.title')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('aiReview.description')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading || followUpLoading}
            className="rounded-lg p-2 text-gray-400 hover:text-gray-200 hover:bg-surface transition-colors disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-surface-border/60 shrink-0">
          <div className="rounded-lg border border-surface-border bg-surface px-3 py-2.5 font-mono text-sm text-gray-200 whitespace-pre-wrap break-all">
            {commandString}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
              <Loader2 size={16} className="animate-spin" />
              {t('aiReview.reviewing')}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4">
              <div className="text-sm text-destructive whitespace-pre-wrap">{error}</div>
            </div>
          )}
          {review && (
            <div className="text-sm text-gray-200 whitespace-pre-wrap leading-6">{review}</div>
          )}
          {followUps.map((msg, i) =>
            msg.role === 'user' ? (
              <div key={i} className="flex items-start gap-3 justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-accent/15 border border-accent/20 px-4 py-2.5">
                  <div className="text-sm text-gray-200 whitespace-pre-wrap leading-6">{msg.content}</div>
                </div>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-3">
                <ShieldCheck size={16} className="text-accent-light shrink-0 mt-1" />
                <div className="text-sm text-gray-200 whitespace-pre-wrap leading-6 flex-1">{msg.content}</div>
              </div>
            )
          )}
          {followUpLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 size={14} className="animate-spin" />
              {t('aiReview.thinking')}
            </div>
          )}
        </div>

        <div className="border-t border-surface-border shrink-0">
          {review && !loading && (
            <div className="px-6 py-3 flex items-center gap-3">
              <input
                type="text"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void sendFollowUp()
                  }
                }}
                placeholder={t('aiReview.followUpPlaceholder')}
                disabled={followUpLoading}
                className="flex-1 bg-surface rounded-lg border border-surface-border px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent/40 disabled:opacity-50"
              />
              <button
                onClick={() => void sendFollowUp()}
                disabled={followUpLoading || !followUpInput.trim()}
                className="rounded-lg p-2 text-accent-light hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SendHorizontal size={16} />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-surface-border">
            {meta ? (
              <span className="text-[11px] text-gray-500">
                {meta.providerLabel} · {meta.model}
              </span>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                disabled={loading || followUpLoading}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
              >
                {t('common:actions.close')}
              </button>
              <button
                onClick={onRerun}
                disabled={loading || followUpLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                {review ? t('aiReview.rerun') : t('aiReview.review')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AICommandDraftDialog(props: {
  prompt: string
  onPromptChange: (value: string) => void
  onClose: () => void
  onGenerate: () => void
  onApplyToPreview: () => void
  onApply: () => void
  loading: boolean
  error: string | null
  suggestion: AICommandGenerationSuggestion | null
  suggestionMeta: { providerLabel: string; model: string } | null
  suggestionCommand: string
}): JSX.Element {
  const { t } = useTranslation('commandBuilder')
  const {
    prompt,
    onPromptChange,
    onClose,
    onGenerate,
    onApplyToPreview,
    onApply,
    loading,
    error,
    suggestion,
    suggestionMeta,
    suggestionCommand
  } = props

  const hasApplicableSuggestion = suggestion && Object.keys(suggestion.values).length > 0
  const hasPreviewSuggestion = suggestionCommand.trim().length > 0

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-start justify-center overflow-y-auto p-6">
      <div className="mt-8 mb-8 w-full max-w-5xl rounded-2xl border border-surface-border bg-surface-light shadow-2xl shadow-black/50 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-surface-border">
          <div>
            <h3 className="text-lg font-semibold text-gray-200">{t('aiDraft.title')}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {t('aiDraft.description')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-surface border border-surface-border transition-colors"
          >
            {t('common:actions.close')}
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">{t('aiDraft.promptLabel')}</label>
            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              rows={4}
              placeholder={t('aiDraft.promptPlaceholder')}
              className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          {(loading || error || suggestion) && (
            <div
              className={`rounded-xl border px-4 py-4 ${
                error
                  ? 'border-destructive/30 bg-destructive/10'
                  : 'border-accent/20 bg-accent/5'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className={error ? 'text-destructive' : 'text-accent-light'} />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t('aiDraft.suggestion')}
                </span>
                {suggestionMeta && (
                  <span className="text-[11px] text-gray-500 ml-auto">
                    {suggestionMeta.providerLabel} · {suggestionMeta.model}
                  </span>
                )}
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 size={14} className="animate-spin" />
                  {t('aiDraft.generating')}
                </div>
              )}

              {error && <div className="text-sm text-destructive whitespace-pre-wrap">{error}</div>}

              {suggestion && (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                      {t('aiDraft.summary')}
                    </div>
                    <div className="text-sm text-gray-200 whitespace-pre-wrap leading-6">
                      {suggestion.summary}
                    </div>
                  </div>

                  {suggestion.warnings.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-caution mb-1">
                        {t('aiDraft.warnings')}
                      </div>
                      <div className="space-y-1">
                        {suggestion.warnings.map((warning, index) => (
                          <div key={index} className="text-sm text-caution">
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                      {t('aiDraft.generatedCommand')}
                    </div>
                    <div className="rounded-lg border border-surface-border bg-surface px-3 py-3 font-mono text-sm text-gray-200 whitespace-pre-wrap break-all">
                      {suggestionCommand || t('aiDraft.noCommandValues')}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                      {t('aiDraft.formValues')}
                    </div>
                    <pre className="rounded-lg border border-surface-border bg-surface px-3 py-3 text-xs text-gray-300 whitespace-pre-wrap break-all overflow-x-auto">
                      {JSON.stringify(suggestion.values, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-surface-border">
          <div className="text-xs text-gray-500">
            {t('aiDraft.footer')}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              {t('common:actions.cancel')}
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 min-w-[36rem]">
              <button
                onClick={onGenerate}
                disabled={loading || prompt.trim().length === 0}
                className="flex h-full min-h-[64px] items-center justify-center gap-2 px-4 py-2 rounded-lg border border-surface-border text-sm text-gray-200 hover:text-gray-200 hover:border-gray-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {suggestion ? t('aiDraft.refreshDraft') : t('aiDraft.generateDraft')}
              </button>
              <button
                onClick={onApplyToPreview}
                disabled={!hasPreviewSuggestion}
                className="flex h-full min-h-[64px] items-center justify-center gap-2 px-4 py-2 rounded-lg border border-surface-border text-sm text-gray-200 hover:text-gray-200 hover:border-gray-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {t('aiDraft.applyToPreview')}
              </button>
              <button
                onClick={onApply}
                disabled={!hasApplicableSuggestion}
                className="flex h-full min-h-[64px] items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {t('aiDraft.applyToForm')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CommandHighlight({ command }: { command: string }): JSX.Element {
  // Simple syntax highlighting: first word is the executable, flags are highlighted
  const parts = command.split(/(\s+)/)
  let isFirst = true

  return (
    <span>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part)) return <span key={i}>{part}</span>

        if (isFirst) {
          isFirst = false
          return (
            <span key={i} className="text-accent-light font-semibold">
              {part}
            </span>
          )
        }

        if (part.startsWith('--') || part.startsWith('-')) {
          // Check if it contains = for flag=value
          const eqIdx = part.indexOf('=')
          if (eqIdx > 0) {
            return (
              <span key={i}>
                <span className="text-caution">{part.slice(0, eqIdx)}</span>
                <span className="text-gray-500">=</span>
                <span className="text-safe">{part.slice(eqIdx + 1)}</span>
              </span>
            )
          }
          return (
            <span key={i} className="text-caution">
              {part}
            </span>
          )
        }

        return (
          <span key={i} className="text-safe">
            {part}
          </span>
        )
      })}
    </span>
  )
}
