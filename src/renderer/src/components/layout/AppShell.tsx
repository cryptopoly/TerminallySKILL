import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { PanelGroup, Panel, PanelResizeHandle, type ImperativePanelHandle } from 'react-resizable-panels'
import clsx from 'clsx'
import { Sidebar } from './Sidebar'
import { CommandBuilder } from '../command-builder/CommandBuilder'
import { ScriptEditor } from '../scripts/ScriptEditor'
import { FileViewer } from '../files/FileViewer'
import { SnippetEditor } from '../snippets/SnippetEditor'
import { TerminalPanel } from '../terminal/TerminalPanel'
import { DiffViewer } from '../terminal/DiffViewer'
import { ProjectSelector } from '../projects/ProjectSelector'
import { ProjectDialog } from '../projects/ProjectDialog'
import { SettingsPanel } from '../settings/SettingsPanel'
import { InfoPanel } from '../onboarding/InfoPanel'
import { CommandPalette } from '../palette/CommandPalette'
import { Dashboard } from '../dashboard/Dashboard'
import { WorkflowRunnerEngine } from '../scripts/WorkflowRunnerHost'
import { HelpTip } from '../ui/HelpTip'
import { resolveProjectTerminalContext, useTerminalStore } from '../../store/terminal-store'
import { useCommandStore } from '../../store/command-store'
import { useProjectStore } from '../../store/project-store'
import { resolveProjectScopedActiveScript, useScriptStore } from '../../store/script-store'
import { useSnippetStore } from '../../store/snippet-store'
import { useFileStore } from '../../store/file-store'
import { useSettingsStore } from '../../store/settings-store'
import { useWorkflowRunnerStore } from '../../store/workflow-runner-store'
import { confirmTerminalClose } from '../../lib/terminal-close'
import { FolderOpen, TerminalSquare, Settings, Info, Server, Monitor, ChevronUp, X, Download, Loader2, Github, Globe } from 'lucide-react'
import {
  getProjectWorkspaceTargetLabel,
  getProjectWorkspaceTargetSummary,
  isLocalProjectWorkspaceTarget,
  resolveProjectWorkingDirectory,
  type Project
} from '../../../../shared/project-schema'
import type { AppUpdateCheckResult } from '../../../../shared/update-schema'
import { createProjectTerminalSession, openInteractiveProjectShell } from '../../lib/workspace-session'
import type { ActiveFile } from '../../store/file-store'

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

function isPathWithinRoot(pathValue: string, rootPath: string): boolean {
  const normalizedRoot = rootPath.replace(/[\\/]+$/, '')
  return (
    pathValue === normalizedRoot ||
    pathValue.startsWith(`${normalizedRoot}/`) ||
    pathValue.startsWith(`${normalizedRoot}\\`)
  )
}

