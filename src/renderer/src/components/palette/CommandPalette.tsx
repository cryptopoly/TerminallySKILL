import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Fuse from 'fuse.js'
import {
  Search,
  Star,
  ScrollText,
  Braces,
  TerminalSquare,
  Clock
} from 'lucide-react'
import clsx from 'clsx'
import { useCommandStore } from '../../store/command-store'
import { useScriptStore } from '../../store/script-store'
import { useSnippetStore } from '../../store/snippet-store'
import { useTerminalStore } from '../../store/terminal-store'
import { useProjectStore } from '../../store/project-store'
import { useBuilderStore } from '../../store/builder-store'
import { useSettingsStore } from '../../store/settings-store'
import {
  buildProjectExecutionCommand,
  createProjectTerminalSession,
  ensureProjectExecutionSession,
  openInteractiveProjectShell
} from '../../lib/workspace-session'

interface PaletteItem {
  id: string
  type: 'action' | 'command' | 'script' | 'snippet' | 'history'
  label: string
  detail: string
  action: () => void
}

const TYPE_ICON: Record<PaletteItem['type'], React.ReactNode> = {
  action: <TerminalSquare size={13} />,
  command: <Star size={13} />,
  script: <ScrollText size={13} />,
  snippet: <Braces size={13} />,
  history: <Clock size={13} />
}

interface CommandPaletteProps {
  onClose: () => void
  onNewTerminal: () => void
  onOpenSettings: () => void
  onOpenInfo: () => void
  onCreateProject: () => void
}

