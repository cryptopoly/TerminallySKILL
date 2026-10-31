import { useEffect } from 'react'
import { compareLocalized } from '../i18n/format'
import {
  cycleProject,
  matchProjectCycleKey,
  orderProjectsForPicker,
  type ProjectTerminalInfo
} from '../lib/project-order'
import { useProjectStore } from '../store/project-store'
import { useSettingsStore } from '../store/settings-store'
import { useTerminalStore } from '../store/terminal-store'
import { isTerminalRunStatus, useWorkflowRunnerStore } from '../store/workflow-runner-store'
import type { Project } from '../../../shared/project-schema'

function getTerminalInfo(projectId: string): ProjectTerminalInfo {
  const { sessions, busySessionIds } = useTerminalStore.getState()
  const { runsBySession } = useWorkflowRunnerStore.getState()
  const projectSessions = sessions.filter((s) => s.projectId === projectId && s.active)
  const hasActive = projectSessions.some((s) => {
    const run = runsBySession[s.id]
    return Boolean(busySessionIds[s.id]) || Boolean(run && !isTerminalRunStatus(run.status))
  })
  return { count: projectSessions.length, hasActive }
}

/** Same steps as picking a project in the project picker. */
async function switchToProject(project: Project): Promise<void> {
  await window.electronAPI.setActiveProject(project.id)
  useProjectStore.getState().setActiveProject(project)
}

/** Switch to the next/previous project in the project picker's order (wraps around). */
export function cycleActiveProject(direction: 1 | -1): void {
  const { projects, activeProject } = useProjectStore.getState()
  const settings = useSettingsStore.getState().settings
  const ordered = orderProjectsForPicker(projects, getTerminalInfo, (a, b) =>
    compareLocalized(a, b, settings)
  )
  const next = cycleProject(ordered, activeProject?.id, direction)
  if (next) void switchToProject(next)
}

/**
 * Cmd+Option+Down/Up (macOS) or Ctrl+Alt+PageDown/PageUp cycles through projects in the project
 * picker's order. Capture phase, so the focused terminal never also receives the key.
 */
export function useProjectCycleShortcut(): void {
  useEffect(() => {
    const isMac = navigator.platform.toLowerCase().includes('mac')
    const handler = (e: KeyboardEvent): void => {
      const direction = matchProjectCycleKey(e, isMac)
      if (!direction) return
      e.preventDefault()
      e.stopPropagation()
      cycleActiveProject(direction)
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [])
}
