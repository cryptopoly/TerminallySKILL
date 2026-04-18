import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { getRunIndex, searchRuns, upsertRunRecord } from '../run-manager'
import {
  saveSessionLog,
  getLogIndex,
  getLogsByProject,
  readLogContent,
  searchLogs,
  deleteLog,
  getLogBasePath
} from '../log-manager'

export function registerLogIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.LOGS_SAVE_SESSION, async (_event, params) => {
    console.log(`[log-save] IPC received: sessionId=${params?.sessionId}, contentLen=${params?.content?.length}`)
    return saveSessionLog(params)
  })

  ipcMain.handle(IPC_CHANNELS.LOGS_GET_INDEX, async (_event, projectId: string | null) => {
    return getLogIndex(projectId)
  })

  ipcMain.handle(IPC_CHANNELS.LOGS_GET_BY_PROJECT, async (_event, projectId: string) => {
    return getLogsByProject(projectId)
  })

  ipcMain.handle(IPC_CHANNELS.LOGS_READ_CONTENT, async (_event, logFilePath: string) => {
    return readLogContent(logFilePath)
  })

  ipcMain.handle(
    IPC_CHANNELS.LOGS_SEARCH,
    async (_event, projectId: string | null, query: string) => {
      return searchLogs(projectId, query)
    }
  )

  ipcMain.handle(IPC_CHANNELS.LOGS_DELETE, async (_event, logFilePath: string) => {
    return deleteLog(logFilePath)
  })

  ipcMain.handle(IPC_CHANNELS.LOGS_GET_BASE_PATH, async (_event, projectId: string | null) => {
    return getLogBasePath(projectId)
  })

  ipcMain.handle(IPC_CHANNELS.RUNS_GET_INDEX, async (_event, projectId: string | null) => {
    return getRunIndex(projectId)
  })

  ipcMain.handle(
    IPC_CHANNELS.RUNS_SEARCH,
    async (_event, projectId: string | null, query: string, statusFilter?: string) => {
      return searchRuns(projectId, query, statusFilter as Parameters<typeof searchRuns>[2])
    }
  )

  ipcMain.handle(IPC_CHANNELS.RUNS_UPSERT, async (_event, run) => {
    return upsertRunRecord(run)
  })
}
