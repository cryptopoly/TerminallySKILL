import { create } from 'zustand'
import type { AgentActivity } from '../../../shared/attention'

export interface TerminalSession {
  id: string
  active: boolean
  projectId: string | null
  mode: TerminalSessionMode
  vncWsPort?: number
  vncToken?: string
}

export type TerminalSessionMode = 'workspace-shell' | 'ssh-interactive' | 'vnc'
type SplitDirection = 'horizontal' | 'vertical'

interface TerminalStore {
  sessions: TerminalSession[]
  activeSessionId: string | null
  terminalVisible: boolean
  history: string[]
  /** Split pane state */
  splitSessionId: string | null
  splitDirection: SplitDirection
  focusedPane: 'primary' | 'secondary'
  /** Sessions with a command currently running (from shell integration) */
  busySessionIds: Record<string, true>
  setSessionBusy: (id: string, busy: boolean) => void
  /** What an agent in the session last reported through OSC 7501 (cleared when its command ends) */
  agentActivityBySession: Record<string, AgentActivity>
  setAgentActivity: (id: string, activity: AgentActivity) => void
  /** Terminal fills the window (project content collapsed). Not saved: resets on restart. */
  terminalMaximised: boolean
  setTerminalMaximised: (maximised: boolean) => void
  addSession: (id: string, projectId?: string | null, mode?: TerminalSessionMode, vncWsPort?: number, vncToken?: string) => void
  removeSession: (id: string) => void
  setActiveSession: (id: string) => void
  setTerminalVisible: (visible: boolean) => void
  setSplitDirection: (direction: SplitDirection) => void
  addToHistory: (command: string) => void
  /** Split the terminal area: show activeSessionId + newSessionId together */
  splitTerminal: (direction: SplitDirection, newSessionId: string) => void
  /** Remove split and keep the focused pane's session active */
  unsplitTerminal: () => void
  /** Close a specific pane (by session ID) */
  closeSplitPane: (sessionId: string) => void
  /** Toggle focus between primary and secondary panes */
  setFocusedPane: (pane: 'primary' | 'secondary') => void
  toggleFocusedPane: () => void
}

export function filterSessionsForProject(
  sessions: TerminalSession[],
  projectId: string | null
): TerminalSession[] {
  return sessions.filter((session) => session.projectId === projectId)
}

export function resolveProjectTerminalContext(
  sessions: TerminalSession[],
  projectId: string | null,
  activeSessionId: string | null,
  splitSessionId: string | null
): {
  projectSessions: TerminalSession[]
  activeProjectSessionId: string | null
  splitProjectSessionId: string | null
} {
  const projectSessions = filterSessionsForProject(sessions, projectId)
  const sessionIds = new Set(projectSessions.map((session) => session.id))

  const activeProjectSessionId =
    activeSessionId && sessionIds.has(activeSessionId)
      ? activeSessionId
      : projectSessions[0]?.id ?? null

  const splitProjectSessionId =
    splitSessionId &&
    sessionIds.has(splitSessionId) &&
    splitSessionId !== activeProjectSessionId
      ? splitSessionId
      : null

  return {
    projectSessions,
    activeProjectSessionId,
    splitProjectSessionId
  }
}

/**
 * The one session the user is working in. Both panes of a split are visible, but only the
 * focused pane counts, so a long command in the other pane can still ask for attention.
 */
