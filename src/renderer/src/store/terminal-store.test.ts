import { beforeEach, describe, expect, it } from 'vitest'
import {
  filterSessionsForProject,
  resolveProjectTerminalContext,
  resolveWatchedSessionId,
  useTerminalStore
} from './terminal-store'

function resetTerminalStore(): void {
  useTerminalStore.setState({
    sessions: [],
    activeSessionId: null,
    terminalVisible: false,
    history: [],
    splitSessionId: null,
    splitDirection: 'vertical',
    focusedPane: 'primary',
    busySessionIds: {}
  })
}

describe('terminal-store', () => {
  beforeEach(() => {
    resetTerminalStore()
  })

  it('swaps primary and secondary sessions when activating the split tab', () => {
    const store = useTerminalStore.getState()

    store.addSession('term-1', 'project-a')
    store.addSession('term-2', 'project-a')
    useTerminalStore.setState({
      activeSessionId: 'term-1',
      splitSessionId: 'term-2',
      focusedPane: 'secondary'
    })

    useTerminalStore.getState().setActiveSession('term-2')

    const nextState = useTerminalStore.getState()
    expect(nextState.activeSessionId).toBe('term-2')
    expect(nextState.splitSessionId).toBe('term-1')
    expect(nextState.focusedPane).toBe('primary')
  })

  it('filters sessions to the active project and resolves a visible fallback session', () => {
    const sessions = [
      { id: 'term-a1', active: true, projectId: 'project-a', mode: 'workspace-shell' as const },
      { id: 'term-a2', active: true, projectId: 'project-a', mode: 'workspace-shell' as const },
      { id: 'term-b1', active: true, projectId: 'project-b', mode: 'workspace-shell' as const }
    ]

    expect(filterSessionsForProject(sessions, 'project-a').map((session) => session.id)).toEqual([
      'term-a1',
      'term-a2'
    ])

    expect(resolveProjectTerminalContext(sessions, 'project-a', 'term-b1', null)).toEqual({
      projectSessions: [sessions[0], sessions[1]],
      activeProjectSessionId: 'term-a1',
      splitProjectSessionId: null
    })
  })

  it('tracks busy sessions and forgets them when the session closes', () => {
    const store = useTerminalStore.getState()
    store.addSession('term-1', 'project-a')
    store.addSession('term-2', 'project-a')

    store.setSessionBusy('term-1', true)
    expect(useTerminalStore.getState().busySessionIds).toEqual({ 'term-1': true })

    store.setSessionBusy('term-1', false)
    expect(useTerminalStore.getState().busySessionIds).toEqual({})

    store.setSessionBusy('term-2', true)
    store.removeSession('term-2')
    expect(useTerminalStore.getState().busySessionIds).toEqual({})
  })

  it('counts only the focused pane of a split as watched', () => {
    const sessions = [
      { id: 'term-1', active: true, projectId: 'project-a', mode: 'workspace-shell' as const },
      { id: 'term-2', active: true, projectId: 'project-a', mode: 'workspace-shell' as const },
      { id: 'term-3', active: true, projectId: 'project-a', mode: 'workspace-shell' as const }
    ]

    expect(resolveWatchedSessionId(sessions, 'project-a', 'term-1', 'term-2', 'primary')).toBe('term-1')
    expect(resolveWatchedSessionId(sessions, 'project-a', 'term-1', 'term-2', 'secondary')).toBe('term-2')
    // No split: the focused-pane value is irrelevant
    expect(resolveWatchedSessionId(sessions, 'project-a', 'term-3', null, 'secondary')).toBe('term-3')
    // Sessions of another project are never watched
    expect(resolveWatchedSessionId(sessions, 'project-b', 'term-1', 'term-2', 'primary')).toBeNull()
  })
})
