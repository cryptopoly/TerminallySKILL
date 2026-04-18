import { useEffect, useRef, useCallback, useState, useMemo, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
import { SerializeAddon } from '@xterm/addon-serialize'
import '@xterm/xterm/css/xterm.css'
import clsx from 'clsx'
import { useCommandStore } from '../../store/command-store'
import { resolveProjectTerminalContext, useTerminalStore } from '../../store/terminal-store'
import { useProjectStore } from '../../store/project-store'
import { useScriptStore } from '../../store/script-store'
import { useSnippetStore } from '../../store/snippet-store'
import { useSettingsStore } from '../../store/settings-store'
import { useSnapshotStore, type OutputSnapshot } from '../../store/snapshot-store'
import { isTerminalRunStatus, useWorkflowRunnerStore } from '../../store/workflow-runner-store'
import { TerminalSearchBar } from './TerminalSearchBar'
import { SnapshotPanel } from './SnapshotPanel'
import { PromoteCommandDialog } from './PromoteCommandDialog'
import { HelpTip } from '../ui/HelpTip'
import { Tooltip } from '../ui/Tooltip'
import { useFileStore } from '../../store/file-store'
import { WorkflowRunPanel } from '../scripts/WorkflowRunnerHost'
import { extractCommandTranscriptFromLines } from '../../lib/terminal-transcript'
import { formatCommandForDisplay, isSSHSessionCommand, getSSHHost } from '../../lib/command-display'
import {
  buildTerminalCompletionSuggestions,
  getTerminalCompletionSourceLabel,
  getTerminalCompletionSuffix
} from '../../lib/terminal-completion'
import {
  buildPromotionDefaultName,
  buildPromotedCommandDefinition,
  extractPrimaryExecutable
} from '../../lib/terminal-promotion'
import {
  assessTerminalPaste,
  detectSensitivePromptLabel,
  getBracketedPasteModeChange,
  wrapBracketedPaste
} from '../../lib/terminal-safety'
import { confirmTerminalClose } from '../../lib/terminal-close'
import type { Theme } from '../../../../shared/settings-schema'
import { resolveProjectWorkingDirectory } from '../../../../shared/project-schema'
import { createProjectTerminalSession, openInteractiveProjectShell } from '../../lib/workspace-session'
import type { ShellIntegrationEvent } from '../../../../shared/shell-integration'
import {
  Plus, X, ChevronDown, Wrench, Loader2, Check, XCircle,
  ArrowDown, Search, MessageCircle, Columns2, Rows2, Camera, Sparkles, Server, ShieldAlert, ScrollText, CircleHelp, SendHorizontal, Monitor
} from 'lucide-react'
import { VncPanel } from './VncPanel'

export function TerminalPanel({
  presentation = 'docked',
  onRequestClose
}: {
  presentation?: 'docked' | 'quick'
  onRequestClose?: () => void
} = {}): JSX.Element {
  const {
    sessions,
    activeSessionId,
    splitSessionId,
    splitDirection,
    focusedPane,
    addSession,
    removeSession,
    setActiveSession,
    setTerminalVisible,
    splitTerminal,
    closeSplitPane,
    setFocusedPane
  } = useTerminalStore()
  const activeProject = useProjectStore((s) => s.activeProject)
  const projects = useProjectStore((s) => s.projects)
  const runsBySession = useWorkflowRunnerStore((s) => s.runsBySession)
  const activeProjectId = activeProject?.id ?? null
  const {
    projectSessions,
    activeProjectSessionId,
    splitProjectSessionId
  } = useMemo(
    () => resolveProjectTerminalContext(sessions, activeProjectId, activeSessionId, splitSessionId),
    [activeProjectId, activeSessionId, sessions, splitSessionId]
  )
  const closeTerminalPanel = useCallback(() => {
    if (onRequestClose) {
      onRequestClose()
      return
    }
    setTerminalVisible(false)
  }, [onRequestClose, setTerminalVisible])

  /** Draggable split ratio (0-100), default 50% */
  const [splitRatio, setSplitRatio] = useState(50)
  const draggingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [snapshotPanelOpen, setSnapshotPanelOpen] = useState(false)
  const snapshotCount = useSnapshotStore((s) => s.snapshots.length)

  const getInheritedLocalCwd = useCallback(async (): Promise<string | undefined> => {
    if (!activeProject || activeProject.workspaceTarget.type !== 'local' || !activeProjectSessionId) {
      return undefined
    }

    const sessionInfo = await window.electronAPI.getSessionInfo(activeProjectSessionId)
    return sessionInfo?.cwd?.trim() || undefined
  }, [activeProject, activeProjectSessionId])

  const handleNewTab = async (): Promise<void> => {
    await createProjectTerminalSession(
      activeProject,
      addSession,
      useProjectStore.getState().getActiveEnvOverrides()
    )
  }

  const handleClose = useCallback(async (sessionId: string): Promise<void> => {
    const session = sessions.find((s) => s.id === sessionId)
    const shouldClose = session?.mode === 'vnc' || await confirmTerminalClose(sessionId, runsBySession)
    if (!shouldClose) return

    if (session?.mode === 'vnc') {
      window.electronAPI.stopVncSession(sessionId)
    } else {
      window.electronAPI.killTerminal(sessionId)
    }
    removeSession(sessionId)
  }, [removeSession, runsBySession, sessions])

  const handleSplit = async (direction: 'horizontal' | 'vertical'): Promise<void> => {
    // Save the current primary session BEFORE addSession changes activeSessionId
    const primaryId = activeProjectSessionId
    if (!primaryId) return

    const inheritedCwd = await getInheritedLocalCwd()
    const sessionId = await createProjectTerminalSession(
      activeProject,
      addSession,
      useProjectStore.getState().getActiveEnvOverrides(),
      'workspace-shell',
      inheritedCwd
    )
    // Restore the original session as primary, new one becomes the split pane
    if (primaryId) setActiveSession(primaryId)
    splitTerminal(direction, sessionId)
    setSplitRatio(50)
  }

  const handleOpenInteractiveSSH = async (): Promise<void> => {
    await openInteractiveProjectShell(activeProject, addSession)
  }

  const handleOpenVnc = async (): Promise<void> => {
    if (!activeProject || activeProject.workspaceTarget.type !== 'ssh') return
    try {
      const vncPort = activeProject.workspaceTarget.type === 'ssh'
        ? (activeProject.workspaceTarget.vncPort ?? 5901)
        : 5901
      const { sessionId, wsPort, token } = await window.electronAPI.startVncSession(
        activeProject.workspaceTarget,
        vncPort
      )
      addSession(sessionId, activeProject.id, 'vnc', wsPort, token)
    } catch (err) {
      console.error('[VNC] Failed to start session:', err)
    }
  }

  const handleCloseSplitPane = useCallback(async (sessionId: string): Promise<void> => {
    const shouldClose = await confirmTerminalClose(sessionId, runsBySession)
    if (!shouldClose) return

    closeSplitPane(sessionId)
    window.electronAPI.killTerminal(sessionId)
    removeSession(sessionId)
  }, [closeSplitPane, removeSession, runsBySession])

  const isSplit = !!splitProjectSessionId

  // Drag handler for the split resize divider
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = true
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (ev: MouseEvent): void => {
      if (!draggingRef.current || !container) return
      const rect = container.getBoundingClientRect()
      let ratio: number
      if (splitDirection === 'vertical') {
        ratio = ((ev.clientX - rect.left) / rect.width) * 100
      } else {
        ratio = ((ev.clientY - rect.top) / rect.height) * 100
      }
      setSplitRatio(Math.max(20, Math.min(80, ratio)))
    }

    const handleMouseUp = (): void => {
      draggingRef.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = splitDirection === 'vertical' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }, [splitDirection])

  /** Compute CSS style for each XTermInstance based on split state */
  const getSessionStyle = (sessionId: string): React.CSSProperties => {
    const isProjectSession = projectSessions.some((session) => session.id === sessionId)
    if (!isProjectSession) {
      return { display: 'none', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
    }

    if (!isSplit) {
      // No split: only active session is visible
      if (sessionId === activeProjectSessionId) {
        return { display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
      }
      return { display: 'none', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
    }

    // Split mode
    if (sessionId === activeProjectSessionId) {
      // Primary pane
      if (splitDirection === 'vertical') {
        return { display: 'flex', position: 'absolute', top: 0, left: 0, bottom: 0, width: `calc(${splitRatio}% - 2px)` }
      }
      return { display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: `calc(${splitRatio}% - 2px)` }
    }
    if (sessionId === splitProjectSessionId) {
      // Secondary pane
      if (splitDirection === 'vertical') {
        return { display: 'flex', position: 'absolute', top: 0, right: 0, bottom: 0, width: `calc(${100 - splitRatio}% - 2px)` }
      }
      return { display: 'flex', position: 'absolute', bottom: 0, left: 0, right: 0, height: `calc(${100 - splitRatio}% - 2px)` }
    }
    // Hidden session
    return { display: 'none', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
  }

  const isSessionInSplit = (id: string): boolean => {
    return id === activeProjectSessionId || id === splitProjectSessionId
  }

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Tab bar */}
      <div className="flex items-center bg-surface border-b border-surface-border shrink-0">
        <div className="flex items-center flex-1 overflow-x-auto">
          {projectSessions.map((session) => {
            const project = session.projectId
              ? projects.find((p) => p.id === session.projectId)
              : null
            const tabColor = project?.color ?? null
            const tabLabel = project ? project.name : session.id
            const isActive = activeProjectSessionId === session.id
            const isInSplit = isSplit && isSessionInSplit(session.id)
            const workflowRun = runsBySession[session.id] ?? null
            const workflowIsActive = workflowRun ? !isTerminalRunStatus(workflowRun.status) : false

            return (
              <button
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs border-r border-surface-border transition-colors ${
                  isActive
                    ? 'bg-surface-light text-gray-200'
                    : isInSplit
                      ? 'bg-surface-light/50 text-gray-300'
                      : 'text-gray-500 hover:text-gray-300'
                }`}
                style={{
                  borderBottom: isActive && tabColor
                    ? `2px solid ${tabColor}`
                    : isInSplit && tabColor
                      ? `2px solid ${tabColor}80`
                      : undefined
                }}
              >
                {tabColor && (
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: tabColor }}
                  />
                )}
                <span className="font-mono truncate max-w-[120px]">{tabLabel}</span>
                {workflowRun && (
                  <span
                    className={clsx(
                      'px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wide shrink-0',
                      workflowIsActive
                        ? 'border-accent/30 bg-accent/10 text-accent-light'
                        : workflowRun.status === 'completed'
                          ? 'border-safe/20 bg-safe/10 text-safe'
                          : workflowRun.status === 'failed' || workflowRun.status === 'cancelled'
                            ? 'border-destructive/20 bg-destructive/10 text-destructive'
                            : 'border-surface-border bg-surface-light text-gray-400'
                    )}
                  >
                    {workflowIsActive ? 'Run' : workflowRun.status}
                  </span>
                )}
                {session.mode === 'ssh-interactive' && (
                  <span className="px-1.5 py-0.5 rounded border border-accent/20 bg-accent/10 text-[10px] uppercase tracking-wide text-accent-light shrink-0">
                    SSH
                  </span>
                )}
                {session.mode === 'vnc' && (
                  <span className="px-1.5 py-0.5 rounded border border-purple-500/20 bg-purple-500/10 text-[10px] uppercase tracking-wide text-purple-300 shrink-0">
                    VNC
                  </span>
                )}
                <X
                  size={12}
                  className="opacity-50 hover:opacity-100 hover:text-destructive shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleClose(session.id)
                  }}
                />
              </button>
            )
          })}
          <HelpTip label="New Terminal" description="Open a new shell tab for your project workspace">
            <button
              onClick={handleNewTab}
              className="p-2 text-gray-500 hover:text-accent-light transition-colors"
            >
              <Plus size={14} />
            </button>
          </HelpTip>
          {activeProject?.workspaceTarget.type === 'ssh' && (
            <HelpTip label="SSH Shell" description="Open a new interactive SSH shell for this workspace">
              <button
                onClick={handleOpenInteractiveSSH}
                className="p-2 text-gray-500 hover:text-accent-light transition-colors"
              >
                <Server size={14} />
              </button>
            </HelpTip>
          )}
          {activeProject?.workspaceTarget.type === 'ssh' && (
            <div className="flex items-center">
              <HelpTip label="VNC Viewer" description="Open a remote desktop session via encrypted SSH tunnel">
                <button
                  onClick={() => void handleOpenVnc()}
                  className="p-2 text-gray-500 hover:text-accent-light transition-colors"
                >
                  <Monitor size={14} />
                </button>
              </HelpTip>
              <Tooltip
                className="!w-[22rem]"
                content={
                  <div className="space-y-2.5">
                    <div>
                      <p className="font-semibold text-gray-200 mb-1">VNC Server Setup</p>
                      <p className="text-gray-400">First, check if a VNC server is running on your VPS via the SSH tab:</p>
                      <pre className="mt-1 text-gray-200 font-mono text-[11px] bg-surface rounded px-2 py-1 whitespace-pre-wrap">ss -tlnp | grep 5901</pre>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">If nothing is returned, install TigerVNC:</p>
                      <pre className="text-gray-200 font-mono text-[11px] bg-surface rounded px-2 py-1 whitespace-pre-wrap">{'apt update && apt install -y \\\n  tigervnc-standalone-server\nvncpasswd'}</pre>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Install XFCE4 (lightweight, works great over VNC):</p>
                      <pre className="text-gray-200 font-mono text-[11px] bg-surface rounded px-2 py-1 whitespace-pre-wrap">{'apt install xfce4 xfce4-goodies -y'}</pre>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Configure VNC to launch the desktop:</p>
                      <pre className="text-gray-200 font-mono text-[11px] bg-surface rounded px-2 py-1 whitespace-pre-wrap">{'mkdir -p ~/.vnc\ncat > ~/.vnc/xstartup << \'EOF\'\n#!/bin/sh\nunset SESSION_MANAGER\nunset DBUS_SESSION_BUS_ADDRESS\nexec startxfce4\nEOF\nchmod +x ~/.vnc/xstartup'}</pre>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Start a session:</p>
                      <pre className="text-gray-200 font-mono text-[11px] bg-surface rounded px-2 py-1 whitespace-pre-wrap">{'vncserver :1 -geometry 1920x1080 -depth 24'}</pre>
                      <p className="text-gray-500 mt-1"><span className="text-gray-400">:1</span> = port 5901 &nbsp;·&nbsp; <span className="text-gray-400">:0</span> = port 5900</p>
                    </div>
                  </div>
                }
              >
                <span className="p-1 text-gray-600 hover:text-gray-400 cursor-help transition-colors">
                  <CircleHelp size={12} />
                </span>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Terminal tools */}
        <div className="flex items-center gap-0.5 mr-1">
          {activeProjectSessionId && (
            <>
              <HelpTip
                label={isSplit && splitDirection === 'vertical' ? 'Close Split' : 'Split Vertical'}
                description="Open a second terminal side by side"
                shortcut="⌘D"
              >
                <button
                  onClick={() => isSplit ? void handleCloseSplitPane(splitProjectSessionId!) : void handleSplit('vertical')}
                  className={`p-1.5 transition-colors ${
                    isSplit && splitDirection === 'vertical'
                      ? 'text-accent-light'
                      : 'text-gray-500 hover:text-accent-light'
                  }`}
                >
                  <Columns2 size={13} />
                </button>
              </HelpTip>
              <HelpTip
                label={isSplit && splitDirection === 'horizontal' ? 'Close Split' : 'Split Horizontal'}
                description="Stack terminals top and bottom"
                shortcut="⌘⇧D"
              >
                <button
                  onClick={() => isSplit ? void handleCloseSplitPane(splitProjectSessionId!) : void handleSplit('horizontal')}
                  className={`p-1.5 transition-colors ${
                    isSplit && splitDirection === 'horizontal'
                      ? 'text-accent-light'
                      : 'text-gray-500 hover:text-accent-light'
                  }`}
                >
                  <Rows2 size={13} />
                </button>
              </HelpTip>

              <div className="w-px h-4 bg-surface-border mx-0.5" />

              {/* Snapshot panel toggle */}
              <HelpTip label="Snapshots" description="Capture terminal output to compare later" shortcut="⌘⇧S">
                <button
                  onClick={() => setSnapshotPanelOpen(!snapshotPanelOpen)}
                  className={`p-1.5 transition-colors relative ${
                    snapshotPanelOpen
                      ? 'text-accent-light'
                      : 'text-gray-500 hover:text-accent-light'
                  }`}
                >
                  <Camera size={13} />
                  {snapshotCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-accent rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                      {snapshotCount > 9 ? '9+' : snapshotCount}
                    </span>
                  )}
                </button>
              </HelpTip>
            </>
          )}
          <HelpTip
            label="Hide Terminal"
            description="Collapse the terminal panel"
            shortcut={navigator.platform.toLowerCase().includes('mac') ? '⌘/' : 'Ctrl+/'}
          >
            <button
              onClick={closeTerminalPanel}
              className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ChevronDown size={14} />
            </button>
          </HelpTip>
        </div>
      </div>

      {/* Terminal content */}
      <div ref={containerRef} className="flex-1 relative">
        {sessions.map((session) => {
          const project = session.projectId
            ? projects.find((p) => p.id === session.projectId) ?? null
            : null
          const isVisible = session.id === activeProjectSessionId || (isSplit && session.id === splitProjectSessionId)
          const isPrimary = session.id === activeProjectSessionId
          const isSecondary = isSplit && session.id === splitProjectSessionId
          const isFocused = isSplit && (
            (isPrimary && focusedPane === 'primary') ||
            (isSecondary && focusedPane === 'secondary')
          )
          const workflowRun = runsBySession[session.id] ?? null

          return (
            <div
              key={session.id}
              style={getSessionStyle(session.id)}
              className="flex-col"
              onClick={() => {
                if (isPrimary && isSplit) setFocusedPane('primary')
                if (isSecondary) setFocusedPane('secondary')
              }}
            >
              {/* Focus indicator */}
              {isSplit && (isPrimary || isSecondary) && (
                <div
                  className="h-0.5 shrink-0 transition-colors duration-150"
                  style={{ backgroundColor: isFocused ? 'var(--accent)' : 'var(--surface-border)' }}
                />
              )}
              <div className="flex-1 min-h-0 flex">
                <div className="flex-1 min-w-0 relative">
                  {session.mode === 'vnc' && session.vncWsPort != null ? (
                    <VncPanel
                      sessionId={session.id}
                      wsPort={session.vncWsPort}
                      token={session.vncToken ?? ''}
                      vncPort={
                        activeProject?.workspaceTarget.type === 'ssh'
                          ? (activeProject.workspaceTarget.vncPort ?? 5901)
                          : 5901
                      }
                      storageKey={
                        activeProject?.workspaceTarget.type === 'ssh'
                          ? `${activeProject.workspaceTarget.host}:${activeProject.workspaceTarget.vncPort ?? 5901}`
                          : `vnc:${session.id}`
                      }
                      visible={isVisible}
                    />
                  ) : (
                    <XTermInstance
                      sessionId={session.id}
                      visible={isVisible}
                      projectName={project?.name ?? null}
                      projectWorkingDirectory={project ? resolveProjectWorkingDirectory(project) : null}
                      sessionMode={session.mode}
                    />
                  )}
                </div>
                {workflowRun && session.mode !== 'vnc' && (
                  <WorkflowRunPanel
                    sessionId={session.id}
                    className="w-[320px] max-w-[42%] shrink-0 border-l border-surface-border"
                  />
                )}
              </div>
            </div>
          )
        })}

        {/* Split divider — draggable */}
        {isSplit && (
          <div
            onMouseDown={handleDividerMouseDown}
            className={`absolute z-20 ${
              splitDirection === 'vertical'
                ? 'top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/50'
                : 'left-0 right-0 h-1 cursor-row-resize hover:bg-accent/50'
            } bg-surface-border transition-colors`}
            style={
              splitDirection === 'vertical'
                ? { left: `calc(${splitRatio}% - 2px)` }
                : { top: `calc(${splitRatio}% - 2px)` }
            }
          />
        )}

        {projectSessions.length === 0 && (
          <div className="h-full flex items-center justify-center text-gray-600 text-sm">
            No terminal sessions. Click + or execute a command.
          </div>
        )}

        {/* Snapshot panel overlay */}
        {snapshotPanelOpen && (
          <SnapshotPanel onClose={() => setSnapshotPanelOpen(false)} />
        )}
      </div>
    </div>
  )
}

/** xterm.js colour palettes — one per app theme */
const XTERM_THEMES: Record<Theme, Record<string, string>> = {
  void: {
    background: '#0e0f11', foreground: '#e2e8f0',
    cursor: '#06b6d4', cursorAccent: '#0e0f11', selectionBackground: '#06b6d440',
    black: '#1e2028', red: '#ef4444', green: '#22c55e', yellow: '#f59e0b',
    blue: '#3b82f6', magenta: '#06b6d4', cyan: '#22d3ee', white: '#e2e8f0',
    brightBlack: '#2c2e38', brightRed: '#f87171', brightGreen: '#4ade80',
    brightYellow: '#fbbf24', brightBlue: '#60a5fa',
    brightMagenta: '#67e8f9', brightCyan: '#a5f3fc', brightWhite: '#ffffff',
  },
  ember: {
    background: '#1e1610', foreground: '#e2e8f0',
    cursor: '#f59e0b', cursorAccent: '#1e1610', selectionBackground: '#f59e0b40',
    black: '#342518', red: '#ef4444', green: '#22c55e', yellow: '#f59e0b',
    blue: '#3b82f6', magenta: '#fbbf24', cyan: '#22d3ee', white: '#e2e8f0',
    brightBlack: '#4b3620', brightRed: '#f87171', brightGreen: '#4ade80',
    brightYellow: '#fcd34d', brightBlue: '#60a5fa',
    brightMagenta: '#fde68a', brightCyan: '#67e8f9', brightWhite: '#ffffff',
  },
  dusk: {
    background: '#252838', foreground: '#e2e8f0',
    cursor: '#818cf8', cursorAccent: '#252838', selectionBackground: '#818cf840',
    black: '#393e5a', red: '#ef4444', green: '#22c55e', yellow: '#f59e0b',
    blue: '#3b82f6', magenta: '#818cf8', cyan: '#a5b4fc', white: '#e2e8f0',
    brightBlack: '#50567a', brightRed: '#f87171', brightGreen: '#4ade80',
    brightYellow: '#fbbf24', brightBlue: '#60a5fa',
    brightMagenta: '#c7d2fe', brightCyan: '#ddd6fe', brightWhite: '#ffffff',
  },
  forest: {
    background: '#111713', foreground: '#e2e8f0',
    cursor: '#22c55e', cursorAccent: '#111713', selectionBackground: '#22c55e40',
    black: '#17201b', red: '#ef4444', green: '#22c55e', yellow: '#eab308',
    blue: '#38bdf8', magenta: '#34d399', cyan: '#2dd4bf', white: '#e2e8f0',
    brightBlack: '#38503f', brightRed: '#f87171', brightGreen: '#4ade80',
    brightYellow: '#fde047', brightBlue: '#7dd3fc',
    brightMagenta: '#6ee7b7', brightCyan: '#99f6e4', brightWhite: '#ffffff',
  },
  chalk: {
    background: '#faf9f7', foreground: '#1c1917',
    cursor: '#c2410c', cursorAccent: '#faf9f7', selectionBackground: '#c2410c30',
    black: '#44403c', red: '#b91c1c', green: '#15803d', yellow: '#b45309',
    blue: '#1d4ed8', magenta: '#c2410c', cyan: '#0e7490', white: '#78716c',
    brightBlack: '#a8a29e', brightRed: '#ef4444', brightGreen: '#22c55e',
    brightYellow: '#f59e0b', brightBlue: '#3b82f6',
    brightMagenta: '#ea580c', brightCyan: '#06b6d4', brightWhite: '#292524',
  },
  sand: {
    background: '#ede9e2', foreground: '#2c1e10',
    cursor: '#7c5730', cursorAccent: '#ede9e2', selectionBackground: '#7c573030',
    black: '#3d3228', red: '#b91c1c', green: '#15803d', yellow: '#92610a',
    blue: '#1d4ed8', magenta: '#7c5730', cyan: '#0e7490', white: '#6e6358',
    brightBlack: '#9c9488', brightRed: '#ef4444', brightGreen: '#22c55e',
    brightYellow: '#d97706', brightBlue: '#3b82f6',
    brightMagenta: '#a0714a', brightCyan: '#06b6d4', brightWhite: '#2c1e10',
  },
  stone: {
    background: '#dde0d8', foreground: '#1a2418',
    cursor: '#4a6741', cursorAccent: '#dde0d8', selectionBackground: '#4a674130',
    black: '#354030', red: '#b91c1c', green: '#15803d', yellow: '#92610a',
    blue: '#1d4ed8', magenta: '#4a6741', cyan: '#0e7490', white: '#5e6a58',
    brightBlack: '#8a9484', brightRed: '#ef4444', brightGreen: '#22c55e',
    brightYellow: '#d97706', brightBlue: '#3b82f6',
    brightMagenta: '#5f8654', brightCyan: '#06b6d4', brightWhite: '#1a2418',
  },
  mist: {
    background: '#f3f6f8', foreground: '#111827',
    cursor: '#0f766e', cursorAccent: '#f3f6f8', selectionBackground: '#0f766e30',
    black: '#475569', red: '#dc2626', green: '#15803d', yellow: '#b45309',
    blue: '#2563eb', magenta: '#0f766e', cyan: '#0891b2', white: '#64748b',
    brightBlack: '#94a3b8', brightRed: '#ef4444', brightGreen: '#22c55e',
    brightYellow: '#f59e0b', brightBlue: '#3b82f6',
    brightMagenta: '#14b8a6', brightCyan: '#06b6d4', brightWhite: '#1f2937',
  },
}

function stripTerminalControlSequences(content: string): string {
  return content
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/\x1b[()][A-Z0-9]/g, '')
    .replace(/\x1b[>=]/g, '')
}

function getSerializedTerminalText(serializeAddon: SerializeAddon | null): string {
  if (!serializeAddon) return ''

  const content = serializeAddon.serialize({
    excludeModes: true,
    excludeAltBuffer: true
  })

  return stripTerminalControlSequences(content)
}

/** Detect "command not found" patterns from various shells */
const CMD_NOT_FOUND_RE = /(?:command not found|not found|not recognized):\s*(\S+)|(\S+):\s*(?:command not found|not found)/
const SHELL_NAMES = new Set(['zsh', 'bash', 'sh', 'fish', 'dash', 'ksh', 'csh', 'tcsh', 'powershell', 'pwsh', 'cmd'])

/** Detect "usage:" lines that indicate a command needs arguments */
const USAGE_RE = /^usage:\s+(.+)/im

interface TerminalCommandBlock {
  id: string
  command: string
  cwd: string | null
  startedAt: string
  completedAt: string | null
  startLine: number | null
  endLine: number | null
}

type AIReviewScope = 'session' | 'last-command' | 'selection'

type PendingPasteTarget = 'editor' | 'terminal-direct' | 'terminal-queue'

interface PendingPaste {
  text: string
  preview: string
  reasons: string[]
  lineCount: number
  target: PendingPasteTarget
  selectionStart?: number
  selectionEnd?: number
}

function joinPath(basePath: string, child: string): string {
  if (!basePath || basePath === '/') return `/${child}`.replace(/\/+/g, '/')
  return `${basePath.replace(/\/+$/,'')}/${child}`.replace(/\/+/g, '/')
}

function normalizePath(pathValue: string): string {
  const isAbsolute = pathValue.startsWith('/')
  const segments = pathValue.split('/').filter(Boolean)
  const normalized: string[] = []

  for (const segment of segments) {
    if (segment === '.') continue
    if (segment === '..') {
      normalized.pop()
      continue
    }
    normalized.push(segment)
  }

  const joined = normalized.join('/')
  if (isAbsolute) return `/${joined}`.replace(/\/+$/g, '') || '/'
  return joined
}

function resolveDirectoryBase(
  shellCwd: string | null,
  fragment: string
): { basePath: string; prefix: string; displayBase: string } | null {
  if (!shellCwd) return null

  if (!fragment) {
    return { basePath: shellCwd, prefix: '', displayBase: '' }
  }

  const normalizedFragment = fragment.replace(/^~(?=\/|$)/, '')
  const endsWithSlash = normalizedFragment.endsWith('/')
  const lastSlash = normalizedFragment.lastIndexOf('/')
  const baseFragment = endsWithSlash
    ? normalizedFragment.slice(0, -1)
    : lastSlash >= 0
      ? normalizedFragment.slice(0, lastSlash)
      : ''
  const prefix = endsWithSlash ? '' : lastSlash >= 0 ? normalizedFragment.slice(lastSlash + 1) : normalizedFragment
  const basePath = baseFragment.startsWith('/')
    ? normalizePath(baseFragment || '/')
    : normalizePath(baseFragment ? joinPath(shellCwd, baseFragment) : shellCwd)

  return {
    basePath: basePath || '/',
    prefix,
    displayBase: baseFragment
  }
}

function XTermInstance({
  sessionId,
  visible,
  projectName,
  projectWorkingDirectory,
  sessionMode
}: {
  sessionId: string
  visible: boolean
  projectName: string | null
  projectWorkingDirectory: string | null
  sessionMode?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const searchAddonRef = useRef<SearchAddon | null>(null)
  const serializeAddonRef = useRef<SerializeAddon | null>(null)

  const [searchOpen, setSearchOpen] = useState(false)

  const activeTheme = useSettingsStore((s) => s.settings.theme)
  const terminalInputMode = useSettingsStore((s) => s.settings.terminalInputMode)
  const setTerminalInputMode = useSettingsStore((s) => s.setTerminalInputMode)
  const activeAIProvider = useSettingsStore((s) => s.settings.activeAIProvider)
  const safePasteMode = useSettingsStore((s) => s.settings.safePasteMode)
  const setSafePasteMode = useSettingsStore((s) => s.setSafePasteMode)
  const commands = useCommandStore((s) => s.commands)
  const addCommands = useCommandStore((s) => s.addCommands)
  const setActiveCommand = useCommandStore((s) => s.setActiveCommand)
  const activeProject = useProjectStore((s) => s.activeProject)
  const updateProjectInStore = useProjectStore((s) => s.updateProjectInStore)
  const addScriptToStore = useScriptStore((s) => s.addScriptToStore)
  const updateScriptInStore = useScriptStore((s) => s.updateScriptInStore)
  const setActiveScript = useScriptStore((s) => s.setActiveScript)
  const addSnippetToStore = useSnippetStore((s) => s.addSnippetToStore)
  const setActiveSnippet = useSnippetStore((s) => s.setActiveSnippet)
  const commandHistory = useTerminalStore((s) => s.history)
  const workflowRun = useWorkflowRunnerStore((s) => s.runsBySession[sessionId] ?? null)

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = XTERM_THEMES[activeTheme]
    }
  }, [activeTheme])

  const [notFoundCmd, setNotFoundCmd] = useState<string | null>(null)
  const [fixing, setFixing] = useState(false)
  const [fixResult, setFixResult] = useState<'success' | 'not-found' | null>(null)
  const outputBufferRef = useRef('')

  const [usageHint, setUsageHint] = useState<string | null>(null)

  const autoScrollRef = useRef(true)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [aiReview, setAIReview] = useState<string | null>(null)
  const [aiReviewMeta, setAIReviewMeta] = useState<{ providerLabel: string; model: string } | null>(null)
  const [aiReviewScope, setAIReviewScope] = useState<AIReviewScope | null>(null)
  const [aiReviewTargetLabel, setAIReviewTargetLabel] = useState<string | null>(null)
  const [aiLoading, setAILoading] = useState(false)
  const [aiError, setAIError] = useState<string | null>(null)
  const [aiFollowUps, setAIFollowUps] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [aiFollowUpInput, setAIFollowUpInput] = useState('')
  const [aiFollowUpLoading, setAIFollowUpLoading] = useState(false)
  const aiReviewTranscriptRef = useRef<string>('')
  const aiFollowUpScrollRef = useRef<HTMLDivElement>(null)
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false)
  const [promoteLoading, setPromoteLoading] = useState(false)
  const [promoteError, setPromoteError] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const shellStateRef = useRef<'init' | 'idle' | 'executing'>('init')
  const [shellState, setShellState] = useState<'init' | 'idle' | 'executing'>('init')
  const inputBufferRef = useRef('')
  const [inputPreview, setInputPreview] = useState('')
  const queueRef = useRef<string[]>([])
  const [queuedCommands, setQueuedCommands] = useState<string[]>([])
  const shellCwdRef = useRef<string | null>(projectWorkingDirectory)
  const bracketedPasteModeRef = useRef(false)
  const secureInputActiveRef = useRef(false)
  const commandBlockCounterRef = useRef(0)
  const editorInputRef = useRef<HTMLInputElement>(null)
  const editorSelectionRef = useRef({ start: 0, end: 0 })
  const pendingEditorSelectionRef = useRef<{ start: number; end: number } | null>(null)
  const historyDraftRef = useRef('')
  const pendingPasteRef = useRef<PendingPaste | null>(null)
  const [editorCommand, setEditorCommand] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [shellCwd, setShellCwd] = useState<string | null>(projectWorkingDirectory)
  const [promptCount, setPromptCount] = useState(0)
  const [activeCommandBlock, setActiveCommandBlock] = useState<TerminalCommandBlock | null>(null)
  const [lastCompletedCommandBlock, setLastCompletedCommandBlock] = useState<TerminalCommandBlock | null>(null)
  const [secureInputActive, setSecureInputActive] = useState(false)
  const [securePromptLabel, setSecurePromptLabel] = useState<string | null>(null)
  const [pendingPaste, setPendingPaste] = useState<PendingPaste | null>(null)
  const [bracketedPasteMode, setBracketedPasteMode] = useState(false)
  const [editorSelection, setEditorSelectionState] = useState({ start: 0, end: 0 })
  const [selectedEditorSuggestionIndex, setSelectedEditorSuggestionIndex] = useState(0)
  const [directorySuggestions, setDirectorySuggestions] = useState<ReturnType<typeof buildTerminalCompletionSuggestions>>([])
  const baseEditorSuggestions = useMemo(
    () => buildTerminalCompletionSuggestions(editorCommand, commandHistory, commands),
    [commands, commandHistory, editorCommand]
  )
  const editorSuggestions = useMemo(
    () => [...directorySuggestions, ...baseEditorSuggestions].slice(0, 5),
    [baseEditorSuggestions, directorySuggestions]
  )
  const handleTerminalInputModeChange = useCallback(async (nextMode: 'classic' | 'editor') => {
    setTerminalInputMode(nextMode)
    await window.electronAPI.updateSettings({ terminalInputMode: nextMode })
  }, [setTerminalInputMode])
  const activeEditorSuggestion = editorSuggestions[selectedEditorSuggestionIndex] ?? editorSuggestions[0] ?? null
  const activeEditorSuggestionSuffix = activeEditorSuggestion
    ? getTerminalCompletionSuffix(editorCommand, activeEditorSuggestion.value)
    : ''
  const showInlineEditorSuggestion = Boolean(activeEditorSuggestionSuffix) &&
    editorSelection.start === editorSelection.end &&
    editorSelection.end === editorCommand.length
  const promotableCommandString = lastCompletedCommandBlock?.command?.trim() || null
  const promotableExecutable = useMemo(
    () => promotableCommandString ? extractPrimaryExecutable(promotableCommandString) : null,
    [promotableCommandString]
  )
  const existingPromotedCommand = useMemo(
    () => promotableExecutable
      ? commands.find((command) => command.executable === promotableExecutable) ?? null
      : null,
    [commands, promotableExecutable]
  )

  const dismissBanner = useCallback(() => {
    setNotFoundCmd(null)
    setFixResult(null)
    setFixing(false)
    setUsageHint(null)
  }, [])

  const handleSearchWeb = useCallback((usage: string) => {
    const platform = navigator.platform.includes('Mac') ? 'macOS' : 'terminal'
    const query = encodeURIComponent(`how to use ${usage} ${platform}`)
    window.electronAPI.openExternal(`https://www.google.com/search?q=${query}`)
  }, [])

  const handleAskAI = useCallback((usage: string) => {
    const prompt = encodeURIComponent(`Explain how to use this terminal command and give me examples: ${usage}`)
    window.electronAPI.openExternal(`https://chatgpt.com/?hints=search&q=${prompt}`)
  }, [])

  const getTerminalBufferLines = useCallback((): string[] => {
    const terminal = termRef.current
    if (!terminal) return []

    const lines: string[] = []
    for (let lineIndex = 0; lineIndex < terminal.buffer.active.length; lineIndex += 1) {
      const line = terminal.buffer.active.getLine(lineIndex)
      if (!line) continue
      lines.push(line.translateToString(true))
    }
    return lines
  }, [])

  const getLastCommandTranscript = useCallback((): string | null => {
    if (!lastCompletedCommandBlock) return null
    return extractCommandTranscriptFromLines(
      getTerminalBufferLines(),
      lastCompletedCommandBlock.startLine,
      lastCompletedCommandBlock.endLine
    )
  }, [getTerminalBufferLines, lastCompletedCommandBlock])

  useEffect(() => {
    let cancelled = false

    const loadDirectorySuggestions = async (): Promise<void> => {
      const match = editorCommand.match(/^cd\s+(.*)$/)
      if (!match) {
        setDirectorySuggestions([])
        return
      }

      const fragment = match[1] ?? ''
      const resolved = resolveDirectoryBase(shellCwd, fragment)
      if (!resolved) {
        setDirectorySuggestions([])
        return
      }

      try {
        const entries = await window.electronAPI.listDirectory(resolved.basePath)
        if (cancelled) return

        const nextSuggestions = entries
          .filter((entry) => entry.isDirectory)
          .filter((entry) =>
            !resolved.prefix || entry.name.toLowerCase().startsWith(resolved.prefix.toLowerCase())
          )
          .slice(0, 5)
          .map((entry) => {
            const relativePath = resolved.displayBase
              ? `${resolved.displayBase.replace(/\/+$/,'')}/${entry.name}`
              : entry.name

            return {
              value: `cd ${relativePath}/`,
              source: 'directory' as const
            }
          })

        setDirectorySuggestions(nextSuggestions)
      } catch {
        if (!cancelled) setDirectorySuggestions([])
      }
    }

    void loadDirectorySuggestions()
    return () => {
      cancelled = true
    }
  }, [editorCommand, shellCwd])

  const runAIReview = useCallback(async (scope: AIReviewScope) => {
    const transcript = scope === 'last-command'
      ? getLastCommandTranscript()
      : getSerializedTerminalText(serializeAddonRef.current).trim()

    if (!transcript) {
      setAIError(
        scope === 'last-command'
          ? 'Run a command first so there is a completed command block to review.'
          : 'Run a command first so there is terminal output to review.'
      )
      setAIReview(null)
      setAIReviewMeta(null)
      setAIReviewScope(null)
      setAIReviewTargetLabel(null)
      return
    }

    setAILoading(true)
    setAIError(null)
    setAIFollowUps([])
    setAIFollowUpInput('')
    aiReviewTranscriptRef.current = transcript
    setAIReviewScope(scope)
    setAIReviewTargetLabel(
      scope === 'last-command'
        ? lastCompletedCommandBlock?.command ?? null
        : projectName ?? sessionId
    )
    try {
      const sessionInfo = await window.electronAPI.getSessionInfo(sessionId)
      const response = await window.electronAPI.runAIAction({
        action: 'output-review',
        source: 'terminal',
        focus: scope === 'last-command' ? 'command-block' : 'session',
        title: scope === 'last-command'
          ? `Last command: ${lastCompletedCommandBlock?.command ?? 'Unknown command'}`
          : projectName
            ? `Session ${sessionId} (${projectName})`
            : `Session ${sessionId}`,
        transcript,
        cwd: sessionInfo?.cwd ?? projectWorkingDirectory ?? undefined
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
      setAIReviewScope(null)
      setAIReviewTargetLabel(null)
    } finally {
      setAILoading(false)
    }
  }, [
    getLastCommandTranscript,
    lastCompletedCommandBlock,
    projectName,
    projectWorkingDirectory,
    sessionId
  ])

  const runAIReviewSelection = useCallback(async () => {
    const terminal = termRef.current
    if (!terminal) return
    const selectedText = terminal.getSelection()?.trim()
    if (!selectedText) {
      setAIError('Select some text in the terminal first.')
      setAIReview(null)
      setAIReviewMeta(null)
      setAIReviewScope(null)
      setAIReviewTargetLabel(null)
      return
    }

    setAILoading(true)
    setAIError(null)
    setAIFollowUps([])
    setAIFollowUpInput('')
    aiReviewTranscriptRef.current = selectedText
    setAIReviewScope('selection')
    setAIReviewTargetLabel('Selected text')
    try {
      const sessionInfo = await window.electronAPI.getSessionInfo(sessionId)
      const response = await window.electronAPI.runAIAction({
        action: 'output-review',
        source: 'terminal',
        focus: 'command-block',
        title: 'Selected terminal text',
        transcript: selectedText,
        cwd: sessionInfo?.cwd ?? projectWorkingDirectory ?? undefined
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
      setAIReviewScope(null)
      setAIReviewTargetLabel(null)
    } finally {
      setAILoading(false)
    }
  }, [projectWorkingDirectory, sessionId])

  const sendAIFollowUp = useCallback(async () => {
    const question = aiFollowUpInput.trim()
    if (!question || aiFollowUpLoading) return

    const currentFollowUps = [...aiFollowUps, { role: 'user' as const, content: question }]
    setAIFollowUps(currentFollowUps)
    setAIFollowUpInput('')
    setAIFollowUpLoading(true)

    const conversation = [
      aiReview ? `AI: ${aiReview}` : null,
      ...currentFollowUps.slice(0, -1).map((m) =>
        m.role === 'user' ? `User: ${m.content}` : `AI: ${m.content}`
      )
    ]
      .filter(Boolean)
      .join('\n\n')

    try {
      const response = await window.electronAPI.runAIAction({
        action: 'chat-followup',
        context: aiReviewTranscriptRef.current,
        conversation,
        question
      })
      setAIFollowUps((prev) => [...prev, { role: 'assistant', content: response.content }])
    } catch (error) {
      setAIFollowUps((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : String(error)}` }
      ])
    } finally {
      setAIFollowUpLoading(false)
      requestAnimationFrame(() => {
        aiFollowUpScrollRef.current?.scrollTo({ top: aiFollowUpScrollRef.current.scrollHeight, behavior: 'smooth' })
      })
    }
  }, [aiFollowUpInput, aiFollowUpLoading, aiFollowUps, aiReview])

  const handlePromoteCommand = useCallback(async (
    target: 'script' | 'snippet' | 'command',
    name: string
  ): Promise<void> => {
    const commandString = lastCompletedCommandBlock?.command?.trim()
    if (!commandString) {
      setPromoteError('Run a command first so there is something to promote.')
      return
    }

    setPromoteLoading(true)
    setPromoteError(null)

    try {
      if (target === 'script') {
        const script = await window.electronAPI.createScript(name, activeProject?.id ?? null)
        addScriptToStore(script)

        if (activeProject) {
          const updatedProject = await window.electronAPI.updateProject(activeProject.id, {
            enabledScriptIds: [...new Set([...activeProject.enabledScriptIds, script.id])]
          })
          if (updatedProject) {
            updateProjectInStore(updatedProject)
          }
        }

        const updatedScript = await window.electronAPI.addStepToScript(
          script.id,
          commandString,
          null,
          buildPromotionDefaultName(commandString, 'script')
        )

        const nextScript = updatedScript ?? script
        if (updatedScript) {
          updateScriptInStore(updatedScript)
        }

        setActiveScript(nextScript)
        setActiveSnippet(null)
        setActiveCommand(null)
      } else if (target === 'snippet') {
        const snippet = await window.electronAPI.createSnippet(
          name,
          commandString,
          activeProject?.id ?? null
        )
        addSnippetToStore(snippet)

        if (activeProject) {
          const updatedProject = await window.electronAPI.updateProject(activeProject.id, {
            enabledSnippetIds: [...new Set([...activeProject.enabledSnippetIds, snippet.id])]
          })
          if (updatedProject) {
            updateProjectInStore(updatedProject)
          }
        }

        setActiveSnippet(snippet)
        setActiveScript(null)
        setActiveCommand(null)
      } else {
        const executable = extractPrimaryExecutable(commandString)
        if (!executable) {
          throw new Error('Could not determine the executable for this command.')
        }

        let nextCommand = existingPromotedCommand
        if (!nextCommand) {
          await window.electronAPI.addManualCommand(executable, executable)
          nextCommand = buildPromotedCommandDefinition(executable, commandString)
          addCommands([nextCommand])
        }

        if (activeProject && !activeProject.enabledCategories.includes(nextCommand.category)) {
          const updatedProject = await window.electronAPI.updateProject(activeProject.id, {
            enabledCategories: [...new Set([...activeProject.enabledCategories, nextCommand.category])]
          })
          if (updatedProject) {
            updateProjectInStore(updatedProject)
          }
        }

        setActiveCommand(nextCommand)
        setActiveScript(null)
        setActiveSnippet(null)
      }

      setPromoteDialogOpen(false)
    } catch (error) {
      setPromoteError(error instanceof Error ? error.message : String(error))
    } finally {
      setPromoteLoading(false)
    }
  }, [
    activeProject,
    addCommands,
    addScriptToStore,
    addSnippetToStore,
    existingPromotedCommand,
    lastCompletedCommandBlock,
    setActiveCommand,
    setActiveScript,
    setActiveSnippet,
    updateProjectInStore,
    updateScriptInStore
  ])

  const getActiveBufferLine = useCallback((): number | null => {
    const terminal = termRef.current
    if (!terminal) return null
    return terminal.buffer.active.baseY + terminal.buffer.active.cursorY
  }, [])

  const completeActiveCommandBlock = useCallback((
    completedAt: string,
    cwd: string | null,
    endLine: number | null
  ) => {
    setActiveCommandBlock((current) => {
      if (!current) return null
      setLastCompletedCommandBlock({
        ...current,
        completedAt,
        cwd: cwd ?? current.cwd,
        endLine
      })
      return null
    })
  }, [])

  const resetEditorComposer = useCallback(() => {
    setEditorCommand('')
    setHistoryIndex(-1)
    historyDraftRef.current = ''
    const resetSelection = { start: 0, end: 0 }
    editorSelectionRef.current = resetSelection
    pendingEditorSelectionRef.current = null
    setEditorSelectionState(resetSelection)
  }, [])

  const setEditorSelection = useCallback((start: number, end: number = start) => {
    const nextSelection = { start, end }
    editorSelectionRef.current = nextSelection
    pendingEditorSelectionRef.current = nextSelection
    setEditorSelectionState(nextSelection)
  }, [])

  const syncEditorSelectionFromTarget = useCallback((target: HTMLInputElement) => {
    const nextSelection = {
      start: target.selectionStart ?? 0,
      end: target.selectionEnd ?? target.selectionStart ?? 0
    }
    editorSelectionRef.current = nextSelection
    setEditorSelectionState(nextSelection)
  }, [])

  const setPendingPasteState = useCallback((nextPaste: PendingPaste | null) => {
    pendingPasteRef.current = nextPaste
    setPendingPaste(nextPaste)
  }, [])

  const setSecureInputState = useCallback((active: boolean, label: string | null = null) => {
    secureInputActiveRef.current = active
    setSecureInputActive(active)
    setSecurePromptLabel(active ? label : null)
    if (active) {
      inputBufferRef.current = ''
      setInputPreview('')
    }
  }, [])

  const sendTerminalInputDirect = useCallback((data: string) => {
    window.electronAPI.writeToTerminal(sessionId, data)
    autoScrollRef.current = true
    setShowScrollDown(false)
    setUsageHint(null)
    setNotFoundCmd(null)

    if ((data.includes('\r') || data.includes('\n')) && shellStateRef.current === 'idle') {
      shellStateRef.current = 'executing'
      setShellState('executing')
    }
  }, [sessionId])

  const queueBufferedInput = useCallback((data: string) => {
    if (data.includes('\r') || data.includes('\n')) {
      const fullInput = inputBufferRef.current + data
      const lines = fullInput.split(/[\r\n]+/)
      for (const line of lines) {
        const cmd = line.trim()
        if (cmd) {
          queueRef.current.push(cmd)
          useTerminalStore.getState().addToHistory(cmd)
        }
      }
      setQueuedCommands([...queueRef.current])
      inputBufferRef.current = ''
      setInputPreview('')
      return
    }

    if (data === '\x7f') {
      if (inputBufferRef.current.length > 0) {
        inputBufferRef.current = inputBufferRef.current.slice(0, -1)
        setInputPreview(inputBufferRef.current)
        termRef.current?.write('\b \b')
      }
      return
    }

    if (data === '\t') {
      inputBufferRef.current += '  '
      setInputPreview(inputBufferRef.current)
      return
    }

    const printable = data.replace(/[\x00-\x1f\x7f]/g, '')
    if (printable) {
      inputBufferRef.current += printable
      setInputPreview(inputBufferRef.current)
    }
  }, [])

  const maybeStartPasteConfirmation = useCallback((
    text: string,
    target: PendingPasteTarget,
    selection?: { start: number; end: number }
  ): boolean => {
    const assessment = assessTerminalPaste(text)
    if (!assessment.needsConfirmation) {
      return false
    }

    setPendingPasteState({
      text,
      preview: assessment.preview,
      reasons: assessment.reasons,
      lineCount: assessment.lineCount,
      target,
      selectionStart: selection?.start,
      selectionEnd: selection?.end
    })
    return true
  }, [setPendingPasteState])

  const shouldInspectAsPaste = useCallback((data: string): boolean => {
    // A bare \r or \n is just the Enter key, not a paste.
    // Only flag as paste when newlines appear alongside other content.
    if (data.length > 1 && (data.includes('\r') || data.includes('\n'))) return true
    if (data.includes('\t') && data.length > 1) return true
    return data.length >= 6
  }, [])

  const handleEditorCommandChange = useCallback((next: string, selection?: { start: number; end: number }) => {
    setEditorCommand(next)
    if (selection) {
      editorSelectionRef.current = selection
      setEditorSelectionState(selection)
    }

    if (historyIndex !== -1) {
      setHistoryIndex(-1)
      historyDraftRef.current = next
    }
  }, [historyIndex])

  useEffect(() => {
    setSelectedEditorSuggestionIndex(0)
  }, [editorSuggestions])

  const cycleEditorSuggestion = useCallback((direction: 'previous' | 'next') => {
    if (editorSuggestions.length <= 1) return

    setSelectedEditorSuggestionIndex((current) => {
      const baseIndex = current >= 0 && current < editorSuggestions.length ? current : 0
      return direction === 'next'
        ? (baseIndex + 1) % editorSuggestions.length
        : (baseIndex - 1 + editorSuggestions.length) % editorSuggestions.length
    })
  }, [editorSuggestions.length])

  const navigateEditorHistory = useCallback((direction: 'older' | 'newer') => {
    if (commandHistory.length === 0) return

    if (direction === 'older') {
      const nextIndex = Math.min(commandHistory.length - 1, historyIndex + 1)
      if (historyIndex === -1) {
        historyDraftRef.current = editorCommand
      }
      setHistoryIndex(nextIndex)
      const nextCommand = commandHistory[nextIndex] ?? editorCommand
      setEditorCommand(nextCommand)
      setEditorSelection(nextCommand.length)
      return
    }

    if (historyIndex <= 0) {
      setHistoryIndex(-1)
      setEditorCommand(historyDraftRef.current)
      setEditorSelection(historyDraftRef.current.length)
      return
    }

    const nextIndex = historyIndex - 1
    setHistoryIndex(nextIndex)
    const nextCommand = commandHistory[nextIndex] ?? ''
    setEditorCommand(nextCommand)
    setEditorSelection(nextCommand.length)
  }, [commandHistory, editorCommand, historyIndex, setEditorSelection])

  const acceptEditorSuggestion = useCallback((value = activeEditorSuggestion?.value) => {
    if (!value) return
    setHistoryIndex(-1)
    historyDraftRef.current = value
    setEditorCommand(value)
    setEditorSelection(value.length)
    window.setTimeout(() => {
      editorInputRef.current?.focus()
    }, 0)
  }, [activeEditorSuggestion?.value, setEditorSelection])

  const submitEditorCommand = useCallback(() => {
    const nextCommand = editorCommand
    const historyCommand = nextCommand.trim()

    if (historyCommand) {
      useTerminalStore.getState().addToHistory(nextCommand)
    }

    autoScrollRef.current = true
    setShowScrollDown(false)
    setUsageHint(null)
    setNotFoundCmd(null)
    resetEditorComposer()

    window.electronAPI.writeToTerminal(sessionId, `${nextCommand}\r`)
    shellStateRef.current = 'executing'
    setShellState('executing')
  }, [editorCommand, resetEditorComposer, sessionId])

  const confirmPendingPaste = useCallback(() => {
    if (!pendingPaste) return

    if (pendingPaste.target === 'editor') {
      const start = pendingPaste.selectionStart ?? editorCommand.length
      const end = pendingPaste.selectionEnd ?? editorCommand.length
      const nextCommand = `${editorCommand.slice(0, start)}${pendingPaste.text}${editorCommand.slice(end)}`
      const nextCursor = start + pendingPaste.text.length
      handleEditorCommandChange(nextCommand, { start: nextCursor, end: nextCursor })
      pendingEditorSelectionRef.current = { start: nextCursor, end: nextCursor }
      window.setTimeout(() => {
        editorInputRef.current?.focus()
      }, 0)
    } else if (pendingPaste.target === 'terminal-queue') {
      queueBufferedInput(pendingPaste.text)
    } else {
      const nextText = (
        pendingPaste.lineCount > 1 &&
        bracketedPasteModeRef.current &&
        !secureInputActiveRef.current
      )
        ? wrapBracketedPaste(pendingPaste.text)
        : pendingPaste.text

      sendTerminalInputDirect(nextText)
    }

    setPendingPasteState(null)
  }, [
    bracketedPasteModeRef,
    editorCommand,
    handleEditorCommandChange,
    pendingPaste,
    queueBufferedInput,
    sendTerminalInputDirect,
    setPendingPasteState
  ])

  const cancelPendingPaste = useCallback(() => {
    setPendingPasteState(null)
    if (terminalInputMode === 'editor' && shellStateRef.current === 'idle') {
      window.setTimeout(() => {
        editorInputRef.current?.focus()
      }, 0)
      return
    }
    termRef.current?.focus()
  }, [setPendingPasteState, terminalInputMode])

  const disableSafePasteAndConfirm = useCallback(async () => {
    setSafePasteMode(false)
    await window.electronAPI.updateSettings({ safePasteMode: false })
    confirmPendingPaste()
  }, [confirmPendingPaste, setSafePasteMode])

  const handleEditorKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    const selectionStart = event.currentTarget.selectionStart ?? 0
    const selectionEnd = event.currentTarget.selectionEnd ?? selectionStart

    if (editorSuggestions.length > 1) {
      if (event.shiftKey && event.key === 'Tab') {
        event.preventDefault()
        cycleEditorSuggestion('previous')
        return
      }

      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault()
        cycleEditorSuggestion(event.key === 'ArrowUp' ? 'previous' : 'next')
        return
      }

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
        const normalizedKey = event.key.toLowerCase()
        if (normalizedKey === 'p' || normalizedKey === 'n') {
          event.preventDefault()
          cycleEditorSuggestion(normalizedKey === 'p' ? 'previous' : 'next')
          return
        }
      }
    }

    if ((event.key === 'Tab' || event.key === 'ArrowRight') && activeEditorSuggestion) {
      const isArrowAccept =
        event.key === 'ArrowRight' &&
        selectionStart === selectionEnd &&
        selectionStart === editorCommand.length

      if (event.key === 'Tab' || isArrowAccept) {
        event.preventDefault()
        acceptEditorSuggestion(activeEditorSuggestion.value)
        return
      }
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      submitEditorCommand()
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      navigateEditorHistory('older')
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      navigateEditorHistory('newer')
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      resetEditorComposer()
    }
  }, [
    acceptEditorSuggestion,
    activeEditorSuggestion,
    cycleEditorSuggestion,
    editorCommand.length,
    editorSuggestions.length,
    navigateEditorHistory,
    resetEditorComposer,
    submitEditorCommand
  ])

  const handleEditorPaste = useCallback((event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text')
    if (!text) return

    if (!maybeStartPasteConfirmation(text, 'editor', {
      start: event.currentTarget.selectionStart ?? editorCommand.length,
      end: event.currentTarget.selectionEnd ?? editorCommand.length
    })) {
      return
    }

    event.preventDefault()
  }, [editorCommand.length, maybeStartPasteConfirmation])

  const processQueue = useCallback(() => {
    if (queueRef.current.length === 0) return
    const next = queueRef.current.shift()!
    setQueuedCommands([...queueRef.current])

    autoScrollRef.current = true
    setShowScrollDown(false)

    window.electronAPI.writeToTerminal(sessionId, next + '\r')
    shellStateRef.current = 'executing'
    setShellState('executing')
  }, [sessionId])

  const removeFromQueue = useCallback((index: number) => {
    queueRef.current.splice(index, 1)
    setQueuedCommands([...queueRef.current])
  }, [])

  const clearQueue = useCallback(() => {
    queueRef.current = []
    setQueuedCommands([])
    inputBufferRef.current = ''
    setInputPreview('')
  }, [])

  const handleShellEvent = useCallback((event: ShellIntegrationEvent) => {
    if (event.type === 'command-start') {
      if (shellStateRef.current === 'executing') {
        return
      }

      setSecureInputState(false)
      setPendingPasteState(null)
      const startLine = getActiveBufferLine()
      const nextBlock: TerminalCommandBlock = {
        id: `${sessionId}-cmd-${++commandBlockCounterRef.current}`,
        command: event.command,
        cwd: shellCwdRef.current ?? projectWorkingDirectory,
        startedAt: event.receivedAt,
        completedAt: null,
        startLine,
        endLine: null
      }

      setActiveCommandBlock((current) => {
        if (current) {
          setLastCompletedCommandBlock({
            ...current,
            completedAt: event.receivedAt,
            endLine: startLine
          })
        }
        return nextBlock
      })

      shellStateRef.current = 'executing'
      setShellState('executing')
      setUsageHint(null)
      setNotFoundCmd(null)
      return
    }

    const nextCwd = event.cwd ?? shellCwdRef.current ?? projectWorkingDirectory
    const promptLine = getActiveBufferLine()
    setSecureInputState(false)
    setPendingPasteState(null)
    shellCwdRef.current = nextCwd
    setShellCwd(nextCwd)
    setPromptCount((count) => count + 1)
    completeActiveCommandBlock(event.receivedAt, nextCwd, promptLine)
    shellStateRef.current = 'idle'
    setShellState('idle')
    setTimeout(() => processQueue(), 50)
  }, [
    completeActiveCommandBlock,
    getActiveBufferLine,
    processQueue,
    projectWorkingDirectory
  ])

  const safePasteModeRef = useRef(safePasteMode)
  const sendTerminalInputDirectRef = useRef(sendTerminalInputDirect)
  const queueBufferedInputRef = useRef(queueBufferedInput)
  const maybeStartPasteConfirmationRef = useRef(maybeStartPasteConfirmation)
  const shouldInspectAsPasteRef = useRef(shouldInspectAsPaste)
  const handleShellEventRef = useRef(handleShellEvent)

  useEffect(() => {
    safePasteModeRef.current = safePasteMode
  }, [safePasteMode])

  useEffect(() => {
    sendTerminalInputDirectRef.current = sendTerminalInputDirect
  }, [sendTerminalInputDirect])

  useEffect(() => {
    queueBufferedInputRef.current = queueBufferedInput
  }, [queueBufferedInput])

  useEffect(() => {
    maybeStartPasteConfirmationRef.current = maybeStartPasteConfirmation
  }, [maybeStartPasteConfirmation])

  useEffect(() => {
    shouldInspectAsPasteRef.current = shouldInspectAsPaste
  }, [shouldInspectAsPaste])

  useEffect(() => {
    handleShellEventRef.current = handleShellEvent
  }, [handleShellEvent])

  useEffect(() => {
    setAIReview(null)
    setAIReviewMeta(null)
    setAIReviewScope(null)
    setAIReviewTargetLabel(null)
    setAIError(null)
    setAILoading(false)
    resetEditorComposer()
    shellCwdRef.current = projectWorkingDirectory
    commandBlockCounterRef.current = 0
    setShellCwd(projectWorkingDirectory)
    setPromptCount(0)
    setActiveCommandBlock(null)
    setLastCompletedCommandBlock(null)
    bracketedPasteModeRef.current = false
    setBracketedPasteMode(false)
    setSecureInputState(false)
    setPendingPasteState(null)
  }, [projectWorkingDirectory, resetEditorComposer, sessionId])

  useEffect(() => {
    if (shellCwdRef.current) return
    shellCwdRef.current = projectWorkingDirectory
    setShellCwd(projectWorkingDirectory)
  }, [projectWorkingDirectory])

  useEffect(() => {
    if (!termRef.current) return
    termRef.current.options.cursorStyle =
      terminalInputMode === 'editor' && shellState === 'idle' ? 'bar' : 'block'
  }, [shellState, terminalInputMode])

  useEffect(() => {
    if (!visible || terminalInputMode !== 'editor' || shellState !== 'idle') return

    const focusTimer = window.setTimeout(() => {
      editorInputRef.current?.focus()
    }, 0)

    return () => window.clearTimeout(focusTimer)
  }, [shellState, terminalInputMode, visible])

  useLayoutEffect(() => {
    const pendingSelection = pendingEditorSelectionRef.current
    const input = editorInputRef.current
    if (!pendingSelection || !input) return

    input.setSelectionRange(pendingSelection.start, pendingSelection.end)
    pendingEditorSelectionRef.current = null
  }, [editorCommand])

  const handleFixPath = useCallback(async (cmd: string) => {
    setFixing(true)
    setFixResult(null)
    try {
      const foundPath = await window.electronAPI.findCommand(cmd)
      if (!foundPath) {
        setFixResult('not-found')
        return
      }
      const dir = foundPath.substring(0, foundPath.lastIndexOf('/'))
      const result = await window.electronAPI.fixPath(dir)
      if (result.success) {
        setFixResult('success')
        if (termRef.current) {
          termRef.current.write(
            `\r\n\x1b[32m✓ Added ${dir} to PATH in ${result.configFile}\x1b[0m\r\n` +
            `\x1b[33m  Run \x1b[1msource ${result.configFile}\x1b[0m\x1b[33m or open a new terminal tab to apply.\x1b[0m\r\n`
          )
        }
      } else {
        setFixResult('not-found')
      }
    } catch {
      setFixResult('not-found')
    } finally {
      setFixing(false)
    }
  }, [])

  const handleResize = useCallback(() => {
    if (fitRef.current && termRef.current && visible) {
      try {
        fitRef.current.fit()
        const { cols, rows } = termRef.current
        window.electronAPI.resizeTerminal(sessionId, cols, rows)
      } catch {
        // ignore fit errors during mount/unmount
      }
    }
  }, [sessionId, visible])

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      scrollback: 10000,
      fastScrollModifier: 'alt',
      theme: XTERM_THEMES[activeTheme],
      allowProposedApi: true
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon((_event, uri) => {
      window.electronAPI.openExternal(uri)
    })
    const searchAddon = new SearchAddon()
    const serializeAddon = new SerializeAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.loadAddon(searchAddon)
    term.loadAddon(serializeAddon)
    term.open(containerRef.current)

    // File path link provider — makes absolute paths clickable to open in file viewer
    const FILE_PATH_RE = /(?:^|\s)(\/[\w./@~-]+(?:\/[\w.@~-]+)*\.\w{1,10})(?=\s|:|,|$)/g
    const TEXT_FILE_EXTS = new Set([
      'ts','tsx','js','jsx','mjs','cjs','json','yaml','yml','toml','xml','html','htm','css','scss','less',
      'md','mdx','txt','log','env','sh','bash','zsh','fish','py','rb','rs','go','java','kt','c','cpp','h',
      'hpp','swift','m','mm','sql','graphql','gql','proto','csv','ini','cfg','conf','lock','gitignore',
      'dockerignore','dockerfile','makefile','cmake','gradle','properties','plist','svg','vue','svelte'
    ])
    term.registerLinkProvider({
      provideLinks(bufferLineNumber, callback) {
        const line = term.buffer.active.getLine(bufferLineNumber)
        if (!line) { callback(undefined); return }
        const lineText = line.translateToString()
        const links: import('@xterm/xterm').ILink[] = []
        let match: RegExpExecArray | null
        FILE_PATH_RE.lastIndex = 0
        while ((match = FILE_PATH_RE.exec(lineText)) !== null) {
          const fullMatch = match[1]
          const ext = fullMatch.split('.').pop()?.toLowerCase() ?? ''
          if (!TEXT_FILE_EXTS.has(ext)) continue
          const startCol = lineText.indexOf(fullMatch, match.index) + 1
          links.push({
            range: {
              start: { x: startCol, y: bufferLineNumber },
              end: { x: startCol + fullMatch.length, y: bufferLineNumber }
            },
            text: fullMatch,
            decorations: { pointerCursor: true, underline: true },
            activate: (_event, text) => {
              const resolvedPath = text.startsWith('~/')
                ? text.replace('~/', `${process.env.HOME ?? '/Users'}`)
                : text
              void (async () => {
                const result = await window.electronAPI.readApprovedFileContent(resolvedPath)
                if ('error' in result || 'tooLarge' in result) {
                  window.electronAPI.revealInExplorer(resolvedPath)
                } else {
                  const name = resolvedPath.split('/').pop() ?? resolvedPath
                  useFileStore.getState().setActiveFile({
                    path: resolvedPath,
                    name,
                    content: result.content,
                    truncated: result.truncated ?? false,
                    tooLarge: false,
                    size: result.size,
                    modifiedAt: result.modifiedAt,
                    readAccess: 'scoped',
                    source: 'terminal-link'
                  })
                  useFileStore.getState().setFileViewerVisible(true)
                }
              })()
            }
          })
        }
        callback(links.length > 0 ? links : undefined)
      }
    })

    termRef.current = term
    fitRef.current = fitAddon
    searchAddonRef.current = searchAddon
    serializeAddonRef.current = serializeAddon

    term.onData((data) => {
      const state = shellStateRef.current

      if (pendingPasteRef.current) {
        return
      }

      if (data === '\x03' || data === '\x04' || data === '\x1a' || data === '\x1c') {
        window.electronAPI.writeToTerminal(sessionId, data)
        inputBufferRef.current = ''
        setInputPreview('')
        autoScrollRef.current = true
        setShowScrollDown(false)
        return
      }

        if (shouldInspectAsPasteRef.current(data)) {
          const pasteTarget: PendingPasteTarget =
            secureInputActiveRef.current || state !== 'executing'
              ? 'terminal-direct'
              : 'terminal-queue'

          if (safePasteModeRef.current && maybeStartPasteConfirmationRef.current(data, pasteTarget)) {
            return
          }
        }

        if (secureInputActiveRef.current && state === 'executing') {
          sendTerminalInputDirectRef.current(data)
          inputBufferRef.current = ''
          setInputPreview('')
          return
        }

        if (state !== 'executing') {
          sendTerminalInputDirectRef.current(data)
          return
        }

        // When terminal input mode is 'plain', send keystrokes directly to the
        // running process so interactive prompts (e.g. npx "Ok to proceed?") work.
        // Command queuing only applies in 'editor' mode.
        if (useSettingsStore.getState().settings.terminalInputMode !== 'editor') {
          sendTerminalInputDirectRef.current(data)
          return
        }

        queueBufferedInputRef.current(data)
    })

    let scrollTimer: ReturnType<typeof setTimeout> | null = null
    term.onScroll(() => {
      const buf = term.buffer.active
      const atBottom = buf.viewportY >= buf.baseY
      autoScrollRef.current = atBottom
      if (scrollTimer) clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => setShowScrollDown(!atBottom), 150)
    })

    const dataHandler = (sid: string, data: string): void => {
      if (sid === sessionId) {
        const nextBracketedPasteMode = getBracketedPasteModeChange(data)
        if (nextBracketedPasteMode !== null) {
          bracketedPasteModeRef.current = nextBracketedPasteMode
          setBracketedPasteMode(nextBracketedPasteMode)
        }

        const wasScrolledUp = !autoScrollRef.current
        const savedViewportY = wasScrolledUp ? term.buffer.active.viewportY : 0

        term.write(data, () => {
          if (wasScrolledUp) {
            const delta = savedViewportY - term.buffer.active.baseY
            if (delta < 0) {
              term.scrollLines(delta)
            }
          }
        })

        const clean = data.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
        outputBufferRef.current += clean

        if (outputBufferRef.current.length > 500) {
          outputBufferRef.current = outputBufferRef.current.slice(-500)
        }

        if (shellStateRef.current === 'executing') {
          const sensitivePrompt = detectSensitivePromptLabel(outputBufferRef.current.slice(-240))
          if (sensitivePrompt) {
            setSecureInputState(true, sensitivePrompt)
          }
        }

        const match = outputBufferRef.current.match(CMD_NOT_FOUND_RE)
        if (match) {
          const cmd = (match[1] || match[2] || '').trim()
          if (cmd && cmd.length > 1 && cmd.length < 50 && !SHELL_NAMES.has(cmd.toLowerCase())) {
            setNotFoundCmd(cmd)
            setUsageHint(null)
            setFixResult(null)
            setFixing(false)
          }
          outputBufferRef.current = ''
        }

        if (!match) {
          const usageMatch = outputBufferRef.current.match(USAGE_RE)
          if (usageMatch) {
            const hint = usageMatch[1].trim()
            if (hint.length > 3 && hint.length < 200) {
              setUsageHint(hint)
              setNotFoundCmd(null)
            }
            outputBufferRef.current = ''
          }
        }
      }
    }
    const unsubData = window.electronAPI.onTerminalData(dataHandler)

    const unsubExit = window.electronAPI.onTerminalExit((sid) => {
      if (sid !== sessionId) return
    })

    const unsubShellEvent = window.electronAPI.onShellEvent((sid, event) => {
      if (sid !== sessionId) return
      handleShellEventRef.current(event)
    })

    setTimeout(() => {
      try {
        fitAddon.fit()
        window.electronAPI.resizeTerminal(sessionId, term.cols, term.rows)
      } catch {
        // ignore
      }
    }, 50)

    return () => {
      unsubData()
      unsubExit()
      unsubShellEvent()
      term.dispose()
    }
  }, [sessionId])

  useEffect(() => {
    if (!visible) return

    handleResize()
    if (termRef.current) {
      try {
        termRef.current.refresh(0, Math.max(termRef.current.rows - 1, 0))
      } catch {
        // ignore refresh errors during visibility changes
      }
    }
    const observer = new ResizeObserver(handleResize)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    // Re-render terminal when the window regains visibility (e.g. after being
    // minimised or in the background for a while — the xterm canvas can go stale)
    const onVisibilityChange = (): void => {
      if (document.hidden || !termRef.current) return
      setTimeout(() => {
        if (!termRef.current) return
        try {
          fitRef.current?.fit()
          termRef.current.refresh(0, termRef.current.rows - 1)
        } catch {
          // ignore
        }
      }, 100)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [visible, handleResize])

  // Cmd+F to open search, Cmd+S to capture snapshot
  useEffect(() => {
    if (!visible) return

    const handler = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setSearchOpen(true)
      }
      // Cmd+Shift+S — capture snapshot
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        captureSnapshot()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible])

  const captureSnapshot = useCallback(() => {
    if (!serializeAddonRef.current || !termRef.current) return

    const clean = getSerializedTerminalText(serializeAddonRef.current)

    const lines = clean.split('\n')
    const lineCount = lines.length

    const snap: OutputSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      label: `Snapshot ${new Date().toLocaleTimeString()}`,
      content: clean,
      lineCount,
      capturedAt: new Date().toISOString(),
      projectId: activeProject?.id ?? null
    }

    useSnapshotStore.getState().addSnapshot(snap)
  }, [sessionId, activeProject?.id])

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ display: visible ? 'flex' : 'none' }}
    >
      {/* Command not found banner */}
      {notFoundCmd && (
        <div className="flex items-center gap-3 px-3 py-2 bg-caution/10 border-b border-caution/20 shrink-0">
          <HelpTip
            label="Command Not Found"
            description={`Your shell could not find "${notFoundCmd}" in any directory listed in your PATH environment variable. This usually means it is not installed, or its install location is not in your PATH.`}
          >
            <span className="text-xs text-caution cursor-default">
              <span className="font-mono font-bold">{notFoundCmd}</span> not found in PATH
            </span>
          </HelpTip>

          {fixResult === 'success' ? (
            <span className="inline-flex items-center gap-1 text-xs text-safe">
              <Check size={12} />
              Added to PATH — open a new tab to apply
            </span>
          ) : fixResult === 'not-found' ? (
            <span className="inline-flex items-center gap-1 text-xs text-destructive">
              <XCircle size={12} />
              Could not locate {notFoundCmd} on this system
            </span>
          ) : (
            <button
              onClick={() => handleFixPath(notFoundCmd)}
              disabled={fixing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-caution/30 bg-caution/10 text-caution text-xs font-medium hover:bg-caution/20 transition-colors disabled:opacity-50"
            >
              {fixing ? (
                <>
                  <Loader2 size={11} className="animate-spin" />
                  Finding...
                </>
              ) : (
                <>
                  <Wrench size={11} />
                  Fix PATH
                </>
              )}
            </button>
          )}

          <button
            onClick={dismissBanner}
            className="ml-auto text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Usage help banner */}
      {usageHint && !notFoundCmd && (
        <div className="flex items-center gap-3 px-3 py-2 bg-blue-500/10 border-b border-blue-500/20 shrink-0">
          <span className="text-xs text-blue-400 truncate">
            <span className="font-medium">Usage:</span>{' '}
            <span className="font-mono">{usageHint}</span>
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => handleSearchWeb(usageHint)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors"
            >
              <Search size={11} />
              Search Web
            </button>
            <button
              onClick={() => handleAskAI(usageHint)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
            >
              <MessageCircle size={11} />
              Ask ChatGPT
            </button>
          </div>

          <button
            onClick={dismissBanner}
            className="ml-auto text-gray-500 hover:text-gray-300 transition-colors shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Terminal */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <div
            ref={containerRef}
            className="absolute inset-0 px-3 pt-1 pb-0"
            onContextMenu={(e) => {
              const terminal = termRef.current
              const hasSelection = terminal?.getSelection()?.trim()
              if (hasSelection) {
                e.preventDefault()
                setContextMenu({ x: e.clientX, y: e.clientY })
              }
            }}
          />

          {/* Search bar overlay */}
          {searchOpen && (
            <TerminalSearchBar
              searchAddon={searchAddonRef.current}
              onClose={() => setSearchOpen(false)}
            />
          )}

          {/* Scroll-to-bottom indicator */}
          {showScrollDown && (
            <button
              onClick={() => {
                termRef.current?.scrollToBottom()
                autoScrollRef.current = true
                setShowScrollDown(false)
              }}
              className="absolute bottom-3 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/90 text-white text-xs font-medium shadow-lg hover:bg-accent transition-all backdrop-blur-sm z-10"
            >
              <ArrowDown size={12} />
              Latest output
            </button>
          )}

          {/* Right-click context menu for selected text */}
          {contextMenu && createPortal(
            <>
              <div
                className="fixed inset-0 z-[250]"
                onClick={() => setContextMenu(null)}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu(null) }}
              />
              <div
                className="fixed z-[251] rounded-lg border border-surface-border bg-surface-light shadow-xl shadow-black/40 py-1 min-w-[200px]"
                style={{ left: contextMenu.x, top: contextMenu.y }}
              >
                <button
                  onClick={() => {
                    setContextMenu(null)
                    void runAIReviewSelection()
                  }}
                  disabled={aiLoading}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-200 hover:bg-surface-lighter transition-colors disabled:opacity-50"
                >
                  <Sparkles size={14} className="text-accent-light" />
                  AI Review Selection
                </button>
                <button
                  onClick={async () => {
                    const text = termRef.current?.getSelection() ?? ''
                    await window.electronAPI.writeClipboard(text)
                    setContextMenu(null)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-200 hover:bg-surface-lighter transition-colors"
                >
                  <X size={14} className="text-gray-400" style={{ display: 'none' }} />
                  <span className="w-[14px] text-center text-gray-400 text-xs">⌘C</span>
                  Copy
                </button>
              </div>
            </>,
            document.body
          )}
        </div>

        <div className="shrink-0 px-2 pb-2 space-y-2">
          {(aiReview || aiError || aiLoading) && createPortal(
            <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center overflow-y-auto p-6">
              <div className="w-full max-w-3xl max-h-[calc(100vh-3rem)] rounded-2xl border border-surface-border bg-surface-light shadow-2xl shadow-black/50 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-surface-border shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Sparkles size={18} className={aiError ? 'text-destructive' : 'text-accent-light'} />
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-200">
                        {aiReviewScope === 'last-command' ? 'AI Review · Last Command' : aiReviewScope === 'selection' ? 'AI Review · Selection' : 'AI Review · Session'}
                      </h3>
                      {aiReviewTargetLabel && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{aiReviewTargetLabel}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (aiLoading || aiFollowUpLoading) return
                      setAIReview(null)
                      setAIReviewMeta(null)
                      setAIReviewScope(null)
                      setAIReviewTargetLabel(null)
                      setAIError(null)
                      setAILoading(false)
                      setAIFollowUps([])
                      setAIFollowUpInput('')
                    }}
                    disabled={aiLoading || aiFollowUpLoading}
                    className="rounded-lg p-2 text-gray-400 hover:text-gray-200 hover:bg-surface transition-colors disabled:opacity-50"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div ref={aiFollowUpScrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  {aiLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
                      <Loader2 size={16} className="animate-spin" />
                      Reviewing terminal output...
                    </div>
                  )}
                  {aiError && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4">
                      <div className="text-sm text-destructive whitespace-pre-wrap">{aiError}</div>
                    </div>
                  )}
                  {aiReview && <div className="text-sm text-gray-200 whitespace-pre-wrap leading-6">{aiReview}</div>}
                  {aiFollowUps.map((msg, i) =>
                    msg.role === 'user' ? (
                      <div key={i} className="flex items-start gap-3 justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-accent/15 border border-accent/20 px-4 py-2.5">
                          <div className="text-sm text-gray-200 whitespace-pre-wrap leading-6">{msg.content}</div>
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex items-start gap-3">
                        <Sparkles size={16} className="text-accent-light shrink-0 mt-1" />
                        <div className="text-sm text-gray-200 whitespace-pre-wrap leading-6 flex-1">{msg.content}</div>
                      </div>
                    )
                  )}
                  {aiFollowUpLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Loader2 size={14} className="animate-spin" />
                      Thinking...
                    </div>
                  )}
                </div>
                <div className="border-t border-surface-border shrink-0">
                  {aiReview && !aiLoading && (
                    <div className="px-6 py-3 flex items-center gap-3">
                      <input
                        type="text"
                        value={aiFollowUpInput}
                        onChange={(e) => setAIFollowUpInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            void sendAIFollowUp()
                          }
                        }}
                        placeholder="Ask a follow-up question..."
                        disabled={aiFollowUpLoading}
                        className="flex-1 bg-surface rounded-lg border border-surface-border px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent/40 disabled:opacity-50"
                      />
                      <button
                        onClick={() => void sendAIFollowUp()}
                        disabled={aiFollowUpLoading || !aiFollowUpInput.trim()}
                        className="rounded-lg p-2 text-accent-light hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <SendHorizontal size={16} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-surface-border">
                    {aiReviewMeta ? (
                      <span className="text-[11px] text-gray-500">
                        {aiReviewMeta.providerLabel} · {aiReviewMeta.model}
                      </span>
                    ) : (
                      <span />
                    )}
                    <button
                      onClick={() => {
                        setAIReview(null)
                        setAIReviewMeta(null)
                        setAIReviewScope(null)
                        setAIReviewTargetLabel(null)
                        setAIError(null)
                        setAILoading(false)
                        setAIFollowUps([])
                        setAIFollowUpInput('')
                      }}
                      disabled={aiLoading || aiFollowUpLoading}
                      className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {secureInputActive && (
            <div className="rounded-lg bg-caution/10 px-3 py-3 shadow-xl">
              <div className="flex items-center gap-2">
                <ShieldAlert size={14} className="text-caution shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-caution">
                    Secure Input Active
                  </div>
                  <div className="text-sm text-gray-200">
                    {securePromptLabel ?? 'Sensitive prompt detected'}.
                    {' '}Keystrokes are sent directly to the shell and are not previewed or queued.
                  </div>
                </div>
              </div>
            </div>
          )}

          {pendingPaste && (
            <div className="rounded-lg bg-surface-light px-3 py-3 shadow-xl">
              <div className="flex items-center gap-2">
                <ShieldAlert size={14} className="text-caution shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-caution">
                  Confirm Paste
                </span>
                <span className="text-[11px] text-gray-500 ml-auto">
                  {pendingPaste.target === 'editor'
                    ? 'Editor draft'
                    : pendingPaste.target === 'terminal-queue'
                      ? 'Queued for later'
                      : 'Send to shell'}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-300">
                This paste was flagged because it includes {pendingPaste.reasons.join(', ')}.
              </div>
              {pendingPaste.target !== 'editor' && pendingPaste.lineCount > 1 && (
                <div className="mt-1 text-[11px] text-gray-500">
                  {bracketedPasteMode && !secureInputActive
                    ? 'This shell has bracketed paste enabled, so the confirmed paste will be wrapped safely.'
                    : 'This shell is not advertising bracketed paste, so the confirmed content will be sent as plain input.'}
                </div>
              )}
              <div className="mt-2 rounded-lg bg-surface px-3 py-2 font-mono text-xs text-gray-300 whitespace-pre-wrap break-words max-h-48 overflow-auto">
                {pendingPaste.preview}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[11px] text-gray-500">
                  {pendingPaste.lineCount > 1
                    ? `${pendingPaste.lineCount} lines will be pasted.`
                    : 'Review the content before sending it to the shell.'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={cancelPendingPaste}
                    className="rounded-md bg-surface px-2.5 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmPendingPaste}
                    className="rounded-md bg-caution/10 px-2.5 py-1 text-xs font-medium text-caution hover:bg-caution/20 transition-colors"
                  >
                    Paste Anyway
                  </button>
                  <button
                    onClick={() => void disableSafePasteAndConfirm()}
                    className="rounded-md bg-surface px-2.5 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    Paste Anyway and Don’t Show Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {terminalInputMode === 'editor' && shellState === 'idle' && !(workflowRun && !isTerminalRunStatus(workflowRun.status)) && (
            <div className="rounded-lg bg-surface-light px-3 py-2 shadow-xl">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider mb-1.5">
                <span className="text-accent-light font-semibold">Editor Prompt</span>
                <HelpTip
                  label="Editor Prompt"
                  description={
                    commandHistory.length > 0
                      ? 'Enter runs. Tab accepts the selected suggestion. Shift+Tab or Alt+Up/Down cycles suggestions. Up/down cycles command history. Ctrl+N / Ctrl+P also cycle suggestions.'
                      : 'Enter runs. Tab accepts the selected suggestion. Shift+Tab or Alt+Up/Down cycles suggestions. History appears after your first run.'
                  }
                >
                  <button
                    type="button"
                    className="text-gray-500 hover:text-accent-light transition-colors normal-case tracking-normal"
                    aria-label="Editor prompt help"
                  >
                    <CircleHelp size={13} />
                  </button>
                </HelpTip>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
                <span className="text-sm font-mono text-accent shrink-0">›</span>
                <div className="relative flex-1">
                  {showInlineEditorSuggestion && (
                    <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden text-sm font-mono">
                      <span className="whitespace-pre text-transparent">{editorCommand}</span>
                      <span className="whitespace-pre text-gray-500">{activeEditorSuggestionSuffix}</span>
                    </div>
                  )}
                  <input
                    ref={editorInputRef}
                    type="text"
                    value={editorCommand}
                    onChange={(event) =>
                      handleEditorCommandChange(event.target.value, {
                        start: event.target.selectionStart ?? event.target.value.length,
                        end: event.target.selectionEnd ?? event.target.selectionStart ?? event.target.value.length
                      })}
                    onClick={(event) => syncEditorSelectionFromTarget(event.currentTarget)}
                    onKeyUp={(event) => syncEditorSelectionFromTarget(event.currentTarget)}
                    onSelect={(event) => syncEditorSelectionFromTarget(event.currentTarget)}
                    onPaste={handleEditorPaste}
                    onKeyDown={handleEditorKeyDown}
                    placeholder="Type a command and press Enter"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    className="relative z-10 w-full bg-transparent text-sm text-gray-200 placeholder:text-gray-600 font-mono focus:outline-none"
                  />
                </div>
                <button
                  onClick={submitEditorCommand}
                  className="shrink-0 rounded-md bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent-light hover:bg-accent/20 transition-colors"
                >
                  Run
                </button>
              </div>

              <div className="mt-1.5 min-h-[2rem] flex items-center gap-2 text-[11px]">
                <span className="text-gray-500 shrink-0">Suggestion:</span>
                <div className="min-w-0 flex-1 overflow-hidden">
                  {editorSuggestions.length > 0 ? (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                      {editorSuggestions.slice(0, 3).map((suggestion, index) => {
                        const suggestionIndex = index
                        const selected = suggestionIndex === selectedEditorSuggestionIndex
                        const useInlineSuffix =
                          selected &&
                          activeEditorSuggestionSuffix &&
                          suggestion.value.startsWith(editorCommand)

                        return (
                          <button
                            key={`${suggestion.source}-${suggestion.value}`}
                            type="button"
                            onMouseEnter={() => setSelectedEditorSuggestionIndex(suggestionIndex)}
                            onClick={() => acceptEditorSuggestion(suggestion.value)}
                            className={`shrink-0 rounded-md border px-2 py-1 font-mono transition-colors ${
                              selected
                                ? 'border-accent/20 bg-accent/10 text-accent-light'
                                : 'border-surface-border bg-surface text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            <span className="mr-1.5 rounded px-1 py-0.5 text-[10px] uppercase tracking-wide bg-surface/60 text-gray-500">
                              {getTerminalCompletionSourceLabel(suggestion.source)}
                            </span>
                            {useInlineSuffix ? (
                              <>
                                <span className="text-gray-500">{editorCommand}</span>
                                <span>{activeEditorSuggestionSuffix}</span>
                              </>
                            ) : (
                              suggestion.value
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center h-full text-gray-600">
                      Start typing to generate suggestions.
                    </div>
                  )}
                </div>
                <span className="text-gray-600 shrink-0">Tab accepts the selected suggestion.</span>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-surface-light px-3 py-1.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <HelpTip
                  label="Review Session"
                  description={
                    activeAIProvider
                      ? 'Ask your active AI provider to review the full terminal session transcript.'
                      : 'Select an active AI provider in Settings to review terminal output.'
                  }
                >
                  <button
                    onClick={() => void runAIReview('session')}
                    disabled={aiLoading || secureInputActive}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface text-xs text-gray-300 hover:text-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {aiLoading && aiReviewScope !== 'last-command'
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Sparkles size={12} />}
                    {aiReviewScope === 'session' && aiReview ? 'Refresh Session' : 'Review Session'}
                  </button>
                </HelpTip>

              </div>

              <div className="min-w-0 flex-1 text-[11px] text-gray-400">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="truncate">
                    Prompt: <span className="font-mono text-gray-300">{shellCwd || 'Waiting for shell...'}</span>
                  </span>
                  {activeCommandBlock && !isSSHSessionCommand(activeCommandBlock.command) ? (
                    <span className="truncate">
                      Running: <span className="font-mono text-accent-light">{formatCommandForDisplay(activeCommandBlock.command)}</span>
                    </span>
                  ) : activeCommandBlock && isSSHSessionCommand(activeCommandBlock.command) ? (
                    <span className="truncate text-gray-500">
                      Connected: <span className="font-mono text-gray-400">{getSSHHost(activeCommandBlock.command) ?? 'remote'}</span>
                    </span>
                  ) : lastCompletedCommandBlock && !isSSHSessionCommand(lastCompletedCommandBlock.command) ? (
                    <span className="truncate">
                      Last: <span className="font-mono text-gray-300">{formatCommandForDisplay(lastCompletedCommandBlock.command)}</span>
                    </span>
                  ) : null}
                  {promptCount > 0 && (
                    <span className="shrink-0 text-gray-500">
                      {promptCount} prompt{promptCount === 1 ? '' : 's'}
                    </span>
                  )}
                  <HelpTip
                    label={bracketedPasteMode ? 'Bracketed Paste' : 'Plain Paste'}
                    description={
                      bracketedPasteMode
                        ? 'Shell supports bracketed paste — pasted text is wrapped in escape sequences so it is not executed line-by-line. This is safer for multi-line pastes.'
                        : 'Shell is using plain paste — pasted text is sent as if typed directly, which may execute commands immediately on newlines.'
                    }
                  >
                    <span className={`shrink-0 cursor-default ${bracketedPasteMode ? 'text-accent-light' : 'text-gray-500'}`}>
                      Paste: {bracketedPasteMode ? 'bracketed' : 'plain'}
                    </span>
                  </HelpTip>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-[11px]">
                {(sessionMode === 'ssh-interactive' || sessionMode === 'vnc') ? null : <HelpTip
                  label="Editor Prompt"
                  description={
                    terminalInputMode === 'editor'
                      ? 'Editor mode is ON — type commands in a dedicated input bar with suggestions and history. Toggle to switch back to classic shell input.'
                      : 'Editor mode is OFF — you are typing directly into the live shell. Toggle to use an editor-style command bar with suggestions.'
                  }
                  shortcut="⌘E"
                >
                <button
                  type="button"
                  onClick={() => void handleTerminalInputModeChange(terminalInputMode === 'editor' ? 'classic' : 'editor')}
                  className="inline-flex shrink-0 items-center gap-2.5 rounded-full pl-1 pr-1 py-0.5 text-gray-200 transition-colors hover:bg-surface-light/40"
                >
                  <span className="text-[11px] text-gray-400">Editor Prompt</span>
                  <span
                    role="switch"
                    aria-checked={terminalInputMode === 'editor'}
                    className={clsx(
                      'relative isolate shrink-0 inline-flex h-8 w-20 items-center rounded-full border px-1 transition-all',
                      terminalInputMode === 'editor'
                        ? 'border-accent/30 bg-accent/10 shadow-[0_0_28px_rgba(6,182,212,0.15)]'
                        : 'border-gray-500/40 bg-surface-light/60 shadow-inner'
                    )}
                  >
                    <span className="absolute inset-0 rounded-full bg-gradient-to-r from-white/[0.02] via-transparent to-transparent" />
                    <span
                      className={clsx(
                        'absolute top-1 bottom-1 w-[38px] rounded-full border transition-all duration-200',
                        terminalInputMode === 'editor'
                          ? 'left-[38px] border-accent/40 bg-gradient-to-r from-accent to-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.28)]'
                          : 'left-1 border-gray-500/30 bg-gradient-to-r from-gray-500/50 to-gray-600/40'
                      )}
                    />
                    <span className="relative z-10 flex w-full items-center justify-between px-2 text-[9px] font-semibold uppercase tracking-[0.18em]">
                      <span className={terminalInputMode === 'editor' ? 'text-gray-500' : 'text-white'}>Off</span>
                      <span className={terminalInputMode === 'editor' ? 'text-slate-950' : 'text-gray-500'}>On</span>
                    </span>
                  </span>
                </button>
                </HelpTip>}
              </div>
            </div>
          </div>

          {shellState === 'executing' && (activeCommandBlock || inputPreview || queuedCommands.length > 0) && !(workflowRun && !isTerminalRunStatus(workflowRun.status)) && !(activeCommandBlock && isSSHSessionCommand(activeCommandBlock.command) && queuedCommands.length === 0 && !inputPreview) && (
            <div className="rounded-lg bg-surface-light px-3 py-3 shadow-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <Loader2 size={11} className="animate-spin text-accent" />
                <span className="text-[11px] text-gray-400">
                  Shell busy — commands will run when ready
                </span>
                {queuedCommands.length > 0 && (
                  <button
                    onClick={clearQueue}
                    className="ml-auto text-[11px] text-gray-500 hover:text-destructive transition-colors"
                  >
                    Clear queue
                  </button>
                )}
              </div>

              {activeCommandBlock && (
                <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-surface rounded">
                  <span className="text-[11px] text-gray-500 shrink-0">Running</span>
                  <span className="text-xs text-gray-300 font-mono flex-1 truncate">
                    {formatCommandForDisplay(activeCommandBlock.command)}
                  </span>
                  {activeCommandBlock.cwd && (
                    <span className="text-[11px] text-gray-500 truncate max-w-[40%]">
                      {activeCommandBlock.cwd}
                    </span>
                  )}
                </div>
              )}

              {queuedCommands.map((cmd, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1 bg-accent/10 rounded mb-1"
                >
                  <span className="text-[11px] text-accent/80 shrink-0">#{i + 1}</span>
                  <span className="text-xs text-gray-300 font-mono flex-1 truncate">{cmd}</span>
                  <button
                    onClick={() => removeFromQueue(i)}
                    className="text-gray-500 hover:text-destructive transition-colors shrink-0"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}

              {inputPreview && (
                <div className="flex items-center gap-2 mt-1 px-2 py-1 bg-surface rounded">
                  <span className="text-[11px] text-gray-500">›</span>
                  <span className="text-xs text-gray-300 font-mono flex-1 truncate">
                    {inputPreview}
                  </span>
                  <span className="w-1.5 h-3.5 bg-accent rounded-sm animate-pulse" />
                </div>
              )}
            </div>
          )}
        </div>

        {promoteDialogOpen && promotableCommandString && (
          <PromoteCommandDialog
            commandString={promotableCommandString}
            existingCommand={Boolean(existingPromotedCommand)}
            loading={promoteLoading}
            error={promoteError}
            onClose={() => {
              if (promoteLoading) return
              setPromoteDialogOpen(false)
              setPromoteError(null)
            }}
            onPromote={handlePromoteCommand}
          />
        )}
      </div>
    </div>
  )
}
