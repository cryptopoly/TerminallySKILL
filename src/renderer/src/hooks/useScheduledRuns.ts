import { useEffect } from 'react'
import type { Schedule, ScheduleRunStatus } from '../../../shared/schedule-schema'
import {
  getMissingRequiredWorkflowInputs,
  getWorkflowInputInitialValues
} from '../../../shared/workflow-execution'
import { buildEnvOverrides } from '../../../shared/project-schema'
import { createProjectTerminalSession } from '../lib/workspace-session'
import { useProjectStore } from '../store/project-store'
import { useScheduleStore } from '../store/schedule-store'
import { useScriptStore } from '../store/script-store'
import { useTerminalStore } from '../store/terminal-store'
import { isTerminalRunStatus, useWorkflowRunnerStore } from '../store/workflow-runner-store'

/** Tab used by the previous run of each schedule, reused while it is still open */
const sessionByScheduleId = new Map<string, string>()
/** Runs started by a schedule, so their outcome can be written back */
const scheduleIdByRunId = new Map<string, string>()

function report(scheduleId: string, status: ScheduleRunStatus): void {
  void window.electronAPI.markScheduleResult(scheduleId, status).then(() => useScheduleStore.getState().refresh())
}

async function runDueSchedule(schedule: Schedule): Promise<void> {
  const script = useScriptStore.getState().scripts.find((entry) => entry.id === schedule.scriptId)
  if (!script) return report(schedule.id, 'skipped')

  // Only defaults can fill inputs: nobody is there to type them in.
  const inputValues = getWorkflowInputInitialValues(script.inputs)
  if (getMissingRequiredWorkflowInputs(script.inputs, inputValues).length > 0) {
    return report(schedule.id, 'skipped')
  }

  const projects = useProjectStore.getState()
  const project = schedule.projectId
    ? projects.projects.find((entry) => entry.id === schedule.projectId) ?? null
    : null
  if (schedule.projectId && !project) return report(schedule.id, 'skipped')

  const runner = useWorkflowRunnerStore.getState()
  const terminals = useTerminalStore.getState()

  let sessionId = sessionByScheduleId.get(schedule.id) ?? null
  if (sessionId && !terminals.sessions.some((session) => session.id === sessionId)) sessionId = null

  // Never start over a run that has not finished
  const previousRun = sessionId ? runner.runsBySession[sessionId] : undefined
  if (previousRun && !isTerminalRunStatus(previousRun.status)) return report(schedule.id, 'skipped')

  if (!sessionId) {
    // A scheduled run must not pull the user away from what they are doing, so the new tab
    // opens in the background and the previous selection is restored.
    const before = {
      activeSessionId: terminals.activeSessionId,
      terminalVisible: terminals.terminalVisible
    }
    const envOverrides = project ? buildEnvOverrides(project.envVars ?? []) : undefined
    sessionId = await createProjectTerminalSession(project, terminals.addSession, envOverrides)
    useTerminalStore.setState(before)
    sessionByScheduleId.set(schedule.id, sessionId)
  }

  const run = useWorkflowRunnerStore.getState().startRun({ script, sessionId, inputValues })
  if (!run) return report(schedule.id, 'skipped')
  scheduleIdByRunId.set(run.runId, schedule.id)
}

/** Runs due schedules in this window and records how each run ended. */
export function useScheduledRuns(): void {
  useEffect(() => {
    const unsubscribeDue = window.electronAPI.onScheduleDue((schedule) => {
      void useScheduleStore.getState().refresh()
      void runDueSchedule(schedule).catch((error) => {
        console.error('[terminallyskill] Scheduled run failed to start:', error)
        report(schedule.id, 'failed')
      })
    })

    const unsubscribeRuns = useWorkflowRunnerStore.subscribe((state) => {
      for (const run of Object.values(state.runsBySession)) {
        const scheduleId = scheduleIdByRunId.get(run.runId)
        if (!scheduleId || !isTerminalRunStatus(run.status)) continue
        scheduleIdByRunId.delete(run.runId)
        report(scheduleId, run.status as ScheduleRunStatus)
      }
    })

    return () => {
      unsubscribeDue()
      unsubscribeRuns()
    }
  }, [])
}
