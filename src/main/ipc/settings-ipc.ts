import { ipcMain } from 'electron'
import type { AIProvider } from '../../shared/settings-schema'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { runAIAction } from '../ai-manager'
import {
  getSettings,
  updateSettings,
  updateProvider,
  testAIConnection,
  listAIModels
} from '../settings-manager'
import { requireAIActionRequest, requirePlainObject, requireString } from './validation'

export function registerSettingsIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_event, updates: object) => {
    return updateSettings(requirePlainObject(updates, 'updates'))
  })

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPDATE_PROVIDER,
    async (_event, providerId: string, updates: Partial<AIProvider>) => {
      return updateProvider(
        requireString(providerId, 'providerId'),
        requirePlainObject(updates, 'updates') as Partial<AIProvider>
      )
    }
  )

  ipcMain.handle(IPC_CHANNELS.SETTINGS_TEST_AI, async (_event, providerId: string) => {
    return testAIConnection(requireString(providerId, 'providerId'))
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_LIST_AI_MODELS, async (_event, providerId: string) => {
    return listAIModels(requireString(providerId, 'providerId'))
  })

  ipcMain.handle(IPC_CHANNELS.AI_RUN_ACTION, async (_event, request) => {
    return runAIAction(requireAIActionRequest(request, 'request'))
  })
}
