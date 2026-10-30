import {
  registerAppIpcHandlers,
  registerAttentionIpcHandlers,
  registerCommandIpcHandlers,
  registerFileIpcHandlers,
  registerLogIpcHandlers,
  registerPrivacyIpcHandlers,
  registerProjectIpcHandlers,
  registerScheduleIpcHandlers,
  registerScriptIpcHandlers,
  registerSettingsIpcHandlers,
  registerSnippetIpcHandlers,
  registerTerminalIpcHandlers,
  registerVncIpcHandlers
} from './ipc'

export function registerIpcHandlers(): void {
  registerAppIpcHandlers()
  registerTerminalIpcHandlers()
  registerProjectIpcHandlers()
  registerFileIpcHandlers()
  registerScriptIpcHandlers()
  registerSnippetIpcHandlers()
  registerCommandIpcHandlers()
  registerLogIpcHandlers()
  registerSettingsIpcHandlers()
  registerVncIpcHandlers()
  registerAttentionIpcHandlers()
  registerScheduleIpcHandlers()
  registerPrivacyIpcHandlers()
}