export function CommandPalette({
  onClose,
  onNewTerminal,
  onOpenSettings,
  onOpenInfo,
  onCreateProject
}: CommandPaletteProps): JSX.Element {
  const { t } = useTranslation('layout')
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useCommandStore((s) => s.commands)
  const setActiveCommand = useCommandStore((s) => s.setActiveCommand)
  const resetValues = useBuilderStore((s) => s.resetValues)
  const scripts = useScriptStore((s) => s.scripts)
  const { setActiveScript } = useScriptStore()
  const snippets = useSnippetStore((s) => s.snippets)
  const { setActiveSnippet } = useSnippetStore()
  const history = useTerminalStore((s) => s.history)
  const { activeSessionId, setTerminalVisible, addToHistory } = useTerminalStore()
  const activeProject = useProjectStore((s) => s.activeProject)
  const hiddenCommandExecutables = useSettingsStore((s) => s.settings.hiddenCommandExecutables)

  // Build the full item list
  const allItems = useMemo((): PaletteItem[] => {
    const items: PaletteItem[] = []

    // Actions
    items.push({
      id: 'action:terminal',
      type: 'action',
      label: t('palette.actions.newTerminal'),
      detail: t('palette.actions.newTerminalDescription'),
      action: () => { onNewTerminal(); onClose() }
    })
    if (activeProject?.workspaceTarget.type === 'ssh') {
      items.push({
        id: 'action:ssh-shell',
        type: 'action',
        label: t('palette.actions.openSshShell'),
        detail: t('palette.actions.openSshShellDescription'),
        action: () => {
          void openInteractiveProjectShell(activeProject, useTerminalStore.getState().addSession)
          onClose()
        }
      })
    }
    items.push({
      id: 'action:settings',
      type: 'action',
      label: t('palette.actions.settings'),
      detail: t('palette.actions.settingsDescription'),
      action: () => { onOpenSettings(); onClose() }
    })
    items.push({
      id: 'action:info',
      type: 'action',
      label: t('palette.actions.info'),
      detail: t('palette.actions.infoDescription'),
      action: () => { onOpenInfo(); onClose() }
    })
    items.push({
      id: 'action:project',
      type: 'action',
      label: t('palette.actions.newProject'),
      detail: t('palette.actions.newProjectDescription'),
      action: () => { onCreateProject(); onClose() }
    })

    // Commands
    for (const cmd of commands) {
      if (hiddenCommandExecutables.includes(cmd.executable)) continue
      items.push({
        id: `cmd:${cmd.id}`,
        type: 'command',
        label: cmd.name,
        detail: cmd.description || cmd.category,
        action: () => {
          resetValues()
          setActiveCommand(cmd)
          setActiveScript(null)
          setActiveSnippet(null)
          onClose()
        }
      })
    }

    // Scripts
    const projectScripts = activeProject
      ? scripts.filter((s) => activeProject.enabledScriptIds.includes(s.id))
      : scripts
    for (const script of projectScripts) {
      items.push({
        id: `script:${script.id}`,
        type: 'script',
        label: script.name,
        detail: `${t('palette.scriptStep', { count: script.steps.length })}${script.description ? ' · ' + script.description : ''}`,
        action: () => {
          setActiveScript(script)
          setActiveCommand(null)
          setActiveSnippet(null)
          onClose()
        }
      })
    }

    // Snippets
    const projectSnippets = activeProject
      ? snippets.filter((s) => activeProject.enabledSnippetIds.includes(s.id))
      : snippets
    for (const snippet of projectSnippets) {
      items.push({
        id: `snippet:${snippet.id}`,
        type: 'snippet',
        label: snippet.name,
        detail: snippet.template,
        action: () => {
          setActiveSnippet(snippet)
          setActiveScript(null)
          setActiveCommand(null)
          onClose()
        }
      })
    }

    // History (recent terminal commands)
    for (let i = 0; i < history.length; i++) {
      const cmd = history[i]
      items.push({
        id: `history:${i}`,
        type: 'history',
        label: cmd,
        detail: t('palette.historyRunAgain'),
        action: () => {
          runHistoryCommand(cmd)
          onClose()
        }
      })
    }

    return items
  }, [commands, scripts, snippets, history, activeProject, hiddenCommandExecutables, onClose, onNewTerminal, onOpenSettings, onOpenInfo, onCreateProject, resetValues, setActiveCommand, setActiveScript, setActiveSnippet, t])

  const runHistoryCommand = useCallback(async (cmd: string) => {
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
    addToHistory(cmd)
    window.electronAPI.writeToTerminal(
      sessionId!,
      buildProjectExecutionCommand(activeProject, cmd, envOverrides) + '\n'
    )
  }, [activeSessionId, activeProject, setTerminalVisible, addToHistory])

  // Fuse.js search
  const fuse = useMemo(
    () =>
      new Fuse(allItems, {
        keys: [
          { name: 'label', weight: 2 },
          { name: 'detail', weight: 1 }
        ],
        threshold: 0.4,
        minMatchCharLength: 1
      }),
    [allItems]
  )

  const results = useMemo(() => {
    if (!query.trim()) {
      // Show actions first, then recent history, then a few commands/scripts/snippets
      const actions = allItems.filter((i) => i.type === 'action')
      const hist = allItems.filter((i) => i.type === 'history').slice(0, 5)
      const rest = allItems.filter((i) => i.type !== 'action' && i.type !== 'history').slice(0, 10)
      return [...actions, ...hist, ...rest]
    }
    return fuse.search(query, { limit: 20 }).map((r) => r.item)
  }, [query, fuse, allItems])

  // Keep selectedIndex in bounds
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Scroll selected item into view
  useEffect(() => {
    const listEl = listRef.current
    if (!listEl) return
    const selected = listEl.children[selectedIndex] as HTMLElement | undefined
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      results[selectedIndex]?.action()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[520px] max-h-[60vh] bg-surface border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border">
          <Search size={16} className="text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('palette.searchPlaceholder')}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
          />
          <kbd className="text-[10px] text-gray-600 px-1.5 py-0.5 rounded border border-surface-border bg-surface-light">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-600">
              {t('palette.noResults', { query })}
            </div>
          ) : (
            results.map((item, i) => (
              <button
                key={item.id}
                onClick={() => item.action()}
                onMouseEnter={() => setSelectedIndex(i)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                  i === selectedIndex
                    ? 'bg-accent/15 text-accent-light'
                    : 'text-gray-300 hover:bg-surface-light'
                )}
              >
                <span
                  className={clsx(
                    'shrink-0',
                    i === selectedIndex ? 'text-accent-light' : 'text-gray-600'
                  )}
                >
                  {TYPE_ICON[item.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {item.type === 'history' ? (
                      <code className="font-mono text-xs">{item.label}</code>
                    ) : (
                      item.label
                    )}
                  </span>
                  {item.detail && item.type !== 'history' && (
                    <span className="text-xs text-gray-500 truncate block">{item.detail}</span>
                  )}
                </div>
                <span
                  className={clsx(
                    'text-[10px] px-1.5 py-0.5 rounded shrink-0',
                    i === selectedIndex
                      ? 'bg-accent/20 text-accent-light'
                      : 'bg-surface-lighter text-gray-600'
                  )}
                >
                  {t(`palette.types.${item.type}`)}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-surface-border text-[10px] text-gray-600">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-px rounded border border-surface-border bg-surface-light">↑↓</kbd>
            {t('palette.shortcuts.navigate')}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-px rounded border border-surface-border bg-surface-light">↵</kbd>
            {t('palette.shortcuts.select')}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-px rounded border border-surface-border bg-surface-light">esc</kbd>
            {t('palette.shortcuts.close')}
          </span>
        </div>
      </div>
    </div>
  )
}