export function resolveWatchedSessionId(
  sessions: TerminalSession[],
  projectId: string | null,
  activeSessionId: string | null,
  splitSessionId: string | null,
  focusedPane: 'primary' | 'secondary'
): string | null {
  const { activeProjectSessionId, splitProjectSessionId } = resolveProjectTerminalContext(
    sessions,
    projectId,
    activeSessionId,
    splitSessionId
  )
  return splitProjectSessionId && focusedPane === 'secondary' ? splitProjectSessionId : activeProjectSessionId
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  sessions: [],
  activeSessionId: null,
  terminalVisible: false,
  history: [],
  splitSessionId: null,
  splitDirection: 'vertical',
  focusedPane: 'primary',
  busySessionIds: {},
  agentActivityBySession: {},
  terminalMaximised: false,
  setSessionBusy: (id, busy) =>
    set((state) => {
      // The command ended, so any agent it started is gone too: drop what it last reported.
      const hasAgent = id in state.agentActivityBySession
      if (Boolean(state.busySessionIds[id]) === busy && (busy || !hasAgent)) return state
      const { [id]: _removed, ...rest } = state.busySessionIds
      if (busy) return { busySessionIds: { ...rest, [id]: true as const } }
      const { [id]: _agent, ...agentActivityBySession } = state.agentActivityBySession
      return { busySessionIds: rest, agentActivityBySession }
    }),
  setAgentActivity: (id, activity) =>
    set((state) => {
      if (state.agentActivityBySession[id] === activity) return state
      if (!state.sessions.some((session) => session.id === id)) return state
      return { agentActivityBySession: { ...state.agentActivityBySession, [id]: activity } }
    }),
  setTerminalMaximised: (maximised) => set({ terminalMaximised: maximised }),
  addSession: (id, projectId = null, mode = 'workspace-shell', vncWsPort, vncToken) =>
    set((state) => ({
      sessions: [
        ...state.sessions,
        {
          id, active: true, projectId: projectId ?? null, mode,
          ...(vncWsPort !== undefined ? { vncWsPort } : {}),
          ...(vncToken !== undefined ? { vncToken } : {})
        }
      ],
      activeSessionId: id,
      terminalVisible: true
    })),
  removeSession: (id) =>
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id)
      // If removing a split pane session, unsplit
      let splitSessionId = state.splitSessionId
      let activeSessionId = state.activeSessionId
      if (splitSessionId === id) {
        splitSessionId = null
      } else if (activeSessionId === id && splitSessionId) {
        activeSessionId = splitSessionId
        splitSessionId = null
      }
      if (activeSessionId === id) {
        activeSessionId = sessions[0]?.id ?? null
      }
      const { [id]: _closed, ...busySessionIds } = state.busySessionIds
      const { [id]: _closedAgent, ...agentActivityBySession } = state.agentActivityBySession
      return {
        sessions,
        activeSessionId,
        splitSessionId,
        busySessionIds,
        agentActivityBySession,
        focusedPane: 'primary',
        terminalVisible: sessions.length > 0,
        terminalMaximised: sessions.length > 0 && state.terminalMaximised
      }
    }),
  setActiveSession: (id) =>
    set((state) => {
      if (state.splitSessionId && id === state.splitSessionId && state.activeSessionId && state.activeSessionId !== id) {
        return {
          activeSessionId: id,
          splitSessionId: state.activeSessionId,
          focusedPane: 'primary'
        }
      }

      return {
        activeSessionId: id,
        // If the selected tab is already in a split, keep it; otherwise clear split
        splitSessionId: state.splitSessionId === id || state.activeSessionId === id
          ? state.splitSessionId
          : null,
        focusedPane: 'primary'
      }
    }),
  // Hiding the terminal (minimise) also ends maximise, so showing it again restores the old split.
  setTerminalVisible: (visible) =>
    set(visible ? { terminalVisible: true } : { terminalVisible: false, terminalMaximised: false }),
  setSplitDirection: (direction) => set({ splitDirection: direction }),
  addToHistory: (command) =>
    set((state) => ({
      history: [command, ...state.history.filter((c) => c !== command)].slice(0, 50)
    })),
  splitTerminal: (direction, newSessionId) =>
    set({
      splitSessionId: newSessionId,
      splitDirection: direction,
      focusedPane: 'secondary',
      terminalVisible: true
    }),
  unsplitTerminal: () =>
    set((state) => ({
      activeSessionId: state.focusedPane === 'secondary' && state.splitSessionId
        ? state.splitSessionId
        : state.activeSessionId,
      splitSessionId: null,
      focusedPane: 'primary'
    })),
  closeSplitPane: (sessionId) =>
    set((state) => {
      if (sessionId === state.splitSessionId) {
        // Closing secondary pane
        return { splitSessionId: null, focusedPane: 'primary' }
      }
      if (sessionId === state.activeSessionId && state.splitSessionId) {
        // Closing primary pane — promote secondary
        return {
          activeSessionId: state.splitSessionId,
          splitSessionId: null,
          focusedPane: 'primary'
        }
      }
      return {}
    }),
  setFocusedPane: (pane) => set({ focusedPane: pane }),
  toggleFocusedPane: () =>
    set((state) => ({
      focusedPane: state.splitSessionId
        ? (state.focusedPane === 'primary' ? 'secondary' : 'primary')
        : 'primary'
    }))
}))
