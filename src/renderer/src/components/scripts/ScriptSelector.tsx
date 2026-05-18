import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Check, Square, CheckSquare, ScrollText, Search } from 'lucide-react'
import type { Script } from '../../../../shared/script-schema'

export type ScriptAttachMode = 'reuse' | 'clone'

export interface ScriptSelection {
  scriptId: string
  mode: ScriptAttachMode
}

interface ScriptSelectorProps {
  activeProjectId: string
  projectNameById: Record<string, string>
  enabledScriptIds: string[]
  allScripts: Script[]
  onSave: (selections: ScriptSelection[]) => void
  onCreateNew: (name?: string) => void
  onClose: () => void
}

export function ScriptSelector({
  activeProjectId,
  projectNameById,
  enabledScriptIds,
  allScripts,
  onSave,
  onCreateNew,
  onClose
}: ScriptSelectorProps): JSX.Element {
  const { t } = useTranslation('scripts')
  const [selected, setSelected] = useState<Set<string>>(new Set(enabledScriptIds))
  const [filter, setFilter] = useState('')
  const [attachModes, setAttachModes] = useState<Record<string, ScriptAttachMode>>(
    () => Object.fromEntries(enabledScriptIds.map((id) => [id, 'reuse']))
  )

  const filteredScripts = useMemo(() => {
    if (!filter.trim()) return allScripts
    const q = filter.toLowerCase()
    return allScripts.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [allScripts, filter])

  const canCreateNew = filter.trim().length > 0 && !allScripts.some(
    (s) => s.name.toLowerCase() === filter.trim().toLowerCase()
  )

  const getDefaultAttachMode = (script: Script): ScriptAttachMode => {
    if (script.projectId === activeProjectId) return 'reuse'
    if (script.projectId === null) return 'clone'
    return 'clone'
  }

  const getAttachMode = (script: Script): ScriptAttachMode =>
    attachModes[script.id] ?? getDefaultAttachMode(script)

  const toggle = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const setAttachMode = (scriptId: string, mode: ScriptAttachMode): void => {
    setAttachModes((prev) => ({ ...prev, [scriptId]: mode }))
  }

  const handleSave = (): void => {
    if (canCreateNew && selected.size === 0) {
      // No existing scripts selected: create new with the search text as name.
      onCreateNew(filter.trim())
      return
    }

    onSave(
      Array.from(selected).map((scriptId) => {
        const script = allScripts.find((entry) => entry.id === scriptId)
        return {
          scriptId,
          mode: script ? getAttachMode(script) : 'reuse'
        }
      })
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
      <div className="bg-surface-light border border-surface-border rounded-2xl w-full max-w-md shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <ScrollText size={16} className="text-accent-light" />
            <h2 className="text-lg font-semibold text-gray-200">{t('selector.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-lighter text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t('selector.searchPlaceholder')}
              className="w-full bg-surface border border-surface-border rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              autoFocus
            />
          </div>
        </div>

        {/* Script list */}
        <div className="px-4 py-3 max-h-72 overflow-y-auto space-y-0.5">
          {allScripts.length === 0 && !filter.trim() ? (
            <div className="text-center text-gray-600 text-sm py-6">
              <ScrollText size={24} className="mx-auto mb-2 text-gray-700" />
              <p>{t('selector.emptyTitle')}</p>
              <p className="text-xs mt-1">{t('selector.emptyDescription')}</p>
            </div>
          ) : filteredScripts.length === 0 && !canCreateNew ? (
            <div className="text-center text-gray-500 text-sm py-4">
              {t('selector.noMatches')}
            </div>
          ) : (
            <>
              {filteredScripts.map((script) => {
                const isChecked = selected.has(script.id)

                return (
                  <button
                    key={script.id}
                    onClick={() => toggle(script.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-lighter transition-colors text-left"
                  >
                    {isChecked ? (
                      <CheckSquare size={16} className="text-accent-light shrink-0" />
                    ) : (
                      <Square size={16} className="text-gray-600 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${isChecked ? 'text-gray-200' : 'text-gray-400'}`}>
                        {script.name}
                      </div>
                      <div className="text-xs text-gray-600 flex items-center gap-2 flex-wrap">
                        <span>
                          {t('selector.step', { count: script.steps.length })}
                        </span>
                        {script.projectId === null ? (
                          <span className="tv-pill normal-case tracking-normal">{t('selector.global')}</span>
                        ) : script.projectId === activeProjectId ? (
                          <span className="tv-pill normal-case tracking-normal">{t('selector.thisProject')}</span>
                        ) : (
                          <span className="tv-pill normal-case tracking-normal">
                            {projectNameById[script.projectId] ?? t('selector.otherProject')}
                          </span>
                        )}
                        {script.description && (
                          <span className="truncate">{script.description}</span>
                        )}
                      </div>
                      {isChecked && script.projectId === null && (
                        <div className="mt-2 inline-flex rounded-lg border border-surface-border overflow-hidden">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAttachMode(script.id, 'clone')
                            }}
                            className={`px-2.5 py-1 text-[11px] transition-colors ${
                              getAttachMode(script) === 'clone'
                                ? 'bg-accent/20 text-accent-light'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-surface'
                            }`}
                            title={t('selector.cloneToProjectTitle')}
                          >
                            {t('selector.cloneToProject')}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAttachMode(script.id, 'reuse')
                            }}
                            className={`px-2.5 py-1 text-[11px] transition-colors border-l border-surface-border ${
                              getAttachMode(script) === 'reuse'
                                ? 'bg-accent/20 text-accent-light'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-surface'
                            }`}
                            title={t('selector.useGlobalTitle')}
                          >
                            {t('selector.useGlobal')}
                          </button>
                        </div>
                      )}
                      {isChecked && script.projectId !== null && script.projectId !== activeProjectId && (
                        <div className="mt-2 text-[11px] text-gray-500">
                          {t('selector.cloneNotice')}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}

              {canCreateNew && (
                <div className="border-t border-surface-border mt-2 pt-2">
                  <button
                    onClick={() => onCreateNew(filter.trim())}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-lighter transition-colors text-left text-accent-light"
                  >
                    <ScrollText size={16} className="shrink-0" />
                    <span className="text-sm">
                      {t('selector.createNew', { name: filter.trim() })}
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            {t('selector.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={selected.size === 0 && !canCreateNew}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={14} />
            {t('selector.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
