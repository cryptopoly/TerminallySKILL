import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, ScrollText, ChevronRight } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useScriptStore } from '../../store/script-store'
import { useProjectStore } from '../../store/project-store'
import { HelpTip } from '../ui/HelpTip'

interface AddToScriptMenuProps {
  commandString: string
  commandId: string
  commandName: string
}

export function AddToScriptMenu({
  commandString,
  commandId,
  commandName
}: AddToScriptMenuProps): JSX.Element {
  const { t } = useTranslation('scripts')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scripts = useScriptStore((s) => s.scripts)
  const { addScriptToStore, updateScriptInStore } = useScriptStore()
  const activeProject = useProjectStore((s) => s.activeProject)
  const { updateProjectInStore } = useProjectStore()

  // Show only project-enabled scripts when a project is active
  const displayedScripts = useMemo(() => {
    if (!activeProject) return scripts
    return scripts.filter((s) => activeProject.enabledScriptIds.includes(s.id))
  }, [scripts, activeProject])

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      const target = e.target as Node
      if (
        ref.current && !ref.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (creating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [creating])

  const handleAddToExisting = async (scriptId: string): Promise<void> => {
    const updated = await window.electronAPI.addStepToScript(
      scriptId,
      commandString,
      commandId,
      commandName
    )
    if (updated) {
      updateScriptInStore(updated)
    }
    setOpen(false)
  }

  const handleCreateNew = async (): Promise<void> => {
    if (!newName.trim()) return
    const script = await window.electronAPI.createScript(
      newName.trim(),
      activeProject?.id ?? null
    )
    addScriptToStore(script)

    // Auto-enable this script in the active project
    if (activeProject) {
      const updatedProject = await window.electronAPI.updateProject(activeProject.id, {
        enabledScriptIds: [...activeProject.enabledScriptIds, script.id]
      })
      if (updatedProject) {
        updateProjectInStore(updatedProject)
      }
    }

    // Immediately add the current command as the first step
    const updated = await window.electronAPI.addStepToScript(
      script.id,
      commandString,
      commandId,
      commandName
    )
    if (updated) {
      updateScriptInStore(updated)
    }
    setNewName('')
    setCreating(false)
    setOpen(false)
  }

  const buttonRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

  const updateMenuPos = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setMenuPos({
      top: rect.top - 8,
      left: Math.min(rect.right, window.innerWidth - 288 - 8)
    })
  }, [])

  useEffect(() => {
    if (open) updateMenuPos()
  }, [open, updateMenuPos])

  return (
    <div ref={ref} className="relative">
      <HelpTip label={t('addToScript.tooltipLabel')} description={t('addToScript.tooltipDescription')}>
        <button
          ref={buttonRef}
          onClick={() => setOpen(!open)}
          className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-surface-lighter border border-surface-border text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors shrink-0"
        >
          <ScrollText size={16} />
        </button>
      </HelpTip>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, transform: 'translateY(-100%)' }}
          className="w-72 bg-surface-light border border-surface-border rounded-xl shadow-xl shadow-black/30 z-50 overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-surface-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('addToScript.title')}
            </span>
          </div>

          {/* Existing scripts */}
          <div className="max-h-48 overflow-y-auto py-1">
            {displayedScripts.length === 0 && !creating ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {activeProject ? t('addToScript.emptyProject') : t('addToScript.emptyGlobal')}
              </div>
            ) : (
              displayedScripts.map((script) => (
                <button
                  key={script.id}
                  onClick={() => handleAddToExisting(script.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-lighter transition-colors"
                >
                  <ScrollText size={14} className="text-accent-light shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-gray-200 truncate">{script.name}</div>
                    <div className="text-xs text-gray-500">
                      {t('addToScript.step', { count: script.steps.length })}
                    </div>
                  </div>
                  <Plus size={12} className="text-gray-500" />
                </button>
              ))
            )}
          </div>

          {/* Create new script */}
          <div className="border-t border-surface-border">
            {creating ? (
              <div className="p-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateNew()
                    if (e.key === 'Escape') {
                      setCreating(false)
                      setNewName('')
                    }
                  }}
                  placeholder={t('addToScript.scriptNamePlaceholder')}
                  className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleCreateNew}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-light text-white text-xs font-medium transition-colors"
                  >
                    {t('addToScript.createAndAdd')}
                  </button>
                  <button
                    onClick={() => {
                      setCreating(false)
                      setNewName('')
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {t('addToScript.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-400 hover:text-accent-light hover:bg-surface-lighter transition-colors"
              >
                <Plus size={14} />
                {t('addToScript.newScript')}
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
