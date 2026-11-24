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
    busySessionIds: {},
    agentActivityBySession: {},
    quietSessionIds: {},
    terminalMaximised: false,
    quadByProject: {}
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

  it('forgets what an agent reported when its command ends, the shell exits or the tab closes', () => {
    const store = useTerminalStore.getState()
    store.addSession('term-1', 'project-a')
    store.addSession('term-2', 'project-a')

    store.setSessionBusy('term-1', true)
    store.setAgentActivity('term-1', 'working')
    expect(useTerminalStore.getState().agentActivityBySession).toEqual({ 'term-1': 'working' })
    // Command end (and shell exit, which uses the same call) clears it even when not marked busy
    store.setSessionBusy('term-1', false)
    expect(useTerminalStore.getState().agentActivityBySession).toEqual({})
    store.setAgentActivity('term-1', 'idle')
    store.setSessionBusy('term-1', false)
    expect(useTerminalStore.getState().agentActivityBySession).toEqual({})

    store.setAgentActivity('term-2', 'working')
    store.removeSession('term-2')
    expect(useTerminalStore.getState().agentActivityBySession).toEqual({})

    // A report for a terminal that is already closed is ignored
    store.setAgentActivity('term-2', 'working')
    expect(useTerminalStore.getState().agentActivityBySession).toEqual({})
  })

  it('clears the quiet flag on request, when the command ends and when the tab closes', () => {
    const store = useTerminalStore.getState()
    store.addSession('term-1', 'project-a')
    store.addSession('term-2', 'project-a')

    store.setSessionBusy('term-1', true)
    store.setSessionQuiet('term-1', true)
    expect(useTerminalStore.getState().quietSessionIds).toEqual({ 'term-1': true })
    store.setSessionQuiet('term-1', false)
    expect(useTerminalStore.getState().quietSessionIds).toEqual({})

    store.setSessionQuiet('term-1', true)
    store.setSessionBusy('term-1', false)
    expect(useTerminalStore.getState().quietSessionIds).toEqual({})

    store.setSessionQuiet('term-2', true)
    store.removeSession('term-2')
    expect(useTerminalStore.getState().quietSessionIds).toEqual({})
    store.setSessionQuiet('term-2', true)
    expect(useTerminalStore.getState().quietSessionIds).toEqual({})
  })

  it('ends maximise when the terminal is hidden or the last terminal closes', () => {
    const store = useTerminalStore.getState()
    store.addSession('term-1', 'project-a')
    store.setTerminalMaximised(true)
    store.setTerminalVisible(true)
    expect(useTerminalStore.getState().terminalMaximised).toBe(true)
    store.setTerminalVisible(false)
    expect(useTerminalStore.getState().terminalMaximised).toBe(false)

    store.setTerminalVisible(true)
    store.setTerminalMaximised(true)
    store.removeSession('term-1')
    expect(useTerminalStore.getState().terminalMaximised).toBe(false)
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

describe('terminal-store quad split', () => {
  beforeEach(() => {
    resetTerminalStore()
  })

  const quadOf = (projectId: string | null) => useTerminalStore.getState().quadByProject[projectId ?? '']

  it('enters quad with the open tabs, focus on the tab in use, and leaves it back to the split from before', () => {
    const store = useTerminalStore.getState()
    store.addSession('a', 'p')
    store.addSession('b', 'p')
    store.addSession('other', 'q')
    store.setActiveSession('a')
    store.splitTerminal('horizontal', 'b')

    useTerminalStore.getState().enterQuad('p')
    let state = useTerminalStore.getState()
    expect(quadOf('p')?.slots).toEqual(['a', 'b', null, null])
    expect(quadOf('p')?.autoFill).toBe(true)
    expect(state.activeSessionId).toBe('a')
    expect(state.splitSessionId).toBeNull()

    // New terminals fill the empty panes in order
    state.addSession('c', 'p')
    state.addSession('d', 'p')
    expect(quadOf('p')?.slots).toEqual(['a', 'b', 'c', 'd'])
    expect(useTerminalStore.getState().activeSessionId).toBe('d')

    useTerminalStore.getState().exitQuad('p')
    state = useTerminalStore.getState()
    expect(quadOf('p')).toBeUndefined()
    expect(state.activeSessionId).toBe('a')
    expect(state.splitSessionId).toBe('b')
    expect(state.splitDirection).toBe('horizontal')
    // No terminal was closed
    expect(state.sessions.map((session) => session.id)).toEqual(['a', 'b', 'other', 'c', 'd'])
  })

  it('focuses a pane when its tab is chosen and swaps any other tab into the focused pane', () => {
    const store = useTerminalStore.getState()
    for (const id of ['a', 'b', 'c', 'd', 'e']) store.addSession(id, 'p')
    useTerminalStore.getState().setActiveSession('a')
    useTerminalStore.getState().enterQuad('p')
    expect(quadOf('p')?.slots).toEqual(['a', 'b', 'c', 'd'])

    useTerminalStore.getState().setActiveSession('c')
    expect(useTerminalStore.getState().activeSessionId).toBe('c')
    expect(quadOf('p')?.slots).toEqual(['a', 'b', 'c', 'd'])

    useTerminalStore.getState().setActiveSession('e')
    expect(useTerminalStore.getState().activeSessionId).toBe('e')
    expect(quadOf('p')?.slots).toEqual(['a', 'b', 'e', 'd'])
  })

  it('moves focus with Cmd+] / Cmd+[ through the four panes', () => {
    const store = useTerminalStore.getState()
    for (const id of ['a', 'b', 'c', 'd']) store.addSession(id, 'p')
    useTerminalStore.getState().setActiveSession('a')
    useTerminalStore.getState().enterQuad('p')

    const cycle = (direction: 1 | -1): string | null => {
      useTerminalStore.getState().cycleFocusedPane('p', direction)
      return useTerminalStore.getState().activeSessionId
    }
    expect([cycle(1), cycle(1), cycle(1), cycle(1)]).toEqual(['b', 'c', 'd', 'a'])
    expect(cycle(-1)).toBe('d')
  })

  it('gives a closed pane a hidden tab, or leaves it empty, and refills only once every pane closed', () => {
    const store = useTerminalStore.getState()
    for (const id of ['a', 'b', 'c', 'd', 'e']) store.addSession(id, 'p')
    useTerminalStore.getState().setActiveSession('a')
    useTerminalStore.getState().enterQuad('p')
    useTerminalStore.getState().finishQuadFill('p')

    useTerminalStore.getState().removeSession('a')
    expect(quadOf('p')?.slots).toEqual(['e', 'b', 'c', 'd'])
    expect(useTerminalStore.getState().activeSessionId).toBe('e')

    useTerminalStore.getState().removeSession('b')
    expect(quadOf('p')?.slots).toEqual(['e', null, 'c', 'd'])
    expect(quadOf('p')?.autoFill).toBe(false)

    for (const id of ['c', 'd', 'e']) useTerminalStore.getState().removeSession(id)
    expect(quadOf('p')?.slots).toEqual([null, null, null, null])
    expect(quadOf('p')?.autoFill).toBe(true)
  })

  it('keeps one quad per project and sets the panes given by session restore', () => {
    const store = useTerminalStore.getState()
    for (const id of ['a', 'b', 'c']) store.addSession(id, 'p')
    store.addSession('x', 'q')
    useTerminalStore.getState().enterQuad('q')
    expect(quadOf('q')?.slots).toEqual(['x', null, null, null])
    expect(quadOf('p')).toBeUndefined()

    useTerminalStore.getState().enterQuad('p', ['c', null, 'a', 'x'])
    // A session of another project never joins the grid
    expect(quadOf('p')?.slots).toEqual(['c', null, 'a', null])

    useTerminalStore.getState().toggleQuad('q')
    expect(quadOf('q')).toBeUndefined()
    expect(quadOf('p')).toBeDefined()
  })
})
