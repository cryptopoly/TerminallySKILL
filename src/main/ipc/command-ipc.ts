import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { CommandDefinition, DiscoveredCommand } from '../../shared/command-schema'
import { loadAllCommands } from '../command-loader'
import {
  detectNewCommands,
  findCommand,
  addDirToShellPath,
  getShellConfigPath
} from '../command-detector'
import { parseHelpOutput } from '../help-parser'
import { searchInstallableCommands } from '../cli-install-manager'
import {
  addDiscoveredCommands,
  addManualCommand,
  removeDiscoveredCommand,
  resetCommandTrees,
  saveEnrichedCommand,
  saveEnrichedBulk
} from '../discovered-command-manager'

export function registerCommandIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.COMMANDS_LOAD_ALL, async () => {
    return loadAllCommands()
  })

  ipcMain.handle(
    IPC_CHANNELS.COMMANDS_SCAN_PATH,
    async (_event, knownExecutables: string[]) => {
      const known = new Set(knownExecutables)
      return detectNewCommands(known)
    }
  )

  ipcMain.handle(IPC_CHANNELS.COMMANDS_PARSE_HELP, async (_event, executable: string) => {
    return parseHelpOutput(executable)
  })

  ipcMain.handle(
    IPC_CHANNELS.COMMANDS_ADD_MANUAL,
    async (_event, executable: string, category?: string) => {
      return addManualCommand(executable, category)
    }
  )

  ipcMain.handle(IPC_CHANNELS.COMMANDS_REMOVE_DISCOVERED, async (_event, executable: string) => {
    return removeDiscoveredCommand(executable)
  })

  ipcMain.handle(IPC_CHANNELS.COMMANDS_RESET_TREES, async () => {
    return resetCommandTrees()
  })

  ipcMain.handle(
    IPC_CHANNELS.COMMANDS_SAVE_DISCOVERED,
    async (_event, commands: DiscoveredCommand[]) => {
      return addDiscoveredCommands(commands)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.COMMANDS_SAVE_ENRICHED,
    async (_event, executable: string, definition: CommandDefinition) => {
      return saveEnrichedCommand(executable, definition)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.COMMANDS_SAVE_ENRICHED_BULK,
    async (_event, executable: string, definitions: CommandDefinition[]) => {
      return saveEnrichedBulk(executable, definitions)
    }
  )

  ipcMain.handle(IPC_CHANNELS.COMMANDS_FIND_COMMAND, async (_event, executable: string) => {
    return findCommand(executable)
  })

  ipcMain.handle(IPC_CHANNELS.COMMANDS_SEARCH_INSTALLABLE, async (_event, query: string, limit?: number) => {
    return searchInstallableCommands(query, limit)
  })

  ipcMain.handle(IPC_CHANNELS.COMMANDS_FIX_PATH, async (_event, dir: string) => {
    return addDirToShellPath(dir)
  })

  ipcMain.handle(IPC_CHANNELS.COMMANDS_GET_SHELL_CONFIG, async () => {
    return getShellConfigPath()
  })
}
