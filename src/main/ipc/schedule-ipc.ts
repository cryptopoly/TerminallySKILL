import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { ScheduleRunStatus } from '../../shared/schedule-schema'
import {
  deleteSchedule,
  getAllSchedules,
  markScheduleResult,
  saveSchedule
} from '../schedule-manager'
import { requirePlainObject, requireString } from './validation'

const RUN_STATUSES: ScheduleRunStatus[] = ['completed', 'failed', 'cancelled', 'skipped']

export function registerScheduleIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SCHEDULES_GET_ALL, async () => getAllSchedules())

  ipcMain.handle(IPC_CHANNELS.SCHEDULES_SAVE, async (_event, input: unknown) => {
    const plain = requirePlainObject(input, 'schedule')
    return saveSchedule({
      id: typeof plain.id === 'string' ? plain.id : undefined,
      scriptId: requireString(plain.scriptId, 'scriptId'),
      projectId: typeof plain.projectId === 'string' ? plain.projectId : null,
      recurrence: plain.recurrence,
      enabled: plain.enabled !== false
    })
  })

  ipcMain.handle(IPC_CHANNELS.SCHEDULES_DELETE, async (_event, id: string) => {
    await deleteSchedule(requireString(id, 'id'))
  })

  ipcMain.handle(IPC_CHANNELS.SCHEDULES_MARK_RESULT, async (_event, id: string, status: string) => {
    if (!RUN_STATUSES.includes(status as ScheduleRunStatus)) return
    await markScheduleResult(requireString(id, 'id'), status as ScheduleRunStatus)
  })
}
