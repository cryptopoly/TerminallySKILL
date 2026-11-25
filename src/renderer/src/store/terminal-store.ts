import { create } from 'zustand'
import type { AgentActivity } from '../../../shared/attention'
import {
  buildQuadSlots,
  nextQuadSessionId,
  placeInQuadSlot,
  QUAD_PANE_COUNT,
  quadKey,
  type QuadSlots
} from '../lib/quad-layout'

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

/** A project's quad split. The focused pane is the active session, so everything that follows the active tab follows it. */
export interface QuadLayout {
  /** Four panes, row by row; null = empty pane */
  slots: QuadSlots
  /** The layout to go back to when quad ends */
  previous: { activeSessionId: string | null; splitSessionId: string | null; splitDirection: SplitDirection }
  /** Open new terminals for empty panes. On when quad starts (or comes back); off once filled, so a closed pane stays empty. */
  autoFill: boolean
}

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
  /** Busy sessions that printed nothing for a while (quiet-terminal check); cleared by new output */
  quietSessionIds: Record<string, true>
  setSessionQuiet: (id: string, quiet: boolean) => void
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
  /** Quad split per project (key: project id, '' for no project). Kept while the app runs. */
  quadByProject: Record<string, QuadLayout>
  /** Start quad with the project's open tabs, or (with slots) set its panes, as session restore does */
  enterQuad: (projectId: string | null, slots?: QuadSlots) => void
  /** End quad and go back to the layout from before it. Terminals stay open as tabs. */
  exitQuad: (projectId: string | null) => void
  toggleQuad: (projectId: string | null) => void
  /** Put a session in one pane (an empty pane's New terminal button) */
  placeQuadSession: (projectId: string | null, index: number, sessionId: string) => void
  finishQuadFill: (projectId: string | null) => void
  /** Cmd+] / Cmd+[: the next or previous pane of a split or quad */
  cycleFocusedPane: (projectId: string | null, direction: 1 | -1) => void
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
  quietSessionIds: {},
  terminalMaximised: false,
  quadByProject: {},
  setSessionBusy: (id, busy) =>
    set((state) => {
      // The command ended, so any agent it started is gone too: drop what it last reported.
      const hasAgent = id in state.agentActivityBySession || id in state.quietSessionIds
      if (Boolean(state.busySessionIds[id]) === busy && (busy || !hasAgent)) return state
      const { [id]: _removed, ...rest } = state.busySessionIds
      if (busy) return { busySessionIds: { ...rest, [id]: true as const } }
      const { [id]: _agent, ...agentActivityBySession } = state.agentActivityBySession
      const { [id]: _quiet, ...quietSessionIds } = state.quietSessionIds
      return { busySessionIds: rest, agentActivityBySession, quietSessionIds }
    }),
  setSessionQuiet: (id, quiet) =>
    set((state) => {
      if (Boolean(state.quietSessionIds[id]) === quiet) return state
      if (!quiet) {
        const { [id]: _removed, ...rest } = state.quietSessionIds
        return { quietSessionIds: rest }
      }
      if (!state.sessions.some((session) => session.id === id)) return state
      return { quietSessionIds: { ...state.quietSessionIds, [id]: true as const } }
    }),
  setAgentActivity: (id, activity) =>
    set((state) => {
      if (state.agentActivityBySession[id] === activity) return state
      if (!state.sessions.some((session) => session.id === id)) return state
      return { agentActivityBySession: { ...state.agentActivityBySession, [id]: activity } }
    }),
  setTerminalMaximised: (maximised) => set({ terminalMaximised: maximised }),
  addSession: (id, projectId = null, mode = 'workspace-shell', vncWsPort, vncToken) =>
    set((state) => {
      // In quad, a new terminal takes an empty pane, or else the focused one (that tab stays open).
      const key = quadKey(projectId ?? null)
      const quad = state.quadByProject[key]
      let quadByProject = state.quadByProject
      if (quad) {
        const emptyIndex = quad.slots.indexOf(null)
        const focusedIndex = state.activeSessionId ? quad.slots.indexOf(state.activeSessionId) : -1
        const index = emptyIndex >= 0 ? emptyIndex : Math.max(focusedIndex, 0)
        quadByProject = { ...state.quadByProject, [key]: { ...quad, slots: placeInQuadSlot(quad.slots, index, id) } }
      }
      return {
        sessions: [
          ...state.sessions,
          {
            id, active: true, projectId: projectId ?? null, mode,
            ...(vncWsPort !== undefined ? { vncWsPort } : {}),
            ...(vncToken !== undefined ? { vncToken } : {})
          }
        ],
        activeSessionId: id,
        terminalVisible: true,
        quadByProject
      }
    }),
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
      // A closed quad pane takes a hidden tab of the project, or stays empty
      let quadByProject = state.quadByProject
      const closed = state.sessions.find((session) => session.id === id)
      for (const [key, quad] of Object.entries(state.quadByProject)) {
        const index = quad.slots.indexOf(id)
        if (index < 0) continue
        const spare = sessions.find(
          (session) => session.projectId === (closed?.projectId ?? null) && !quad.slots.includes(session.id)
        )
        const slots = quad.slots.map((slot, i) => (i === index ? spare?.id ?? null : slot))
        // Every pane closed: open four again the next time a terminal opens for the project
        const autoFill = quad.autoFill || slots.every((slot) => !slot)
        quadByProject = { ...quadByProject, [key]: { ...quad, slots, autoFill } }
        if (state.activeSessionId === id) {
          activeSessionId = slots[index] ?? slots.find((slot): slot is string => Boolean(slot)) ?? activeSessionId
        }
      }
      if (activeSessionId === id) {
        activeSessionId = sessions[0]?.id ?? null
      }
      const { [id]: _closed, ...busySessionIds } = state.busySessionIds
      const { [id]: _closedAgent, ...agentActivityBySession } = state.agentActivityBySession
      const { [id]: _closedQuiet, ...quietSessionIds } = state.quietSessionIds
      return {
        sessions,
        activeSessionId,
        splitSessionId,
        busySessionIds,
        agentActivityBySession,
        quietSessionIds,
        quadByProject,
        focusedPane: 'primary',
        terminalVisible: sessions.length > 0,
        terminalMaximised: sessions.length > 0 && state.terminalMaximised
      }
    }),
  setActiveSession: (id) =>
    set((state) => {
      // In quad, choosing a pane's tab focuses that pane; any other tab of the project moves into the focused pane.
      const session = state.sessions.find((candidate) => candidate.id === id)
      const key = quadKey(session?.projectId ?? null)
      const quad = session ? state.quadByProject[key] : undefined
      if (quad) {
        if (quad.slots.includes(id)) return { activeSessionId: id, focusedPane: 'primary' }
        const focusedIndex = state.activeSessionId ? quad.slots.indexOf(state.activeSessionId) : -1
        const emptyIndex = quad.slots.indexOf(null)
        const index = focusedIndex >= 0 ? focusedIndex : emptyIndex >= 0 ? emptyIndex : 0
        return {
          activeSessionId: id,
          focusedPane: 'primary',
          quadByProject: { ...state.quadByProject, [key]: { ...quad, slots: placeInQuadSlot(quad.slots, index, id) } }
        }
      }

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
    })),
  enterQuad: (projectId, slots) =>
    set((state) => {
      const key = quadKey(projectId)
      const existing = state.quadByProject[key]
      if (existing && !slots) return state
      const projectSessionIds = filterSessionsForProject(state.sessions, projectId).map((session) => session.id)
      const context = resolveProjectTerminalContext(state.sessions, projectId, state.activeSessionId, state.splitSessionId)
      const nextSlots = slots
        ? Array.from({ length: QUAD_PANE_COUNT }, (_, index) => {
            const id = slots[index]
            return id && projectSessionIds.includes(id) ? id : null
          })
        : buildQuadSlots(projectSessionIds, context.activeProjectSessionId, context.splitProjectSessionId)
      const quad: QuadLayout = existing
        ? { ...existing, slots: nextSlots, autoFill: true }
        : {
            slots: nextSlots,
            previous: {
              activeSessionId: context.activeProjectSessionId,
              splitSessionId: context.splitProjectSessionId,
              splitDirection: state.splitDirection
            },
            autoFill: true
          }
      const focused =
        context.activeProjectSessionId && nextSlots.includes(context.activeProjectSessionId)
          ? context.activeProjectSessionId
          : nextSlots.find((id): id is string => Boolean(id)) ?? null
      return {
        quadByProject: { ...state.quadByProject, [key]: quad },
        activeSessionId: focused ?? state.activeSessionId,
        splitSessionId: context.splitProjectSessionId ? null : state.splitSessionId,
        focusedPane: 'primary'
      }
    }),
  exitQuad: (projectId) =>
    set((state) => {
      const key = quadKey(projectId)
      const quad = state.quadByProject[key]
      if (!quad) return state
      const { [key]: _ended, ...quadByProject } = state.quadByProject
      const projectSessionIds = filterSessionsForProject(state.sessions, projectId).map((session) => session.id)
      const isOpen = (id: string | null): id is string => id !== null && projectSessionIds.includes(id)
      const { previous } = quad
      const activeSessionId = isOpen(previous.activeSessionId)
        ? previous.activeSessionId
        : state.activeSessionId
      const splitSessionId =
        isOpen(previous.splitSessionId) && previous.splitSessionId !== activeSessionId ? previous.splitSessionId : null
      return {
        quadByProject,
        activeSessionId,
        splitSessionId,
        splitDirection: splitSessionId ? previous.splitDirection : state.splitDirection,
        focusedPane: 'primary'
      }
    }),
  toggleQuad: (projectId) => {
    const { quadByProject, enterQuad, exitQuad } = useTerminalStore.getState()
    if (quadByProject[quadKey(projectId)]) exitQuad(projectId)
    else enterQuad(projectId)
  },
  placeQuadSession: (projectId, index, sessionId) =>
    set((state) => {
      const key = quadKey(projectId)
      const quad = state.quadByProject[key]
      if (!quad) return state
      return {
        quadByProject: { ...state.quadByProject, [key]: { ...quad, slots: placeInQuadSlot(quad.slots, index, sessionId) } }
      }
    }),
  finishQuadFill: (projectId) =>
    set((state) => {
      const key = quadKey(projectId)
      const quad = state.quadByProject[key]
      if (!quad?.autoFill) return state
      return { quadByProject: { ...state.quadByProject, [key]: { ...quad, autoFill: false } } }
    }),
  cycleFocusedPane: (projectId, direction) =>
    set((state) => {
      const quad = state.quadByProject[quadKey(projectId)]
      if (!quad) {
        return { focusedPane: state.splitSessionId && state.focusedPane === 'primary' ? 'secondary' : 'primary' }
      }
      const next = nextQuadSessionId(quad.slots, state.activeSessionId, direction)
      return next ? { activeSessionId: next, focusedPane: 'primary' } : state
    })
}))
