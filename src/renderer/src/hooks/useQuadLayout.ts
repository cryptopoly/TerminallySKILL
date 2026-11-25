import { useEffect, useRef } from 'react'
import { quadKey } from '../lib/quad-layout'
import { useProjectStore } from '../store/project-store'
import { filterSessionsForProject, useTerminalStore } from '../store/terminal-store'
import { waitForTerminalRestore } from './useTerminalSessionRestore'

/**
 * Keeps the active project's quad split whole: opens new terminals for its empty panes when quad starts
 * (once the project has a terminal and the panel shows), and keeps the focus on one of its panes.
 */
export function useQuadLayout(activeProjectId: string | null, openTerminal: () => Promise<void>): void {
  const quad = useTerminalStore((s) => s.quadByProject[quadKey(activeProjectId)] ?? null)
  const terminalVisible = useTerminalStore((s) => s.terminalVisible)
  const projectSessionCount = useTerminalStore((s) => filterSessionsForProject(s.sessions, activeProjectId).length)
  const activeSessionId = useTerminalStore((s) => s.activeSessionId)
  const fillingRef = useRef(false)
  const openTerminalRef = useRef(openTerminal)
  openTerminalRef.current = openTerminal

  useEffect(() => {
    // Wait for a terminal of the project: closing every pane must not open four new ones at once.
    if (!quad?.autoFill || !terminalVisible || projectSessionCount === 0 || fillingRef.current) return
    fillingRef.current = true
    const currentQuad = () => useTerminalStore.getState().quadByProject[quadKey(activeProjectId)]
    // openTerminal opens in the active project: stop if the user switches project meanwhile, and carry on on return.
    const stillActive = () => (useProjectStore.getState().activeProject?.id ?? null) === activeProjectId
    let interrupted = false
    void (async () => {
      try {
        // Reopened tabs take their panes first.
        await waitForTerminalRestore()
        const focusedBefore = useTerminalStore.getState().activeSessionId
        let opened = 0
        while (opened < 4 && currentQuad()?.autoFill && currentQuad()?.slots.includes(null)) {
          if (!stillActive()) {
            interrupted = true
            break
          }
          await openTerminalRef.current()
          opened += 1
        }
        // New terminals take the focus as they open: give it back to the pane that had it.
        const slots = currentQuad()?.slots ?? []
        if (opened > 0 && focusedBefore && slots.includes(focusedBefore)) {
          useTerminalStore.getState().setActiveSession(focusedBefore)
        }
      } catch (error) {
        console.error('[quad] Could not open a terminal for an empty pane:', error)
      } finally {
        if (!interrupted) useTerminalStore.getState().finishQuadFill(activeProjectId)
        fillingRef.current = false
      }
    })()
  }, [activeProjectId, projectSessionCount, quad?.autoFill, terminalVisible])

  // Back in a project after working in another: focus a pane of its grid, not a hidden tab.
  useEffect(() => {
    if (!quad) return
    if (activeSessionId && quad.slots.includes(activeSessionId)) return
    const pane = quad.slots.find((id): id is string => Boolean(id))
    if (pane) useTerminalStore.setState({ activeSessionId: pane, focusedPane: 'primary' })
  }, [activeSessionId, quad])
}
