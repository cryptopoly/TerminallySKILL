import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import {
  getAllSnippets,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  duplicateSnippet,
  markSnippetRun
} from '../snippet-manager'

export function registerSnippetIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SNIPPETS_GET_ALL, async () => {
    return getAllSnippets()
  })

  ipcMain.handle(
    IPC_CHANNELS.SNIPPETS_CREATE,
    async (_event, name: string, template: string, projectId: string | null, description?: string) => {
      return createSnippet(name, template, projectId, description)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SNIPPETS_UPDATE,
    async (_event, id: string, updates: Record<string, unknown>) => {
      return updateSnippet(id, updates)
    }
  )

  ipcMain.handle(IPC_CHANNELS.SNIPPETS_DELETE, async (_event, id: string) => {
    return deleteSnippet(id)
  })

  ipcMain.handle(IPC_CHANNELS.SNIPPETS_DUPLICATE, async (_event, id: string) => {
    return duplicateSnippet(id)
  })

  ipcMain.handle(IPC_CHANNELS.SNIPPETS_MARK_RUN, async (_event, id: string) => {
    return markSnippetRun(id)
  })
}
