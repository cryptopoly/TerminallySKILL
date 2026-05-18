import { useMemo, useState, useRef, useEffect } from 'react'
import Fuse from 'fuse.js'
import { useTranslation } from 'react-i18next'
import {
  Star,
  TerminalSquare,
  FolderTree,
  ScrollText,
  Plus,
  FileText,
  Braces,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Radar,
  Search
} from 'lucide-react'
import clsx from 'clsx'
import { useCommandStore } from '../../store/command-store'
import { useBuilderStore } from '../../store/builder-store'
import { useProjectStore } from '../../store/project-store'
import { useScriptStore } from '../../store/script-store'
import { useSnippetStore } from '../../store/snippet-store'
import { useFileStore } from '../../store/file-store'
import { useSettingsStore } from '../../store/settings-store'
import { useTerminalStore } from '../../store/terminal-store'
import { CommandSearch } from '../command-browser/CommandSearch'
import { CategoryList } from '../command-browser/CategoryList'
import { ScanResultsDialog } from '../commands/ScanResultsDialog'
import { AddCommandDialog } from '../commands/AddCommandDialog'
import { FileBrowser } from '../projects/FileBrowser'
import { ScriptList } from '../scripts/ScriptList'
import { SnippetList } from '../snippets/SnippetList'
import { LogBrowser } from '../logs/LogBrowser'
import { FindInFiles } from '../files/FindInFiles'
import type { CommandDefinition, DiscoveredCommand } from '../../../../shared/command-schema'
import type { ProjectSidebarTab, ProjectStarterPack } from '../../../../shared/project-schema'
import type { Script } from '../../../../shared/script-schema'
import type { Snippet } from '../../../../shared/snippet-schema'
import { createProjectTerminalSession } from '../../lib/workspace-session'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { getCommandSearchText } from '../../lib/command-display'
import { compareLocalized } from '../../i18n/format'

const POPULAR_COMMAND_EXECUTABLES = [
  'git',
  'npm',
  'node',
  'pnpm',
  'yarn',
  'python',
  'python3',
  'pip',
  'pip3',
  'uv',
  'poetry',
  'docker',
  'docker-compose',
  'kubectl',
  'curl',
  'wget',
  'ssh',
  'ls',
  'find',
  'grep',
  'sed',
  'awk',
  'tar',
  'make',
  'go',
  'cargo',
  'rustc',
  'bun',
  'php',
  'ruby',
  'java'
] as const

function buildCommandKey(command: CommandDefinition): string {
  if (command.subcommands && command.subcommands.length > 0) {
    return `${command.executable} ${command.subcommands.join(' ')}`.trim().toLowerCase()
  }

  return command.name.trim().toLowerCase()
}

function isCliRoot(command: CommandDefinition): boolean {
  return command.tags?.includes('cli-root') === true
}

function isRootLike(command: CommandDefinition, executable: string): boolean {
  return (
    (!command.subcommands || command.subcommands.length === 0) &&
    command.name.trim().toLowerCase() === executable.trim().toLowerCase()
  )
}

function isDuplicateExecutableSubcommand(command: CommandDefinition): boolean {
  return (
    Array.isArray(command.subcommands) &&
    command.subcommands.length > 0 &&
    command.subcommands[0]?.trim().toLowerCase() === command.executable.trim().toLowerCase()
  )
}

function resolveRootDescription(executable: string, description: string | undefined): string {
  const normalized = description?.trim()
  if (!normalized || normalized === 'No description available') {
    return `${executable} command-line tool`
  }
  return normalized
}

