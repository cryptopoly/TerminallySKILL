import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Pencil, Braces, Copy, Clock } from 'lucide-react'
import clsx from 'clsx'
import { useSnippetStore } from '../../store/snippet-store'
import { resolveProjectTerminalContext, useTerminalStore } from '../../store/terminal-store'
import { useProjectStore } from '../../store/project-store'
import { useSettingsStore } from '../../store/settings-store'
import { parseTemplateVariables, resolveTemplate } from '../../../../shared/snippet-schema'
import type { SnippetVariable } from '../../../../shared/snippet-schema'
import {
  buildProjectExecutionCommand,
  createProjectTerminalSession,
  ensureProjectExecutionSession
} from '../../lib/workspace-session'
import { formatDate } from '../../i18n/format'

export function SnippetEditor(): JSX.Element {
  const { t } = useTranslation('snippets')
  const activeSnippet = useSnippetStore((s) => s.activeSnippet)
  const { updateSnippetInStore } = useSnippetStore()
  const { activeSessionId, splitSessionId, sessions, setTerminalVisible, addToHistory } = useTerminalStore()
  const activeProject = useProjectStore((s) => s.activeProject)
  const settings = useSettingsStore((s) => s.settings)
  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [template, setTemplate] = useState('')
  const [templateDirty, setTemplateDirty] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const { activeProjectSessionId } = useMemo(
    () => resolveProjectTerminalContext(sessions, activeProject?.id ?? null, activeSessionId, splitSessionId),
    [activeProject?.id, activeSessionId, sessions, splitSessionId]
  )

  // Sync template state when activeSnippet changes
  useEffect(() => {
    if (activeSnippet) {
      setTemplate(activeSnippet.template)
      setTemplateDirty(false)
      // Pre-populate values with defaults
      const defaults: Record<string, string> = {}
      for (const v of activeSnippet.variables) {
        defaults[v.name] = v.defaultValue
      }
      setValues(defaults)
    }
  }, [activeSnippet?.id])

  if (!activeSnippet) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
        <Braces size={48} className="text-surface-lighter" />
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-400">{t('editor.noSelectionTitle')}</h2>
          <p className="text-sm mt-1">{t('editor.noSelectionDescription')}</p>
        </div>
      </div>
    )
  }

  // Parse variables from the current template (may be dirty/unsaved)
  const liveVars = useMemo(() => parseTemplateVariables(template), [template])

  // Build the resolved command preview
  const resolvedCommand = useMemo(() => {
    return resolveTemplate(template, values)
  }, [template, values])

  // Check if all required variables have values
  const allFilled = liveVars.every((v) => values[v.name]?.trim())

  const saveUpdates = async (updates: Record<string, unknown>): Promise<void> => {
    const updated = await window.electronAPI.updateSnippet(activeSnippet.id, updates)
    if (updated) updateSnippetInStore(updated)
  }

  const handleSaveTemplate = async (): Promise<void> => {
    await saveUpdates({ template })
    setTemplateDirty(false)
    // Sync defaults for new variables
    const newVars = parseTemplateVariables(template)
    const updated: Record<string, string> = {}
    for (const v of newVars) {
      updated[v.name] = values[v.name] ?? v.defaultValue
    }
    setValues(updated)
  }

  const handleSetValue = (varName: string, value: string): void => {
    setValues((prev) => ({ ...prev, [varName]: value }))
  }

  /** Execute resolved command in terminal */
  const executeSnippet = useCallback(
    async (forceNew: boolean): Promise<void> => {
      const envOverrides = useProjectStore.getState().getActiveEnvOverrides()
      let sessionId = forceNew ? null : activeProjectSessionId
      if (!sessionId) {
        sessionId = await createProjectTerminalSession(
          activeProject,
          useTerminalStore.getState().addSession,
          envOverrides
        )
      } else if (!forceNew) {
        sessionId = await ensureProjectExecutionSession(
          activeProject,
          sessionId,
          (candidateId) =>
            useTerminalStore.getState().sessions.find((session) => session.id === candidateId)?.mode ?? null,
          useTerminalStore.getState().addSession,
          envOverrides
        )
      }
      setTerminalVisible(true)
      addToHistory(resolvedCommand)
      window.electronAPI.writeToTerminal(
        sessionId!,
        buildProjectExecutionCommand(activeProject, resolvedCommand, envOverrides) + '\n'
      )
      await window.electronAPI.markSnippetRun(activeSnippet.id)
      updateSnippetInStore({ ...activeSnippet, lastRunAt: new Date().toISOString() })
    },
    [activeProjectSessionId, activeSnippet, activeProject, setTerminalVisible, addToHistory, resolvedCommand, updateSnippetInStore]
  )

  const handleRun = useCallback((): void => {
    executeSnippet(false)
  }, [executeSnippet])

  const handleCopy = async (): Promise<void> => {
    await window.electronAPI.writeClipboard(resolvedCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="h-full flex flex-col bg-surface-light">
      {/* Header */}
      <div className="p-5 pb-3 border-b border-surface-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editingName ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (name.trim()) saveUpdates({ name: name.trim() })
                  setEditingName(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (name.trim()) saveUpdates({ name: name.trim() })
                    setEditingName(false)
                  }
                }}
                className="text-xl font-bold font-mono text-gray-200 bg-transparent border-b-2 border-accent focus:outline-none w-full"
                autoFocus
              />
            ) : (
              <h1
                className="text-xl font-bold font-mono text-gray-200 cursor-pointer hover:text-accent-light transition-colors flex items-center gap-2"
                onClick={() => {
                  setName(activeSnippet.name)
                  setEditingName(true)
                }}
              >
                {activeSnippet.name}
                <Pencil size={13} className="text-gray-600" />
              </h1>
            )}

            {editingDesc ? (
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onBlur={() => {
                  saveUpdates({ description: desc.trim() })
                  setEditingDesc(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveUpdates({ description: desc.trim() })
                    setEditingDesc(false)
                  }
                }}
                placeholder={t('editor.addDescriptionPlaceholder')}
                className="mt-2 text-sm text-gray-400 bg-transparent border-b border-surface-border focus:outline-none focus:border-accent w-full max-w-lg"
                autoFocus
              />
            ) : (
              <p
                className="text-sm text-gray-500 mt-2 cursor-pointer hover:text-gray-300 transition-colors"
                onClick={() => {
                  setDesc(activeSnippet.description)
                  setEditingDesc(true)
                }}
              >
                {activeSnippet.description || t('editor.clickToAddDescription')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500">
              {t('meta.variable', { count: liveVars.length })}
            </span>
            {activeSnippet.lastRunAt && (
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <Clock size={10} />
                {formatDate(activeSnippet.lastRunAt, settings)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main content — scrollable */}
      <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-6">
        {/* Template section */}
        <section>
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">
            {t('editor.template')}
          </label>
          <div className="relative">
            <textarea
              value={template}
              onChange={(e) => {
                setTemplate(e.target.value)
                setTemplateDirty(true)
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                  e.preventDefault()
                  handleSaveTemplate()
                }
              }}
              spellCheck={false}
              rows={Math.min(Math.max(template.split('\n').length, 2), 8)}
              placeholder={t('editor.templatePlaceholder', { open: '{{', close: '}}' })}
              className="w-full bg-surface border border-surface-border rounded-xl px-4 py-3 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none leading-6"
            />
            {templateDirty && (
              <button
                onClick={handleSaveTemplate}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-accent hover:bg-accent-light text-white text-xs font-medium transition-colors"
              >
                {t('editor.saveShortcut')}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1.5">
            {t('editor.templateHelp', { open: '{{', close: '}}' })}
          </p>
        </section>

        {/* Variables section */}
        {liveVars.length > 0 && (
          <section>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 block">
              {t('editor.variables')}
            </label>
            <div className="space-y-3">
              {liveVars.map((v) => (
                <VariableInput
                  key={v.name}
                  variable={v}
                  value={values[v.name] ?? v.defaultValue}
                  onChange={(val) => handleSetValue(v.name, val)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Preview + Run */}
        <section>
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">
            {t('editor.preview')}
          </label>
          <div className="bg-surface border border-surface-border rounded-xl p-4">
            <code
              className={clsx(
                'text-sm font-mono block whitespace-pre-wrap break-all',
                allFilled || liveVars.length === 0 ? 'text-gray-200' : 'text-gray-500'
              )}
            >
              {resolvedCommand || <span className="text-gray-600 italic">{t('editor.emptyTemplatePreview')}</span>}
            </code>
          </div>
        </section>
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 bg-surface border-t border-surface-border px-4 py-2 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="flex-1 text-xs text-gray-400">
            {liveVars.length === 0
              ? t('editor.noVariablesStatus')
              : allFilled
                ? t('editor.allVariablesFilled')
                : t('editor.filledStatus', {
                  filled: liveVars.filter((v) => values[v.name]?.trim()).length,
                  total: liveVars.length
                })}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-lighter border border-surface-border text-xs text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors"
            title={t('editor.copyResolvedCommand')}
          >
            <Copy size={13} />
            {copied ? t('editor.copied') : t('editor.copy')}
          </button>
          <button
            onClick={handleRun}
            disabled={!allFilled && liveVars.length > 0}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
            title={t('editor.runInTerminal')}
          >
            <Play size={13} />
            {t('editor.run')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Individual variable input row */
function VariableInput({
  variable,
  value,
  onChange
}: {
  variable: SnippetVariable
  value: string
  onChange: (val: string) => void
}): JSX.Element {
  const { t } = useTranslation('snippets')

  return (
    <div className="flex items-center gap-3 bg-surface border border-surface-border rounded-xl px-4 py-3">
      <div className="w-28 shrink-0">
        <span className="text-xs font-mono text-accent-light">{`{{${variable.name}}}`}</span>
        <span className="block text-xs text-gray-500 mt-0.5">{variable.label}</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={variable.defaultValue || t('editor.enterValuePlaceholder', { label: variable.label.toLowerCase() })}
        className="flex-1 bg-surface-light border border-surface-border rounded-lg px-3 py-1.5 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      {variable.defaultValue && (
        <span className="text-xs text-gray-600 shrink-0" title={t('editor.defaultValue')}>
          = {variable.defaultValue}
        </span>
      )}
    </div>
  )
}
