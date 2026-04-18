import { ipcMain, BrowserWindow, dialog } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { getTVFlowName, isTVFlowFile, type TVFlowFile } from '../../shared/tvflow-schema'
import {
  getAllScripts,
  getScriptsByProject,
  createScript,
  updateScript,
  deleteScript,
  addStepToScript,
  addApprovalStepToScript,
  addNoteStepToScript,
  removeStepFromScript,
  reorderScriptSteps,
  markScriptRun,
  duplicateScript,
  cloneScriptToProject,
  exportScript,
  importScript
} from '../script-manager'

export function registerScriptIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SCRIPTS_GET_ALL, async () => {
    return getAllScripts()
  })

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_GET_BY_PROJECT, async (_event, projectId: string | null) => {
    return getScriptsByProject(projectId)
  })

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_CREATE,
    async (_event, name: string, projectId: string | null, description?: string) => {
      return createScript(name, projectId, description)
    }
  )

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_UPDATE, async (_event, id: string, updates: object) => {
    return updateScript(id, updates)
  })

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_DELETE, async (_event, id: string) => {
    return deleteScript(id)
  })

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_ADD_STEP,
    async (
      _event,
      scriptId: string,
      commandString: string,
      commandId: string | null,
      label?: string
    ) => {
      return addStepToScript(scriptId, commandString, commandId, label)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_ADD_APPROVAL_STEP,
    async (_event, scriptId: string, message: string, label?: string) => {
      return addApprovalStepToScript(scriptId, message, label)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_ADD_NOTE_STEP,
    async (_event, scriptId: string, content: string, label?: string) => {
      return addNoteStepToScript(scriptId, content, label)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_REMOVE_STEP,
    async (_event, scriptId: string, stepId: string) => {
      return removeStepFromScript(scriptId, stepId)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_REORDER_STEPS,
    async (_event, scriptId: string, stepIds: string[]) => {
      return reorderScriptSteps(scriptId, stepIds)
    }
  )

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_MARK_RUN, async (_event, scriptId: string) => {
    return markScriptRun(scriptId)
  })

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_DUPLICATE, async (_event, scriptId: string) => {
    return duplicateScript(scriptId)
  })

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_CLONE_TO_PROJECT,
    async (_event, scriptId: string, projectId: string) => {
      return cloneScriptToProject(scriptId, projectId)
    }
  )

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_EXPORT, async (event, scriptId: string) => {
    const flow = await exportScript(scriptId)
    if (!flow) return false
    const win = BrowserWindow.fromWebContents(event.sender)!
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      defaultPath: `${getTVFlowName(flow).replace(/[^a-zA-Z0-9_-]/g, '_')}.tvflow`,
      filters: [{ name: 'TerminallySKILL Flow', extensions: ['tvflow'] }]
    })
    if (canceled || !filePath) return false
    const { writeFile } = await import('fs/promises')
    await writeFile(filePath, JSON.stringify(flow, null, 2), 'utf-8')
    return true
  })

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_IMPORT,
    async (event, projectId: string | null) => {
      const win = BrowserWindow.fromWebContents(event.sender)!
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        filters: [{ name: 'TerminallySKILL Flow', extensions: ['tvflow'] }],
        properties: ['openFile']
      })
      if (canceled || filePaths.length === 0) return null
      const { readFile } = await import('fs/promises')
      const raw = await readFile(filePaths[0], 'utf-8')
      const data = JSON.parse(raw) as unknown
      if (!isTVFlowFile(data)) {
        throw new Error('Invalid .tvflow file format')
      }
      return importScript(data as TVFlowFile, projectId)
    }
  )
}
