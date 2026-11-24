import { useEffect } from 'react'
import { buildEnvOverrides, isLocalProjectWorkspaceTarget } from '../../../shared/project-schema'
import type { ReportedTerminalLayout } from '../../../shared/session-restore'
import { createProjectTerminalSession } from '../lib/workspace-session'
import { useProjectStore } from '../store/project-store'
import { useSettingsStore } from '../store/settings-store'
import { useTerminalStore } from '../store/terminal-store'

// Runs once per page load (StrictMode mounts effects twice in development).
let restoreOnce: Promise<void> | null = null

/** Resolves once saved tabs (if any) are reopened, so other startup code does not open a duplicate tab. */
export function waitForTerminalRestore(): Promise<void> {
  return (restoreOnce ?? Promise.resolve()).catch(() => undefined)
}

async function restoreSavedTabs(): Promise<void> {
  if (!useSettingsStore.getState().settings.restoreTerminalTabs) return
  const saved = await window.electronAPI.takeSavedTerminalLayout()
  if (!saved) return
  const projects = useProjectStore.getState().projects
  const addSession = useTerminalStore.getState().addSession
  const sessionIds: (string | null)[] = []
  for (const tab of saved.tabs) {
    const project = tab.projectId ? projects.find((p) => p.id === tab.projectId) : null
    // The project was deleted since: skip its tabs.
    if (tab.projectId && !project) {
      sessionIds.push(null)
      continue
    }
    const isLocal = !project || isLocalProjectWorkspaceTarget(project.workspaceTarget)
    const sessionId = await createProjectTerminalSession(
      project,
      addSession,
      project ? buildEnvOverrides(project.envVars ?? []) : undefined,
      'workspace-shell',
      isLocal ? tab.cwd ?? undefined : undefined
    )
    sessionIds.push(sessionId)
  }
  const terminals = useTerminalStore.getState()
  const activeId = saved.activeIndex !== null ? sessionIds[saved.activeIndex] : null
  const splitId = saved.split ? sessionIds[saved.split.index] : null
  if (activeId) terminals.setActiveSession(activeId)
  if (activeId && splitId && saved.split) {
    terminals.splitTerminal(saved.split.direction, splitId)
    terminals.setFocusedPane('primary')
  }
  for (const indexes of saved.quads ?? []) {
    const slots = indexes.map((index) => (index !== null ? sessionIds[index] ?? null : null))
    const firstId = slots.find((id): id is string => Boolean(id))
    const projectId = useTerminalStore.getState().sessions.find((session) => session.id === firstId)?.projectId
    if (firstId && projectId !== undefined) useTerminalStore.getState().enterQuad(projectId, slots)
  }
}

/**
 * Opt-in session restore: at launch, reopen the local terminal tabs, split, quad splits and folders saved at the
 * last quit; while running, report the tabs to the main process so it can save them on quit.
 * SSH and VNC tabs are never reopened, and no scrollback is kept.
 */
export function useTerminalSessionRestore(): void {
  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | null = null
    let lastReport = ''

    const report = (): void => {
      const enabled = useSettingsStore.getState().settings.restoreTerminalTabs
      const state = useTerminalStore.getState()
      const tabs = enabled
        ? state.sessions
            .filter((session) => session.mode === 'workspace-shell')
            .map((session) => ({ sessionId: session.id, projectId: session.projectId }))
        : []
      const reportedIds = new Set(tabs.map((tab) => tab.sessionId))
      const quads = Object.values(state.quadByProject)
        .map((quad) => quad.slots.map((id) => (id && reportedIds.has(id) ? id : null)))
        .filter((slots) => slots.some(Boolean))
      const layout: ReportedTerminalLayout = {
        tabs,
        activeSessionId: state.activeSessionId,
        splitSessionId: state.splitSessionId,
        splitDirection: state.splitDirection,
        quads
      }
      const serialised = JSON.stringify(layout)
      if (serialised === lastReport) return
      lastReport = serialised
      window.electronAPI.reportTerminalLayout(layout)
    }

    restoreOnce ??= restoreSavedTabs()
    void restoreOnce
      .catch((error) => console.error('[session-restore] Could not reopen terminal tabs:', error))
      .finally(() => {
        if (cancelled) return
        report()
        const unsubscribeTerminals = useTerminalStore.subscribe(report)
        const unsubscribeSettings = useSettingsStore.subscribe(report)
        unsubscribe = () => {
          unsubscribeTerminals()
          unsubscribeSettings()
        }
      })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])
}