export function Sidebar(): JSX.Element {
  const { t, i18n } = useTranslation('layout')
  const commands = useCommandStore((s) => s.commands)
  const activeCommand = useCommandStore((s) => s.activeCommand)
  const loading = useCommandStore((s) => s.loading)
  const scanning = useCommandStore((s) => s.scanning)
  const setActiveCommand = useCommandStore((s) => s.setActiveCommand)
  const { setScanning, addCommands, removeCommand } = useCommandStore()
  const resetValues = useBuilderStore((s) => s.resetValues)
  const activeProject = useProjectStore((s) => s.activeProject)
  const { setSidebarTab, updateProjectInStore } = useProjectStore()
  const { setActiveScript } = useScriptStore()
  const { setActiveSnippet } = useSnippetStore()
  const { openFiles, setFileViewerVisible } = useFileStore()
  const addTerminalSession = useTerminalStore((s) => s.addSession)
  const hiddenCommandExecutables = useSettingsStore((s) => s.settings.hiddenCommandExecutables)
  const sidebarTabOrder = useSettingsStore((s) => s.settings.sidebarTabOrder)
  const settings = useSettingsStore((s) => s.settings)
  const { setSettings } = useSettingsStore()
  const scripts = useScriptStore((s) => s.scripts)
  const snippets = useSnippetStore((s) => s.snippets)
  const [query, setQuery] = useState('')
  const sidebarTab = activeProject?.workspaceLayout.sidebarTab ?? 'scripts'
  const [dragTabId, setDragTabId] = useState<string | null>(null)
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null)
  const [scanDialog, setScanDialog] = useState<{
    discovered: DiscoveredCommand[]
    existingExecutables: string[]
    visibleExecutables: string[]
    title: string
  } | null>(null)
  const [addCommandOpen, setAddCommandOpen] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [collapsedCommandTrees, setCollapsedCommandTrees] = useState<Record<string, boolean>>({})
  const [confirmDeleteCommand, setConfirmDeleteCommand] = useState<CommandDefinition | null>(null)
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const syncedExecutableRef = useRef(new Set<string>())

  useEffect(() => {
    const el = sidebarRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setNarrow(entry.contentRect.width < 500)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setQuery('')
  }, [activeProject?.id, activeProject?.workspaceLayout.sidebarTab])

  useEffect(() => {
    void window.electronAPI.getAppVersion().then(setAppVersion).catch((error) => {
      console.error('Failed to load app version:', error)
    })
  }, [])

  const handleTabDrop = async (fromId: string, toId: string): Promise<void> => {
    if (fromId === toId) return
    const order = [...(sidebarTabOrder.length > 0 ? sidebarTabOrder : ['scripts', 'commands', 'snippets', 'files', 'logs', 'search'])]
    const fromIdx = order.indexOf(fromId)
    const toIdx = order.indexOf(toId)
    if (fromIdx === -1 || toIdx === -1) return
    order.splice(fromIdx, 1)
    order.splice(toIdx, 0, fromId)
    const saved = await window.electronAPI.updateSettings({ sidebarTabOrder: order })
    setSettings(saved)
  }

  // Auto-open first script/snippet when switching to that tab
  const handleTabSwitch = (id: ProjectSidebarTab): void => {
    setSidebarTab(id)
    setFileViewerVisible(id === 'files' && openFiles.length > 0)

    if (id === 'scripts' && !useScriptStore.getState().activeScript && scripts.length > 0) {
      setActiveScript(scripts[0])
    }
    if (id === 'snippets' && !useSnippetStore.getState().activeSnippet && snippets.length > 0) {
      setActiveSnippet(snippets[0])
    }
  }

  const fuse = useMemo(
    () =>
      new Fuse(
        commands.map((command) => ({
          command,
          searchText: getCommandSearchText(command)
        })),
        {
          keys: ['searchText'],
          threshold: 0.4
        }
      ),
    [commands, i18n.language]
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    return fuse.search(query).map((r) => r.item.command)
  }, [query, fuse, commands])

  const starterPack = activeProject?.starterPack ?? null
  const showStarterPack = !!starterPack && !starterPack.dismissedAt
  const favoriteIds = activeProject?.favoriteCommandIds ?? []
  const favorites = useMemo(
    () =>
      commands.filter((c) => favoriteIds.includes(c.id) && !hiddenCommandExecutables.includes(c.executable)),
    [commands, favoriteIds, hiddenCommandExecutables]
  )

  const grouped = useMemo(() => {
    const groups: Record<string, CommandDefinition[]> = {}
    for (const cmd of filtered) {
      if (cmd.subcommands && cmd.subcommands.length > 1) continue
      if (isDuplicateExecutableSubcommand(cmd)) continue
      const executable = cmd.executable
      if (hiddenCommandExecutables.includes(executable)) continue
      if (!groups[executable]) groups[executable] = []
      groups[executable].push(cmd)
    }

    for (const executable of Object.keys(groups)) {
      groups[executable].sort((left, right) => {
        const leftRank = isCliRoot(left) ? 0 : (left.subcommands?.length ?? 0) <= 1 ? 1 : 2
        const rightRank = isCliRoot(right) ? 0 : (right.subcommands?.length ?? 0) <= 1 ? 1 : 2
        if (leftRank !== rightRank) return leftRank - rightRank
        return compareLocalized(left.name, right.name, settings)
      })
    }

    return groups
  }, [filtered, hiddenCommandExecutables, settings])

  const commandTreeKeys = useMemo(
    () => Object.keys(grouped).sort((left, right) => compareLocalized(left, right, settings)),
    [grouped, settings]
  )

  const allCommandTreesCollapsed =
    commandTreeKeys.length > 0 && commandTreeKeys.every((key) => collapsedCommandTrees[key])

  useEffect(() => {
    if (commandTreeKeys.length === 0) return

    setCollapsedCommandTrees((prev) => {
      let changed = false
      const next = { ...prev }

      for (const key of commandTreeKeys) {
        if (!(key in next)) {
          next[key] = true
          changed = true
        }
      }

      return changed ? next : prev
    })
  }, [commandTreeKeys])

  const handleToggleCommandTree = (category: string): void => {
    setCollapsedCommandTrees((prev) => ({ ...prev, [category]: !prev[category] }))
  }

  const handleSetAllCommandTreesCollapsed = (collapsed: boolean): void => {
    setCollapsedCommandTrees(
      Object.fromEntries(commandTreeKeys.map((key) => [key, collapsed]))
    )
  }

  const handleSelectCommand = (cmd: CommandDefinition): void => {
    resetValues()
    setActiveCommand(cmd)
    setActiveScript(null)
    setActiveSnippet(null)
  }

  const handleToggleFavoriteCommand = async (command: CommandDefinition): Promise<void> => {
    if (!activeProject) return
    const newFavorites = await window.electronAPI.toggleFavoriteCommand(activeProject.id, command.id)
    updateProjectInStore({
      ...activeProject,
      favoriteCommandIds: newFavorites
    })
  }

  const handleRemoveSavedCommand = async (command: CommandDefinition): Promise<void> => {
    if (!command.tags?.includes('saved-command')) return

    const persistedDefinitions = commands.filter(
      (candidate) =>
        candidate.executable === command.executable &&
        candidate.id !== command.id
    )

    await window.electronAPI.saveEnrichedBulk(command.executable, persistedDefinitions)
    removeCommand(command.id)

    if (activeProject && favoriteIds.includes(command.id)) {
      const updated = await window.electronAPI.updateProject(activeProject.id, {
        favoriteCommandIds: favoriteIds.filter((id) => id !== command.id)
      })
      updateProjectInStore(updated)
    }

    if (activeCommand?.id === command.id) {
      const fallback =
        persistedDefinitions.find((candidate) => isCliRoot(candidate) || isRootLike(candidate, command.executable)) ??
        persistedDefinitions[0] ??
        null
      setActiveCommand(fallback)
    }
  }

  const handleSelectScript = (script: Script): void => {
    setActiveScript(script)
    useCommandStore.getState().setActiveCommand(null)
    setActiveSnippet(null)
  }

  const handleSelectSnippet = (snippet: Snippet): void => {
    setActiveSnippet(snippet)
    setActiveScript(null)
    useCommandStore.getState().setActiveCommand(null)
  }

  const handleDismissStarterPack = async (): Promise<void> => {
    if (!activeProject?.starterPack) return
    const updated = await window.electronAPI.updateProject(activeProject.id, {
      starterPack: {
        ...activeProject.starterPack,
        dismissedAt: new Date().toISOString()
      }
    })
    if (updated) {
      updateProjectInStore(updated)
    }
  }

  const handleScan = async (mode: 'all' | 'popular' = 'all'): Promise<void> => {
    setScanning(true)
    try {
      const knownExecutables = commands.map((c) => c.executable)
      const discovered = await window.electronAPI.scanPathForCommands(knownExecutables)
      const popularSet = new Set<string>(POPULAR_COMMAND_EXECUTABLES)
      const filteredDiscovered =
        mode === 'popular'
          ? discovered.filter((item) => popularSet.has(item.executable))
          : discovered
      const filteredExistingExecutables =
        mode === 'popular'
          ? commandTreeExecutables.filter((executable) => popularSet.has(executable))
          : commandTreeExecutables
      const filteredVisibleExecutables = filteredExistingExecutables.filter(
        (executable) => !hiddenCommandExecutables.includes(executable)
      )

      setScanDialog({
        discovered: filteredDiscovered,
        existingExecutables: filteredExistingExecutables,
        visibleExecutables: filteredVisibleExecutables,
        title: mode === 'popular' ? t('sidebar.commands.popularInstalled') : t('sidebar.commands.scanResults')
      })
    } catch (err) {
      console.error('Failed to scan PATH:', err)
    } finally {
      setScanning(false)
    }
  }

  const commandTreeExecutables = useMemo(() => {
    const executableSet = new Set<string>()
    for (const command of commands) {
      if (command.subcommands && command.subcommands.length > 0 && !isCliRoot(command)) continue
      executableSet.add(command.executable)
    }
    return [...executableSet].sort((left, right) => compareLocalized(left, right, settings))
  }, [commands, settings])

  const handleApplyScanResults = async (selectedExecutables: string[]): Promise<void> => {
    const selectedSet = new Set(selectedExecutables)
    const existingSet = new Set(commandTreeExecutables)
    const selectedNewCommands = (scanDialog?.discovered ?? []).filter((item) => selectedSet.has(item.executable))
    const commandsToRemove = commands
      .filter(
        (command) =>
          (command.source === 'detected' || command.source === 'manual') &&
          (!command.subcommands || command.subcommands.length === 0 || isCliRoot(command))
      )
      .map((command) => command.executable)
      .filter((executable, index, list) => list.indexOf(executable) === index)
      .filter((executable) => !selectedSet.has(executable))

    const hiddenExecutables = commandTreeExecutables.filter((executable) => !selectedSet.has(executable))
    const updatedSettings = await window.electronAPI.updateSettings({
      hiddenCommandExecutables: hiddenExecutables
    })
    useSettingsStore.getState().setSettings(updatedSettings)

    if (selectedNewCommands.length > 0) {
      await window.electronAPI.saveDiscoveredCommands(selectedNewCommands)

      const newDefs: CommandDefinition[] = selectedNewCommands
        .filter((cmd) => !existingSet.has(cmd.executable))
        .map((cmd) => ({
          id: `discovered-${cmd.executable}`,
          name: cmd.executable,
          executable: cmd.executable,
          description: 'Click "Generate Command Tree from --help" to populate options',
          category: cmd.executable,
          source: 'detected' as const,
          installed: true,
          enriched: false
        }))

      if (newDefs.length > 0) {
        addCommands(newDefs)
      }
    }

    for (const executable of commandsToRemove) {
      await window.electronAPI.removeDiscoveredCommand(executable)

      const matchingCommands = useCommandStore
        .getState()
        .commands.filter((command) => command.executable === executable)

      for (const command of matchingCommands) {
        removeCommand(command.id)
      }
    }

    setScanDialog(null)
  }

  const handleAddManualCommand = async (
    executable: string
  ): Promise<void> => {
    try {
      // Check if command already exists in the store
      const existingId = `manual-${executable}`
      const alreadyExists = commands.some(
        (c) => c.id === existingId || c.executable === executable
      )
      if (alreadyExists) {
        setAddCommandOpen(false)
        return
      }

      await window.electronAPI.addManualCommand(executable, executable)

      const newDef: CommandDefinition = {
        id: existingId,
        name: executable,
        executable,
        description: 'Click "Generate Command Tree from --help" to populate options',
        category: executable,
        source: 'manual',
        installed: true,
        enriched: false
      }

      addCommands([newDef])

      setAddCommandOpen(false)
    } catch (err) {
      console.error('Failed to add manual command:', err)
    }
  }

  const handleInstallCatalogCommand = async (commandString: string): Promise<void> => {
    try {
      const sessionId = await createProjectTerminalSession(
        activeProject,
        addTerminalSession,
        undefined,
        'workspace-shell',
        activeProject?.workingDirectory
      )
      window.electronAPI.writeToTerminal(sessionId, `${commandString}\n`)
    } catch (error) {
      console.error('Failed to open install terminal:', error)
    }
  }

  const handleSyncExecutableCommands = async (
    executable: string,
    executableCommands: CommandDefinition[]
  ): Promise<void> => {
    const syncKey = executable
    if (syncedExecutableRef.current.has(syncKey)) return
    if (executableCommands.length === 0) return

    const source = executableCommands[0]?.source ?? 'builtin'
    syncedExecutableRef.current.add(syncKey)

    try {
      const resolvedPath = await window.electronAPI.findCommand(executable)
      const isInstalled = resolvedPath !== null
      const commandsInStore = useCommandStore.getState().commands
      const existingRoot = commandsInStore.find(
        (command) =>
          command.executable === executable &&
          (isCliRoot(command) || isRootLike(command, executable))
      )
      if (!existingRoot) {
        addCommands([
          {
            id: `${source || 'builtin'}-${executable}-root`,
            name: executable,
            executable,
            description: `${executable} command-line tool`,
            category: executable,
            source,
            installed: isInstalled,
            enriched: true,
            tags: ['cli-root']
          }
        ])
      }

      const result = await window.electronAPI.parseHelp(executable)
      if (!result) {
        syncedExecutableRef.current.delete(syncKey)
        return
      }

      const desiredDefinitions = result.subcommands
        .filter((subcommand) => subcommand.chain.length === 1)
        .map((subcommand) => ({
          id: `auto-${executable}-${subcommand.chain.join('-')}`,
          name: `${executable} ${subcommand.chain.join(' ')}`,
          executable,
          subcommands: subcommand.chain,
          description: subcommand.description,
          category: executable,
          source,
          installed: isInstalled,
          enriched: true,
          options: subcommand.options,
          positionalArgs: subcommand.positionalArgs
        } satisfies CommandDefinition))

      const desiredSubcommandKeys = new Set(
        desiredDefinitions.map((definition) => buildCommandKey(definition))
      )

      const staleTopLevelDefinitions = useCommandStore
        .getState()
        .commands.filter(
          (command) =>
            command.executable === executable &&
            !command.tags?.includes('saved-command') &&
            command.subcommands?.length === 1 &&
            command.enriched === true &&
            !desiredSubcommandKeys.has(buildCommandKey(command))
        )

      for (const stale of staleTopLevelDefinitions) {
        removeCommand(stale.id)
      }

      const rootDefinition: CommandDefinition = {
        id: `${source || 'builtin'}-${executable}-root`,
        name: executable,
        executable,
        description: resolveRootDescription(executable, result.description),
        category: executable,
        source,
        installed: isInstalled,
        enriched: true,
        options: result.options,
        positionalArgs: result.positionalArgs,
        tags: ['cli-root']
      }

      const duplicateRoots = useCommandStore
        .getState()
        .commands.filter(
          (command) =>
            command.executable === executable &&
            (isCliRoot(command) || isRootLike(command, executable)) &&
            command.id !== rootDefinition.id
        )

      for (const duplicateRoot of duplicateRoots) {
        removeCommand(duplicateRoot.id)
      }

      const currentCommands = useCommandStore.getState().commands
      const refreshedRoot = currentCommands.find(
        (command) =>
          command.executable === executable &&
          (isCliRoot(command) || isRootLike(command, executable))
      )

      if (refreshedRoot) {
        useCommandStore.getState().updateCommand({
          ...refreshedRoot,
          category: executable,
          description: rootDefinition.description,
          options: rootDefinition.options,
          positionalArgs: rootDefinition.positionalArgs,
          installed: isInstalled,
          enriched: true,
          tags: ['cli-root']
        })
      } else {
        addCommands([rootDefinition])
      }

      const currentCommandsByKey = new Map(
        useCommandStore
          .getState()
          .commands.filter((command) => command.executable === executable)
          .map((command) => [buildCommandKey(command), command] as const)
      )

      const newDefinitions: CommandDefinition[] = []

      for (const definition of desiredDefinitions) {
        const existing = currentCommandsByKey.get(buildCommandKey(definition))
        if (existing) {
          useCommandStore.getState().updateCommand({
            ...existing,
            description: definition.description,
            category: executable,
            installed: isInstalled,
            enriched: true,
            options: definition.options,
            positionalArgs: definition.positionalArgs
          })
          continue
        }
        newDefinitions.push(definition)
      }

      if (newDefinitions.length > 0) {
        addCommands(newDefinitions)
      }

      try {
        const savedPresetDefinitions = useCommandStore
          .getState()
          .commands.filter(
            (candidate) =>
              candidate.executable === executable &&
              candidate.tags?.includes('saved-command')
          )

        const persistedDefinitions = [
          rootDefinition,
          ...desiredDefinitions,
          ...savedPresetDefinitions
        ]
        await window.electronAPI.saveEnrichedBulk(executable, persistedDefinitions)
      } catch (error) {
        console.error(`Failed to cache synced command definitions for ${executable}:`, error)
      }
    } catch (error) {
      syncedExecutableRef.current.delete(syncKey)
      console.error(`Failed to sync installed commands for ${executable}:`, error)
    }
  }

  useEffect(() => {
    if (sidebarTab !== 'commands') return

    for (const [executable, executableCommands] of Object.entries(grouped)) {
      void handleSyncExecutableCommands(executable, executableCommands)
    }
  }, [grouped, sidebarTab])

  return (
    <div ref={sidebarRef} className="h-full min-h-0 bg-surface flex flex-col border-r border-surface-border overflow-hidden">
      {/* Tab switcher — labels when wide, scrollable icons when narrow */}
      <div className={clsx(
        'flex border-b border-surface-border shrink-0 bg-surface',
        narrow ? 'overflow-x-auto scrollbar-none' : 'overflow-hidden'
      )}>
        {(() => {
          const allTabs = [
            { id: 'commands', label: t('sidebar.tabs.commands'), icon: <TerminalSquare size={13} /> },
            { id: 'scripts',  label: t('sidebar.tabs.scripts'),  icon: <ScrollText size={13} /> },
            { id: 'snippets', label: t('sidebar.tabs.snippets'), icon: <Braces size={13} /> },
            { id: 'files', label: t('sidebar.tabs.files'), icon: <FolderTree size={13} /> },
            { id: 'logs',     label: t('sidebar.tabs.logs'),     icon: <FileText size={13} /> },
            { id: 'search',   label: t('sidebar.tabs.search'),   icon: <Search size={13} /> },
          ] as { id: ProjectSidebarTab; label: string; icon: React.ReactNode }[]
          const order = sidebarTabOrder.length > 0 ? sidebarTabOrder : allTabs.map((t) => t.id)
          const orderedTabs = order
            .map((id) => allTabs.find((t) => t.id === id))
            .filter(Boolean) as typeof allTabs
          // Include any tabs not in the saved order (in case new ones were added)
          for (const t of allTabs) {
            if (!orderedTabs.some((ot) => ot.id === t.id)) orderedTabs.push(t)
          }
          return orderedTabs
        })().map(({ id, label, icon }) => {
          return (
            <button
              key={id}
              draggable
              onClick={() => handleTabSwitch(id)}
              onDragStart={() => setDragTabId(id)}
              onDragOver={(e) => { e.preventDefault(); setDragOverTabId(id) }}
              onDrop={() => {
                if (dragTabId && dragTabId !== id) void handleTabDrop(dragTabId, id)
                setDragTabId(null)
                setDragOverTabId(null)
              }}
              onDragEnd={() => { setDragTabId(null); setDragOverTabId(null) }}
              title={label}
              className={clsx(
                'flex items-center justify-center gap-1 shrink-0 border-b-2 px-2 py-2 text-[12px] font-medium leading-none transition-colors',
                narrow ? 'min-w-[2.5rem]' : 'flex-1 basis-0 min-w-0',
                sidebarTab === id
                  ? 'text-accent-light border-b-accent bg-surface-light/40'
                  : 'text-gray-500 hover:bg-surface-light/30 hover:text-gray-300 border-transparent',
                dragOverTabId === id && dragTabId !== id && 'border-b-accent/50'
              )}
            >
              {icon}
              {!narrow && <span className="truncate">{label}</span>}
            </button>
          )
        })}
      </div>

      {sidebarTab === 'search' ? (
        <FindInFiles />
      ) : sidebarTab === 'logs' ? (
        <LogBrowser />
      ) : sidebarTab === 'files' ? (
        activeProject ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <FileBrowser />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center p-6">
            <div className="max-w-sm text-center space-y-3">
              <div className="text-sm font-medium text-gray-300">{t('sidebar.files.noProjectTitle')}</div>
              <div className="text-xs text-gray-500 leading-6">
                {t('sidebar.files.noProjectDescription')}
              </div>
            </div>
          </div>
        )
      ) : sidebarTab === 'snippets' ? (
        <SnippetList onSelectSnippet={handleSelectSnippet} />
      ) : sidebarTab === 'scripts' ? (
        <ScriptList onSelectScript={handleSelectScript} />
      ) : (
        <>
          <div className="p-3 flex items-center gap-2">
            <div className="flex-1">
              <CommandSearch value={query} onChange={setQuery} />
            </div>
            {commandTreeKeys.length > 0 && (
              <button
                onClick={() => handleSetAllCommandTreesCollapsed(!allCommandTreesCollapsed)}
                className="tv-btn-icon shrink-0"
                title={allCommandTreesCollapsed ? t('sidebar.commands.expandAll') : t('sidebar.commands.collapseAll')}
              >
                {allCommandTreesCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            )}
            <button
              onClick={() => setAddCommandOpen(true)}
              className="tv-btn-icon shrink-0"
              title={t('sidebar.commands.addManual')}
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => void handleScan('all')}
              className="tv-btn-icon shrink-0"
              title={t('sidebar.commands.scanInstalled')}
            >
              <Radar size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {favorites.length > 0 && !query && (
              <div className="mb-2">
                <div className="flex items-center gap-1.5 px-2 py-1.5 tv-section-label text-caution">
                  <Star size={11} fill="currentColor" />
                  {t('sidebar.commands.favorites')}
                </div>
                <div className="space-y-0.5 ml-1">
                  {favorites.map((cmd) => (
                    <div
                      key={cmd.id}
                      className="rounded-lg"
                    >
                      <CategoryListFavoriteCard
                        command={cmd}
                        onSelect={() => handleSelectCommand(cmd)}
                        onToggleFavorite={() => void handleToggleFavoriteCommand(cmd)}
                        onRemove={cmd.tags?.includes('saved-command') ? () => void handleRemoveSavedCommand(cmd) : undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center text-gray-500 text-sm mt-8">{t('sidebar.commands.loading')}</div>
            ) : Object.keys(grouped).length === 0 && (query.trim() || commands.length > 0) ? (
              <div className="mx-2 mt-8 rounded-xl border border-surface-border/50 bg-surface-light/20 p-4 text-center">
                <p className="text-sm text-gray-500">{t('sidebar.commands.noMatches')}</p>
                <p className="text-xs text-gray-600 mt-1">{t('sidebar.commands.noMatchesHint')}</p>
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="mx-2 mt-8 rounded-2xl border border-surface-border bg-surface-light/40 p-5 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent-light">
                  <Sparkles size={18} />
                </div>
                <h3 className="text-base font-semibold text-gray-200">{t('sidebar.commands.emptyTitle')}</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
                  {t('sidebar.commands.emptyDescription')}
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <button
                    onClick={() => void handleScan('popular')}
                    className="tv-btn-accent"
                  >
                    {t('sidebar.commands.pickPopular')}
                  </button>
                  <button
                    onClick={() => void handleScan('all')}
                    className="tv-btn-secondary"
                  >
                    {t('sidebar.commands.scanAll')}
                  </button>
                </div>
              </div>
            ) : (
              <CategoryList
                groups={grouped}
                onSelect={handleSelectCommand}
                favoriteIds={favoriteIds}
                onToggleFavorite={activeProject ? (command) => void handleToggleFavoriteCommand(command) : undefined}
                onRemoveCommand={(command) => setConfirmDeleteCommand(command)}
                collapsed={collapsedCommandTrees}
                onToggleCollapsed={handleToggleCommandTree}
              />
            )}
          </div>

          {scanDialog && (
            <ScanResultsDialog
              discovered={scanDialog.discovered}
              existingExecutables={scanDialog.existingExecutables}
              visibleExecutables={scanDialog.visibleExecutables}
              title={scanDialog.title}
              onSave={(selectedExecutables) => {
                void handleApplyScanResults(selectedExecutables)
              }}
              onClose={() => setScanDialog(null)}
            />
          )}

          {addCommandOpen && (
            <AddCommandDialog
              onAdd={handleAddManualCommand}
              onInstallCommand={handleInstallCatalogCommand}
              onClose={() => setAddCommandOpen(false)}
            />
          )}

          {confirmDeleteCommand && (
            <ConfirmDialog
              title={t('sidebar.commands.removeTitle')}
              message={t('sidebar.commands.removeMessage', { name: confirmDeleteCommand.name })}
              confirmLabel={t('sidebar.commands.remove')}
              onConfirm={() => {
                void handleRemoveSavedCommand(confirmDeleteCommand)
                setConfirmDeleteCommand(null)
              }}
              onCancel={() => setConfirmDeleteCommand(null)}
            />
          )}
        </>
      )}

      <div className="shrink-0 border-t border-surface-border px-3 py-2 text-[11px] text-gray-600">
        {appVersion ? `v${appVersion}` : t('sidebar.versionLoading')}
      </div>
    </div>
  )
}

function CategoryListFavoriteCard({
  command,
  onSelect,
  onToggleFavorite,
  onRemove
}: {
  command: CommandDefinition
  onSelect: () => void
  onToggleFavorite: () => void
  onRemove?: () => void
}): JSX.Element {
  const { t } = useTranslation('layout')

  return (
    <div className="w-full px-3 py-1.5 rounded-lg text-sm hover:bg-surface-light text-gray-300 border border-transparent transition-colors flex items-center gap-2">
      <button onClick={onSelect} className="flex-1 min-w-0 text-left">
        <span className="font-mono text-xs truncate">{command.name}</span>
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onToggleFavorite()
        }}
        className="shrink-0 p-1 rounded text-caution"
        title={t('sidebar.commands.removeFavorite')}
      >
        <Star size={12} fill="currentColor" />
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          className="shrink-0 p-1 rounded text-gray-600 hover:text-destructive transition-colors"
          title={t('sidebar.commands.removeSaved')}
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

function StarterPackCallout({
  starterPack,
  onOpenTab,
  onDismiss
}: {
  starterPack: ProjectStarterPack
  onOpenTab: (tab: ProjectSidebarTab) => void
  onDismiss: () => void
}): JSX.Element {
  const { t } = useTranslation('layout')

  return (
    <div className="shrink-0 px-3 pt-3">
      <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/12 via-surface-light to-surface p-3 shadow-lg shadow-black/10">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-8 h-8 rounded-xl bg-accent/15 text-accent-light flex items-center justify-center shrink-0">
            <Sparkles size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-200">{t('sidebar.starterPack.title')}</span>
              <button
                onClick={onDismiss}
                className="ml-auto p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-surface-light transition-colors"
                title={t('sidebar.starterPack.dismiss')}
              >
                <X size={12} />
              </button>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              {t('sidebar.starterPack.description')}
            </p>
          </div>
        </div>

        {starterPack.detections.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {starterPack.detections.map((detection) => (
              <span
                key={detection}
                className="px-2 py-1 rounded-md bg-accent/10 border border-accent/20 text-[11px] text-accent-light"
              >
                {detection}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <button
            onClick={() => onOpenTab('commands')}
            disabled={starterPack.categoryIds.length === 0}
            className="rounded-xl border border-surface-border bg-surface/80 px-2 py-2 text-left text-gray-300 hover:border-accent/30 hover:text-gray-200 transition-colors disabled:opacity-40 disabled:hover:border-surface-border disabled:hover:text-gray-300"
          >
            <div className="text-[10px] uppercase tracking-wider text-gray-500">{t('sidebar.starterPack.commands')}</div>
            <div className="mt-1 font-medium">
              {t('sidebar.starterPack.starterCommand', { count: starterPack.categoryIds.length })}
            </div>
          </button>
          <button
            onClick={() => onOpenTab('scripts')}
            disabled={starterPack.scriptIds.length === 0}
            className="rounded-xl border border-surface-border bg-surface/80 px-2 py-2 text-left text-gray-300 hover:border-accent/30 hover:text-gray-200 transition-colors disabled:opacity-40 disabled:hover:border-surface-border disabled:hover:text-gray-300"
          >
            <div className="text-[10px] uppercase tracking-wider text-gray-500">{t('sidebar.starterPack.scripts')}</div>
            <div className="mt-1 font-medium">
              {t('sidebar.starterPack.starterScript', { count: starterPack.scriptIds.length })}
            </div>
          </button>
          <button
            onClick={() => onOpenTab('snippets')}
            disabled={starterPack.snippetIds.length === 0}
            className="rounded-xl border border-surface-border bg-surface/80 px-2 py-2 text-left text-gray-300 hover:border-accent/30 hover:text-gray-200 transition-colors disabled:opacity-40 disabled:hover:border-surface-border disabled:hover:text-gray-300"
          >
            <div className="text-[10px] uppercase tracking-wider text-gray-500">{t('sidebar.starterPack.snippets')}</div>
            <div className="mt-1 font-medium">
              {t('sidebar.starterPack.starterSnippet', { count: starterPack.snippetIds.length })}
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