export function AppShell(): JSX.Element {
  const isMac = navigator.platform.toLowerCase().includes('mac')
  const terminalVisible = useTerminalStore((s) => s.terminalVisible)
  const splitDirection = useTerminalStore((s) => s.splitDirection)
  const sessions = useTerminalStore((s) => s.sessions)
  const activeSessionId = useTerminalStore((s) => s.activeSessionId)
  const splitSessionId = useTerminalStore((s) => s.splitSessionId)
  const { addSession, setTerminalVisible, setSplitDirection, setActiveSession, removeSession } = useTerminalStore()
  const activeCommand = useCommandStore((s) => s.activeCommand)
  const activeScript = useScriptStore((s) => s.activeScript)
  const scripts = useScriptStore((s) => s.scripts)
  const setActiveScript = useScriptStore((s) => s.setActiveScript)
  const activeSnippet = useSnippetStore((s) => s.activeSnippet)
  const openFiles = useFileStore((s) => s.openFiles)
  const activeFilePath = useFileStore((s) => s.activeFilePath)
  const activeFile = useFileStore((s) => (s.fileViewerVisible ? s.activeFile : null))
  const requestCloseActiveFile = useFileStore((s) => s.requestCloseActiveFile)
  const hydrateFiles = useFileStore((s) => s.hydrateFiles)
  const clearFiles = useFileStore((s) => s.clearFiles)
  const activeProject = useProjectStore((s) => s.activeProject)
  const setSidebarTab = useProjectStore((s) => s.setSidebarTab)
  const settings = useSettingsStore((s) => s.settings)
  const settingsHydrated = useSettingsStore((s) => s.settingsHydrated)
  const runsBySession = useWorkflowRunnerStore((s) => s.runsBySession)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [infoInitialSection, setInfoInitialSection] = useState<string | undefined>(undefined)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [startupUpdateCheck, setStartupUpdateCheck] = useState<AppUpdateCheckResult | null>(null)
  const [startupUpdateInstalling, setStartupUpdateInstalling] = useState(false)
  const [startupUpdateMessage, setStartupUpdateMessage] = useState<string | null>(null)
  const [dismissedStartupUpdateVersion, setDismissedStartupUpdateVersion] = useState<string | null>(null)
  const layoutHydratedProjectIdRef = useRef<string | null>(null)
  const layoutSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionVisitedProjectIds = useRef<Set<string>>(new Set())
  const startupUpdateCheckedRef = useRef(false)
  const terminalDockPanelRef = useRef<ImperativePanelHandle | null>(null)
  const activeProjectId = activeProject?.id ?? null
  const {
    projectSessions,
    activeProjectSessionId,
    splitProjectSessionId
  } = useMemo(
    () => resolveProjectTerminalContext(sessions, activeProjectId, activeSessionId, splitSessionId),
    [activeProjectId, activeSessionId, sessions, splitSessionId]
  )
  const showDockedTerminal = terminalVisible
  const showCollapsedTerminalBar = !showDockedTerminal && projectSessions.length > 0

  useEffect(() => {
    const terminalPanel = terminalDockPanelRef.current
    if (!terminalPanel) return

    if (showDockedTerminal) {
      const targetSize = activeProject?.workspaceLayout.terminalSize ?? 35
      if (terminalPanel.isCollapsed()) {
        terminalPanel.expand(targetSize)
      } else if (Math.abs(terminalPanel.getSize() - targetSize) > 0.5) {
        terminalPanel.resize(targetSize)
      }
      return
    }

    if (!terminalPanel.isCollapsed()) {
      terminalPanel.collapse()
    }
  }, [activeProject?.workspaceLayout.terminalSize, showDockedTerminal])

  // Keep window title in sync with active project
  useEffect(() => {
    document.title = activeProject ? `${activeProject.name} — TerminallySKILL` : 'TerminallySKILL'
  }, [activeProject?.name])

  const getFreshTerminalProjectCwd = useCallback((): string | undefined => {
    if (!activeProject || activeProject.workspaceTarget.type !== 'local') {
      return undefined
    }

    return resolveProjectWorkingDirectory(activeProject)
  }, [activeProject])

  /** Open a fresh terminal tab for the active project's workspace target */
  const handleNewTerminal = useCallback(async (): Promise<void> => {
    await createProjectTerminalSession(
      activeProject,
      addSession,
      useProjectStore.getState().getActiveEnvOverrides(),
      'workspace-shell',
      getFreshTerminalProjectCwd()
    )
  }, [activeProject, addSession, getFreshTerminalProjectCwd])

  /** Split the terminal area with a new session */
  const handleSplitTerminal = useCallback(async (direction: 'horizontal' | 'vertical'): Promise<void> => {
    const primaryId = useTerminalStore.getState().activeSessionId
    const sessionId = await createProjectTerminalSession(
      activeProject,
      addSession,
      useProjectStore.getState().getActiveEnvOverrides()
    )
    if (primaryId) useTerminalStore.getState().setActiveSession(primaryId)
    useTerminalStore.getState().splitTerminal(direction, sessionId)
  }, [activeProject, addSession])

  const handleOpenInteractiveSSH = useCallback(async (): Promise<void> => {
    await openInteractiveProjectShell(activeProject, addSession)
  }, [activeProject, addSession])

  const handleOpenVnc = useCallback(async (): Promise<void> => {
    if (!activeProject || activeProject.workspaceTarget.type !== 'ssh') return
    try {
      const vncPort = activeProject.workspaceTarget.vncPort ?? 5901
      const { sessionId, wsPort, token } = await window.electronAPI.startVncSession(
        activeProject.workspaceTarget,
        vncPort
      )
      addSession(sessionId, activeProject.id, 'vnc', wsPort, token)
      setTerminalVisible(true)
    } catch (err) {
      console.error('[VNC] Failed to start session:', err)
    }
  }, [activeProject, addSession, setTerminalVisible])

  const handleCloseCollapsedSession = useCallback(async (sessionId: string): Promise<void> => {
    const shouldClose = await confirmTerminalClose(sessionId, runsBySession)
    if (!shouldClose) return

    window.electronAPI.killTerminal(sessionId)
    removeSession(sessionId)
  }, [removeSession, runsBySession])

  const cycleTerminalTabs = useCallback((direction: 1 | -1): void => {
    const state = useTerminalStore.getState()
    const projectContext = resolveProjectTerminalContext(
      state.sessions,
      activeProject?.id ?? null,
      state.activeSessionId,
      state.splitSessionId
    )
    if (projectContext.projectSessions.length < 2) return

    const currentSessionId =
      state.focusedPane === 'secondary' && projectContext.splitProjectSessionId
        ? projectContext.splitProjectSessionId
        : projectContext.activeProjectSessionId

    const currentIndex = projectContext.projectSessions.findIndex((session) => session.id === currentSessionId)
    const baseIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex =
      (baseIndex + direction + projectContext.projectSessions.length) % projectContext.projectSessions.length
    const nextSessionId = projectContext.projectSessions[nextIndex]?.id
    if (!nextSessionId) return

    state.setActiveSession(nextSessionId)
  }, [activeProject?.id])

  const closeFocusedTerminalTab = useCallback(async (): Promise<void> => {
    const state = useTerminalStore.getState()
    const projectContext = resolveProjectTerminalContext(
      state.sessions,
      activeProject?.id ?? null,
      state.activeSessionId,
      state.splitSessionId
    )
    const targetSessionId =
      state.focusedPane === 'secondary' && projectContext.splitProjectSessionId
        ? projectContext.splitProjectSessionId
        : projectContext.activeProjectSessionId

    if (!targetSessionId) return

    const shouldClose = await confirmTerminalClose(targetSessionId, runsBySession)
    if (!shouldClose) return

    window.electronAPI.killTerminal(targetSessionId)
    state.removeSession(targetSessionId)
  }, [activeProject?.id, runsBySession])

  const isEditableShortcutTarget = useCallback((target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false

    return Boolean(
      target.closest('input, textarea, [contenteditable="true"], [role="textbox"], .xterm-helper-textarea')
    )
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      // Cmd/Ctrl+/ — toggle terminal
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === '/') {
        e.preventDefault()
        const state = useTerminalStore.getState()
        if (!state.terminalVisible || state.sessions.length === 0) {
          handleNewTerminal()
        } else {
          setTerminalVisible(!state.terminalVisible)
        }
      }
      // Cmd/Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
      // Cmd/Ctrl+Shift+F — find in files
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setSidebarTab('search')
      }
      // Cmd+W — close active file tab (when a file is open and focus is not in an input/terminal)
      if (e.metaKey && !e.ctrlKey && !e.shiftKey && e.key === 'w') {
        const fileState = useFileStore.getState()
        if (fileState.fileViewerVisible && fileState.activeFile && !isEditableShortcutTarget(e.target)) {
          e.preventDefault()
          requestCloseActiveFile()
        }
      }
      // Cmd/Ctrl+T — new terminal
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 't') {
        e.preventDefault()
        handleNewTerminal()
      }
      // Cmd/Ctrl+I — help guide
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'i') {
        e.preventDefault()
        setInfoOpen((prev) => !prev)
      }
      // Cmd/Ctrl+S — settings (only when not in an editable field)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 's') {
        if (!isEditableShortcutTarget(e.target)) {
          e.preventDefault()
          setSettingsOpen((prev) => !prev)
        }
      }
      // Ctrl+Tab / Ctrl+Shift+Tab — cycle terminal tabs
      if (e.ctrlKey && !e.metaKey && e.key === 'Tab') {
        const state = useTerminalStore.getState()
        const projectContext = resolveProjectTerminalContext(
          state.sessions,
          activeProject?.id ?? null,
          state.activeSessionId,
          state.splitSessionId
        )
        if (projectContext.projectSessions.length > 1) {
          e.preventDefault()
          cycleTerminalTabs(e.shiftKey ? -1 : 1)
          return
        }
      }
      // Ctrl+W — close the focused terminal tab, but do not steal shell/input word-delete
      if (e.ctrlKey && !e.metaKey && !e.shiftKey && e.key.toLowerCase() === 'w') {
        const state = useTerminalStore.getState()
        const projectContext = resolveProjectTerminalContext(
          state.sessions,
          activeProject?.id ?? null,
          state.activeSessionId,
          state.splitSessionId
        )
        if (projectContext.projectSessions.length > 0 && !isEditableShortcutTarget(e.target)) {
          e.preventDefault()
          void closeFocusedTerminalTab()
          return
        }
      }
      // Cmd+D — split terminal vertically
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'd') {
        const state = useTerminalStore.getState()
        const projectContext = resolveProjectTerminalContext(
          state.sessions,
          activeProject?.id ?? null,
          state.activeSessionId,
          state.splitSessionId
        )
        if (state.terminalVisible && projectContext.activeProjectSessionId && !projectContext.splitProjectSessionId) {
          e.preventDefault()
          handleSplitTerminal('vertical')
        }
      }
      // Cmd+Shift+D — split terminal horizontally
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        const state = useTerminalStore.getState()
        const projectContext = resolveProjectTerminalContext(
          state.sessions,
          activeProject?.id ?? null,
          state.activeSessionId,
          state.splitSessionId
        )
        if (state.terminalVisible && projectContext.activeProjectSessionId && !projectContext.splitProjectSessionId) {
          e.preventDefault()
          handleSplitTerminal('horizontal')
        }
      }
      // Cmd+] / Cmd+[ — switch focused pane
      if ((e.metaKey || e.ctrlKey) && (e.key === ']' || e.key === '[')) {
        const state = useTerminalStore.getState()
        const projectContext = resolveProjectTerminalContext(
          state.sessions,
          activeProject?.id ?? null,
          state.activeSessionId,
          state.splitSessionId
        )
        if (projectContext.splitProjectSessionId) {
          e.preventDefault()
          state.toggleFocusedPane()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    activeProject?.id,
    closeFocusedTerminalTab,
    cycleTerminalTabs,
    dialogOpen,
    handleNewTerminal,
    isEditableShortcutTarget,
    infoOpen,
    paletteOpen,
    requestCloseActiveFile,
    setSidebarTab,
    setTerminalVisible,
    settingsOpen
  ])

  useEffect(() => {
    if (!activeProject) {
      layoutHydratedProjectIdRef.current = null
      clearFiles()
      return
    }

    layoutHydratedProjectIdRef.current = null
    const isFirstVisit = !sessionVisitedProjectIds.current.has(activeProject.id)
    sessionVisitedProjectIds.current.add(activeProject.id)
    setTerminalVisible(isFirstVisit ? false : activeProject.workspaceLayout.terminalVisible)
    setSplitDirection(activeProject.workspaceLayout.preferredSplitDirection)

    let cancelled = false

    const restoreProjectFiles = async (): Promise<void> => {
      const shouldShowFileViewer = activeProject.workspaceLayout.sidebarTab === 'files'
      const savedPaths = activeProject.workspaceLayout.openFilePaths ?? []
      const savedActiveFilePath = activeProject.workspaceLayout.activeFilePath
      const projectRoot = resolveProjectWorkingDirectory(activeProject)

      if (!isLocalProjectWorkspaceTarget(activeProject.workspaceTarget) || savedPaths.length === 0) {
        if (!cancelled) {
          hydrateFiles([], null, false)
          layoutHydratedProjectIdRef.current = activeProject.id
        }
        return
      }

      const restoredFiles: ActiveFile[] = []

      for (const filePath of savedPaths) {
        try {
          const useScopedRead = isPathWithinRoot(filePath, projectRoot)
          const result = useScopedRead
            ? await window.electronAPI.readScopedFileContent(filePath)
            : await window.electronAPI.readFileContent(filePath)
          if ('error' in result) {
            continue
          }

          if ('tooLarge' in result) {
            restoredFiles.push({
              path: filePath,
              name: filePath.split('/').pop() || filePath,
              content: '',
              truncated: false,
              tooLarge: true,
              size: result.size,
              modifiedAt: result.modifiedAt,
              readAccess: useScopedRead ? 'scoped' : 'permissive',
              source: 'project-restore'
            })
            continue
          }

          restoredFiles.push({
            path: filePath,
            name: filePath.split('/').pop() || filePath,
            content: result.content,
            truncated: result.truncated,
            tooLarge: false,
            size: result.size,
            modifiedAt: result.modifiedAt,
            readAccess: useScopedRead ? 'scoped' : 'permissive',
            source: 'project-restore'
          })
        } catch (error) {
          console.error(`Failed to restore persisted file tab for ${filePath}:`, error)
        }
      }

      if (cancelled) return

      hydrateFiles(
        restoredFiles,
        savedActiveFilePath,
        shouldShowFileViewer && restoredFiles.length > 0
      )
      layoutHydratedProjectIdRef.current = activeProject.id
    }

    void restoreProjectFiles()

    return () => {
      cancelled = true
    }
  }, [activeProject?.id, clearFiles, hydrateFiles, setSplitDirection, setTerminalVisible])

  useEffect(() => {
    const resolvedActiveScript = resolveProjectScopedActiveScript(
      scripts,
      activeProject,
      activeScript
    )

    if ((resolvedActiveScript?.id ?? null) !== (activeScript?.id ?? null)) {
      setActiveScript(resolvedActiveScript)
    }
  }, [activeProject, activeScript, scripts, setActiveScript])

  const queueWorkspaceLayoutSave = useCallback((nextLayout: Project['workspaceLayout']): void => {
    if (!activeProject) return

    if (layoutSaveTimeoutRef.current) {
      clearTimeout(layoutSaveTimeoutRef.current)
    }

    layoutSaveTimeoutRef.current = setTimeout(() => {
      void window.electronAPI
        .updateProject(activeProject.id, { workspaceLayout: nextLayout })
        .then((updated) => {
          if (updated) {
            useProjectStore.getState().updateProjectInStore(updated)
          }
        })
    }, 150)
  }, [activeProject])

  useEffect(() => {
    return () => {
      if (layoutSaveTimeoutRef.current) {
        clearTimeout(layoutSaveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!settingsHydrated) return
    if (startupUpdateCheckedRef.current) return
    startupUpdateCheckedRef.current = true

    if (!settings.checkForUpdatesOnStartup) return

    void window.electronAPI
      .checkForAppUpdate()
      .then((result) => {
        setStartupUpdateCheck(result)
        setStartupUpdateMessage(null)
      })
      .catch((error) => {
        setStartupUpdateCheck({
          status: 'error',
          currentVersion: 'unknown',
          checkedAt: new Date().toISOString(),
          feedUrl: settings.devUpdateFeedUrl.trim() || null,
          message: error instanceof Error ? error.message : String(error)
        })
      })
  }, [settings.checkForUpdatesOnStartup, settings.devUpdateFeedUrl, settingsHydrated])

  useEffect(() => {
    if (!activeProject || layoutHydratedProjectIdRef.current !== activeProject.id) return

    const nextLayout = {
      ...activeProject.workspaceLayout,
      terminalVisible,
      preferredSplitDirection: splitDirection,
      openFilePaths: openFiles.map((file) => file.path),
      activeFilePath
    }

    if (
      nextLayout.terminalVisible !== activeProject.workspaceLayout.terminalVisible ||
      nextLayout.preferredSplitDirection !== activeProject.workspaceLayout.preferredSplitDirection ||
      nextLayout.activeFilePath !== activeProject.workspaceLayout.activeFilePath ||
      !areStringArraysEqual(nextLayout.openFilePaths, activeProject.workspaceLayout.openFilePaths)
    ) {
      queueWorkspaceLayoutSave(nextLayout)
    }
  }, [activeFilePath, activeProject, openFiles, queueWorkspaceLayoutSave, splitDirection, terminalVisible])

  const handleCreateNew = (): void => {
    setEditingProject(null)
    setDialogOpen(true)
  }

  const handleEditProject = (project: Project): void => {
    setEditingProject(project)
    setDialogOpen(true)
  }

  const handleDownloadStartupUpdate = useCallback(async (): Promise<void> => {
    setStartupUpdateInstalling(true)
    setStartupUpdateMessage(null)

    try {
      const result = await window.electronAPI.downloadAndOpenAppUpdate()
      setStartupUpdateMessage(result.message)
    } catch (error) {
      setStartupUpdateMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setStartupUpdateInstalling(false)
    }
  }, [])

  // Determine what to show in the main panel
  const mainContent = activeFile ? (
    <FileViewer />
  ) : activeSnippet ? (
    <SnippetEditor />
  ) : activeScript ? (
    <ScriptEditor />
  ) : activeCommand ? (
    <CommandBuilder />
  ) : activeProject ? (
    <Dashboard
      onNewTerminal={handleNewTerminal}
      onShowInfo={(section) => { setInfoInitialSection(section); setInfoOpen(true) }}
    />
  ) : (
    <EmptyState
      onCreateProject={handleCreateNew}
      onShowInfo={(section) => { setInfoInitialSection(section); setInfoOpen(true) }}
    />
  )

  const showStartupUpdateBanner =
    startupUpdateCheck?.status === 'update-available' &&
    startupUpdateCheck.latestVersion !== dismissedStartupUpdateVersion

  const startupUpdateActionLabel =
    startupUpdateCheck?.delivery === 'electron-updater'
      ? 'Download & Install Update'
      : 'Download & Open Update'

  const startupInstallingActionLabel =
    startupUpdateCheck?.delivery === 'electron-updater'
      ? 'Installing Update'
      : 'Opening Update'

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Title bar */}
      <div
        className="h-10 bg-surface flex items-center pr-3 select-none shrink-0 border-b border-surface-border"
        style={{
          WebkitAppRegion: 'drag',
          paddingLeft: isMac ? '5.5rem' : '0.75rem'
        } as React.CSSProperties}
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <TVLogo size={16} />
          <span className="text-xs font-semibold tracking-[0.18em] text-gray-400 truncate">
            TerminallySKILL
          </span>
        </div>

        {/* Centre: Project selector */}
        <div className="flex-1 flex justify-center min-w-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <ProjectSelector onCreateNew={handleCreateNew} onEditProject={handleEditProject} />
        </div>

        {/* Right: icons + workspace label */}
        <div
          className="flex items-center gap-0.5 shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {activeProject?.workspaceTarget.type === 'ssh' && (
            <HelpTip label="SSH Shell" description="Open a new interactive SSH shell for this workspace">
              <button
                onClick={handleOpenInteractiveSSH}
                className="tv-btn-icon"
              >
                <Server size={15} />
              </button>
            </HelpTip>
          )}
          {activeProject?.workspaceTarget.type === 'ssh' && (
            <HelpTip label="VNC Viewer" description="Open a remote desktop session via encrypted SSH tunnel">
              <button
                onClick={() => void handleOpenVnc()}
                className="tv-btn-icon"
              >
                <Monitor size={15} />
              </button>
            </HelpTip>
          )}
          <HelpTip label="New Terminal" description="Open a shell tab" shortcut={`${isMac ? '⌘' : 'Ctrl+'}T`}>
            <button
              onClick={handleNewTerminal}
              className="tv-btn-icon"
            >
              <TerminalSquare size={15} />
            </button>
          </HelpTip>
          <HelpTip label="Help Guide" description="How to use TerminallySKILL" shortcut={`${isMac ? '⌘' : 'Ctrl+'}I`}>
            <button
              onClick={() => setInfoOpen(true)}
              className="tv-btn-icon"
            >
              <Info size={15} />
            </button>
          </HelpTip>
          <HelpTip label="Settings" description="Theme, AI providers, and preferences" shortcut={`${isMac ? '⌘' : 'Ctrl+'}S`}>
            <button
              onClick={() => setSettingsOpen(true)}
              className="tv-btn-icon"
            >
              <Settings size={15} />
            </button>
          </HelpTip>
          <HelpTip label="GitHub" description="View source and report issues">
            <button
              onClick={() => window.electronAPI.openExternal('https://github.com/cryptopoly/TerminallySKILL')}
              className="tv-btn-icon"
            >
              <Github size={15} />
            </button>
          </HelpTip>
          <HelpTip label="Website" description="terminallyskill.com">
            <button
              onClick={() => window.electronAPI.openExternal('https://terminallyskill.com')}
              className="tv-btn-icon"
            >
              <Globe size={15} />
            </button>
          </HelpTip>
          {activeProject && (
            <span className="tv-pill shrink-0 ml-1">
              {getProjectWorkspaceTargetLabel(activeProject)}
            </span>
          )}
        </div>
      </div>

      {showStartupUpdateBanner && startupUpdateCheck && (
        <div className="shrink-0 border-b border-accent/20 bg-accent/10 px-3 py-2.5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
                <span className="inline-flex h-2 w-2 rounded-full bg-accent" />
                Update {startupUpdateCheck.latestVersion} is available
              </div>
              <div className="mt-1 text-xs leading-5 text-gray-400">
                {startupUpdateCheck.message}
              </div>
              {startupUpdateCheck.notes && (
                <div className="mt-1 text-xs leading-5 text-gray-500">
                  {startupUpdateCheck.notes}
                </div>
              )}
              {startupUpdateMessage && (
                <div className="mt-2 text-xs leading-5 text-gray-300">
                  {startupUpdateMessage}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => void handleDownloadStartupUpdate()}
                disabled={startupUpdateInstalling}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-slate-950 hover:bg-cyan-300 transition-colors disabled:opacity-60"
              >
                {startupUpdateInstalling ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    {startupInstallingActionLabel}
                  </>
                ) : (
                  <>
                    <Download size={12} />
                    {startupUpdateActionLabel}
                  </>
                )}
              </button>
              <button
                onClick={() => setDismissedStartupUpdateVersion(startupUpdateCheck.latestVersion ?? null)}
                className="tv-btn-icon-sm h-8 w-8 text-gray-500 hover:text-gray-200"
                aria-label="Dismiss update banner"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <PanelGroup
        direction="vertical"
        className="flex-1"
        onLayout={(sizes) => {
          if (!activeProject || !showDockedTerminal || sizes.length < 2) return
          const nextTerminalSize = sizes[1]
          if (nextTerminalSize === activeProject.workspaceLayout.terminalSize) return
          queueWorkspaceLayoutSave({
            ...activeProject.workspaceLayout,
            terminalSize: nextTerminalSize
          })
        }}
      >
        <Panel
          defaultSize={showDockedTerminal ? 100 - (activeProject?.workspaceLayout.terminalSize ?? 35) : 100}
          minSize={30}
        >
          <PanelGroup
            key={`workspace-horizontal-${activeProject?.id ?? 'global'}`}
            direction="horizontal"
            onLayout={(sizes) => {
              if (!activeProject || sizes.length < 2) return
              const nextSidebarSize = sizes[0]
              if (nextSidebarSize === activeProject.workspaceLayout.sidebarSize) return
              queueWorkspaceLayoutSave({
                ...activeProject.workspaceLayout,
                sidebarSize: nextSidebarSize
              })
            }}
          >
            <Panel
              defaultSize={activeProject?.workspaceLayout.sidebarSize ?? 25}
              minSize={22}
              maxSize={40}
              className="min-w-[430px]"
            >
              <Sidebar />
            </Panel>
            <PanelResizeHandle className="w-px bg-surface-border hover:bg-accent transition-colors" />
            <Panel minSize={40} className="min-h-0">
              {mainContent}
            </Panel>
          </PanelGroup>
        </Panel>

        {showDockedTerminal && (
          <PanelResizeHandle className="h-px bg-surface-border hover:bg-accent transition-colors" />
        )}
        <Panel
          ref={terminalDockPanelRef}
          defaultSize={showDockedTerminal ? (activeProject?.workspaceLayout.terminalSize ?? 35) : 0}
          minSize={15}
          collapsible
          collapsedSize={0}
        >
          <TerminalPanel />
        </Panel>
      </PanelGroup>

      {showCollapsedTerminalBar && (
        <div className="shrink-0 border-t border-surface-border bg-surface">
          <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5">
            {projectSessions.map((session) => {
              const project = session.projectId
                ? useProjectStore.getState().projects.find((p) => p.id === session.projectId) ?? null
                : null
              const isActive = session.id === activeProjectSessionId
              const tabColor = project?.color ?? null
              const tabLabel = project ? project.name : session.id

              return (
                <button
                  key={session.id}
                  onClick={() => setActiveSession(session.id)}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors shrink-0',
                    isActive
                      ? 'border-surface-border bg-surface-light text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
                      : 'border-transparent bg-surface text-gray-500 hover:bg-surface-light hover:text-gray-300'
                  )}
                >
                  {tabColor && (
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tabColor }} />
                  )}
                  <span className="font-mono truncate max-w-[140px]">{tabLabel}</span>
                  <span
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleCloseCollapsedSession(session.id)
                    }}
                    className="tv-btn-icon-sm -mr-1 h-5 w-5 text-gray-500 hover:text-destructive"
                  >
                    <X size={12} />
                  </span>
                </button>
              )
            })}

            <div className="ml-auto flex items-center gap-1.5 pl-2 shrink-0">
              <HelpTip
                label="Expand Terminal"
                description="Restore the docked terminal panel"
                shortcut={isMac ? '⌘/' : 'Ctrl+/'}
              >
                <button
                  onClick={() => setTerminalVisible(true)}
                  className="tv-btn-secondary"
                >
                  <ChevronUp size={13} />
                  Expand Terminal
                </button>
              </HelpTip>
            </div>
          </div>
        </div>
      )}

      {dialogOpen && (
        <ProjectDialog project={editingProject} onClose={() => setDialogOpen(false)} />
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-[min(960px,calc(100vw-2rem))] max-h-[85vh] bg-surface border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
              <span className="text-sm font-semibold text-gray-200">Settings</span>
              <button
                onClick={() => setSettingsOpen(false)}
                className="tv-btn-icon"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SettingsPanel hideHeader />
            </div>
          </div>
        </div>
      )}

      {/* Info / onboarding modal */}
      {infoOpen && <InfoPanel onClose={() => { setInfoOpen(false); setInfoInitialSection(undefined) }} initialSection={infoInitialSection} />}

      {/* Command palette */}
      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onNewTerminal={handleNewTerminal}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenInfo={() => setInfoOpen(true)}
          onCreateProject={handleCreateNew}
        />
      )}

      {/* Snapshot diff viewer */}
      <DiffViewer />
      <WorkflowRunnerEngine />
    </div>
  )
}

