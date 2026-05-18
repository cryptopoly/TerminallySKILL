import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Braces, Clock, Trash2, Copy, Play, X } from 'lucide-react'
import clsx from 'clsx'
import { useSnippetStore } from '../../store/snippet-store'
import { useProjectStore } from '../../store/project-store'
import { useSettingsStore } from '../../store/settings-store'
import { useTerminalStore } from '../../store/terminal-store'
import { resolveTemplate } from '../../../../shared/snippet-schema'
import type { Snippet } from '../../../../shared/snippet-schema'
import {
  buildProjectExecutionCommand,
  createProjectTerminalSession,
  ensureProjectExecutionSession
} from '../../lib/workspace-session'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { formatDate } from '../../i18n/format'

interface SnippetListProps {
  onSelectSnippet: (snippet: Snippet) => void
}

export function SnippetList({ onSelectSnippet }: SnippetListProps): JSX.Element {
  const { t } = useTranslation('snippets')
  const snippets = useSnippetStore((s) => s.snippets)
  const activeSnippet = useSnippetStore((s) => s.activeSnippet)
  const { addSnippetToStore, removeSnippetFromStore, updateSnippetInStore } = useSnippetStore()
  const activeProject = useProjectStore((s) => s.activeProject)
  const { updateProjectInStore } = useProjectStore()
  const settings = useSettingsStore((s) => s.settings)
  const { activeSessionId, setTerminalVisible, addToHistory } = useTerminalStore()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTemplate, setNewTemplate] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Snippet | null>(null)

  // Filter snippets by project's enabledSnippetIds when a project is active
  const displayedSnippets = useMemo(() => {
    if (!activeProject) return snippets
    return snippets.filter((s) => activeProject.enabledSnippetIds.includes(s.id))
  }, [snippets, activeProject])

  const sorted = [...displayedSnippets].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  const handleCreate = async (): Promise<void> => {
    if (!newName.trim() || !newTemplate.trim()) return
    const snippet = await window.electronAPI.createSnippet(
      newName.trim(),
      newTemplate.trim(),
      activeProject?.id ?? null
    )
    addSnippetToStore(snippet)

    // Auto-enable in the active project
    if (activeProject) {
      const updated = await window.electronAPI.updateProject(activeProject.id, {
        enabledSnippetIds: [...activeProject.enabledSnippetIds, snippet.id]
      })
      if (updated) updateProjectInStore(updated)
    }

    onSelectSnippet(snippet)
    setNewName('')
    setNewTemplate('')
    setCreating(false)
  }

  const handleRemoveFromProject = async (e: React.MouseEvent, snippet: Snippet): Promise<void> => {
    e.stopPropagation()
    if (!activeProject) return
    const updated = await window.electronAPI.updateProject(activeProject.id, {
      enabledSnippetIds: activeProject.enabledSnippetIds.filter((id) => id !== snippet.id)
    })
    if (updated) updateProjectInStore(updated)
  }

  const handleDelete = useCallback(async (snippet: Snippet): Promise<void> => {
    await window.electronAPI.deleteSnippet(snippet.id)
    removeSnippetFromStore(snippet.id)
    setConfirmDelete(null)
  }, [removeSnippetFromStore])

  const handleDuplicate = async (e: React.MouseEvent, snippet: Snippet): Promise<void> => {
    e.stopPropagation()
    const copy = await window.electronAPI.duplicateSnippet(snippet.id)
    if (copy) {
      addSnippetToStore(copy)
      if (activeProject) {
        const updated = await window.electronAPI.updateProject(activeProject.id, {
          enabledSnippetIds: [...activeProject.enabledSnippetIds, copy.id]
        })
        if (updated) updateProjectInStore(updated)
      }
      onSelectSnippet(copy)
    }
  }

  const handleQuickRun = async (e: React.MouseEvent, snippet: Snippet): Promise<void> => {
    e.stopPropagation()
    // Quick-run only works for snippets with no variables (or all have defaults)
    const hasRequired = snippet.variables.some((v) => !v.defaultValue)
    if (hasRequired) {
      // Open the editor so user can fill in values
      onSelectSnippet(snippet)
      return
    }

    // Build values from defaults
    const values: Record<string, string> = {}
    for (const v of snippet.variables) {
      values[v.name] = v.defaultValue
    }
    const resolved = resolveTemplate(snippet.template, values)

    const envOverrides = useProjectStore.getState().getActiveEnvOverrides()
    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = await createProjectTerminalSession(
        activeProject,
        useTerminalStore.getState().addSession,
        envOverrides
      )
    } else {
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
    addToHistory(resolved)
    window.electronAPI.writeToTerminal(
      sessionId!,
      buildProjectExecutionCommand(activeProject, resolved, envOverrides) + '\n'
    )
    await window.electronAPI.markSnippetRun(snippet.id)
    updateSnippetInStore({ ...snippet, lastRunAt: new Date().toISOString() })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Create new */}
      <div className="p-3 border-b border-surface-border">
        {creating ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('placeholders.name')}
              className="tv-input"
              autoFocus
            />
            <input
              type="text"
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') {
                  setCreating(false)
                  setNewName('')
                  setNewTemplate('')
                }
              }}
              placeholder={t('placeholders.template')}
              className="tv-input font-mono"
            />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              {t('help.variables')}{' '}
              <code className="text-accent-light/70">{'{{name}}'}</code>
              {' / '}
              <code className="text-accent-light/70">{'{{name:default}}'}</code>.
              {' '}{t('help.examples')}{' '}
              <code className="text-gray-400">docker run -p {'{{port:3000}}'}:{'{{port:3000}}'} {'{{image}}'}</code>, <code className="text-gray-400">curl -H &quot;Authorization: {'{{token}}'}&quot; {'{{url}}'}</code>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="tv-btn-accent flex-1"
              >
                {t('actions.create')}
              </button>
              <button
                onClick={() => {
                  setCreating(false)
                  setNewName('')
                  setNewTemplate('')
                }}
                className="tv-btn-ghost"
              >
                {t('actions.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="tv-btn-dashed w-full"
          >
            <Plus size={14} />
            {t('actions.newSnippet')}
          </button>
        )}
      </div>

      {/* Snippet list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {sorted.length === 0 ? (
          <div className="text-center text-gray-600 text-sm py-8">
            <Braces size={24} className="mx-auto mb-2 text-gray-700" />
            <p>{t('empty.title')}</p>
            <p className="text-xs mt-1">
              {t('empty.description')}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {sorted.map((snippet) => (
              <button
                key={snippet.id}
                onClick={() => onSelectSnippet(snippet)}
                className={clsx(
                  'tv-list-card w-full text-left px-3 py-2.5 text-sm group',
                  activeSnippet?.id === snippet.id
                    ? 'bg-accent/20 text-accent-light border border-accent/30'
                    : 'text-gray-300'
                )}
              >
                <div className="flex items-center gap-2">
                  <Braces size={13} className="text-gray-500 shrink-0" />
                  <span className="flex-1 truncate font-medium">{snippet.name}</span>
                  <div className="flex items-center gap-0.5 text-gray-500">
                    <span
                      onClick={(e) => handleQuickRun(e, snippet)}
                      className="tv-btn-icon-sm hover:text-safe"
                      title={
                        snippet.variables.some((v) => !v.defaultValue)
                          ? t('actions.fillVariablesRun')
                          : t('actions.quickRun')
                      }
                    >
                      <Play size={11} />
                    </span>
                    <span
                      onClick={(e) => handleDuplicate(e, snippet)}
                      className="tv-btn-icon-sm"
                      title={t('actions.duplicate')}
                    >
                      <Copy size={11} />
                    </span>
                    {activeProject && (
                      <span
                        onClick={(e) => handleRemoveFromProject(e, snippet)}
                        className="tv-btn-icon-sm"
                        title={t('actions.removeFromProject')}
                      >
                        <X size={11} />
                      </span>
                    )}
                    <span
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(snippet) }}
                      className="tv-btn-icon-sm hover:text-destructive"
                      title={t('actions.deletePermanently')}
                    >
                      <Trash2 size={11} />
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                  <span className="font-mono truncate min-w-0 flex-1">{snippet.template}</span>
                  {snippet.variables.length > 0 && (
                    <span className="tv-pill normal-case tracking-normal shrink-0">
                      {t('meta.variable', { count: snippet.variables.length })}
                    </span>
                  )}
                  {snippet.lastRunAt && (
                    <span className="flex items-center gap-1 ml-auto shrink-0">
                      <Clock size={10} />
                      {formatDate(snippet.lastRunAt, settings)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {confirmDelete && (
        <ConfirmDialog
          title={t('delete.title')}
          message={t('delete.message', { name: confirmDelete.name })}
          onConfirm={() => void handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
