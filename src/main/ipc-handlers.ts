import {
  registerAppIpcHandlers,
  registerCommandIpcHandlers,
  registerFileIpcHandlers,
  registerLogIpcHandlers,
  registerProjectIpcHandlers,
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
}