/** Terminal Velocity logo — compact inline SVG version of the app icon */
function TVLogo({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="1024" height="1024" rx="228" fill="url(#tvbg)" />
      <line x1="130" y1="390" x2="360" y2="390" stroke="#fff" strokeOpacity="0.7" strokeWidth="42" strokeLinecap="round" />
      <line x1="90" y1="512" x2="340" y2="512" stroke="#fff" strokeOpacity="0.8" strokeWidth="48" strokeLinecap="round" />
      <line x1="130" y1="634" x2="360" y2="634" stroke="#fff" strokeOpacity="0.7" strokeWidth="42" strokeLinecap="round" />
      <path d="M410 340 L650 512 L410 684" stroke="#fff" strokeWidth="82" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="710" y1="694" x2="890" y2="694" stroke="#fff" strokeOpacity="0.85" strokeWidth="72" strokeLinecap="round" />
      <defs>
        <linearGradient id="tvbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'var(--logo-start)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--logo-end)' }} />
        </linearGradient>
      </defs>
    </svg>
  )
}

function EmptyState({
  onCreateProject,
  onShowInfo
}: {
  onCreateProject: () => void
  onShowInfo: (section?: string) => void
}): JSX.Element {
  return (
    <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
      <TVLogo size={48} />
      <div className="text-center">
        <h2 className="text-lg font-medium text-gray-400">Get started</h2>
        <p className="text-sm mt-1 max-w-xs">
          Create a project to set your workspace target and pin favourite commands
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={onCreateProject}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium transition-colors"
          >
            <FolderOpen size={14} />
            Create Project
          </button>
          <button
            onClick={() => onShowInfo()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-border text-gray-400 hover:text-accent-light hover:border-accent/40 text-sm transition-colors"
          >
            <Info size={14} />
            How it works
          </button>
        </div>
      </div>
    </div>
  )
}
