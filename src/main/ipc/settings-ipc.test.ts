import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

const electronMocks = vi.hoisted(() => {
  const handles = new Map<string, (...args: any[]) => any>()
  return {
    handles,
    handle: vi.fn((channel: string, handler: (...args: any[]) => any) => {
      handles.set(channel, handler)
    }),
    reset: () => {
      handles.clear()
    }
  }
})

const settingsManagerMocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  updateProvider: vi.fn(),
  testAIConnection: vi.fn(),
  listAIModels: vi.fn()
}))

const aiManagerMocks = vi.hoisted(() => ({
  runAIAction: vi.fn()
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: electronMocks.handle
  }
}))

vi.mock('../settings-manager', () => ({
  getSettings: settingsManagerMocks.getSettings,
  updateSettings: settingsManagerMocks.updateSettings,
  updateProvider: settingsManagerMocks.updateProvider,
  testAIConnection: settingsManagerMocks.testAIConnection,
  listAIModels: settingsManagerMocks.listAIModels
}))

vi.mock('../ai-manager', () => ({
  runAIAction: aiManagerMocks.runAIAction
}))

import { registerSettingsIpcHandlers } from './settings-ipc'

describe('settings-ipc', () => {
  beforeEach(() => {
    electronMocks.reset()
    vi.clearAllMocks()
    registerSettingsIpcHandlers()
  })

  it('returns settings from the settings manager', async () => {
    const settings = { activeAIProvider: 'openai', aiProviders: [] }
    settingsManagerMocks.getSettings.mockResolvedValue(settings)

    const handler = electronMocks.handles.get(IPC_CHANNELS.SETTINGS_GET)
    await expect(handler?.({})).resolves.toBe(settings)
    expect(settingsManagerMocks.getSettings).toHaveBeenCalledTimes(1)
  })

  it('forwards provider updates without altering the payload', async () => {
    const updatedSettings = { aiProviders: [{ id: 'openai', model: 'gpt-4o' }] }
    settingsManagerMocks.updateProvider.mockResolvedValue(updatedSettings)
    const updates = { model: 'gpt-4o', apiKey: 'secret' }

    const handler = electronMocks.handles.get(IPC_CHANNELS.SETTINGS_UPDATE_PROVIDER)
    await expect(handler?.({}, 'openai', updates)).resolves.toBe(updatedSettings)
    expect(settingsManagerMocks.updateProvider).toHaveBeenCalledWith('openai', updates)
  })

  it('forwards ai actions to the ai manager unchanged', async () => {
    const request = {
      action: 'command-review',
      commandName: 'rm',
      commandString: 'rm -rf /'
    }
    const response = { success: true, content: 'safe enough' }
    aiManagerMocks.runAIAction.mockResolvedValue(response)

    const handler = electronMocks.handles.get(IPC_CHANNELS.AI_RUN_ACTION)
    await expect(handler?.({}, request)).resolves.toBe(response)
    expect(aiManagerMocks.runAIAction).toHaveBeenCalledWith(request)
  })

  it('rejects ai actions with an unknown action type', async () => {
    const handler = electronMocks.handles.get(IPC_CHANNELS.AI_RUN_ACTION)

    await expect(handler?.({}, { action: 'review-command' })).rejects.toThrow(
      /Invalid request\.action/
    )
    expect(aiManagerMocks.runAIAction).not.toHaveBeenCalled()
  })

  it('rejects malformed provider updates at the ipc boundary', async () => {
    const handler = electronMocks.handles.get(IPC_CHANNELS.SETTINGS_UPDATE_PROVIDER)

    await expect(handler?.({}, 123, { model: 'gpt-4o' })).rejects.toThrow(
      'Invalid providerId: expected string'
    )
  })
})
