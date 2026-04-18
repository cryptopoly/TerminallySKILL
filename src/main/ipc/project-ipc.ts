import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { ProjectWorkspaceTarget } from '../../shared/project-schema'
import {
  getAllProjects,
  detectProjectStarterPack,
  createProject,
  updateProject,
  deleteProject,
  setActiveProject,
  toggleFavoriteCommand,
  addRecentCommand
} from '../project-manager'
import { testWorkspaceTargetConnection } from '../workspace-target-manager'

export function registerProjectIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PROJECTS_GET_ALL, async () => {
    return getAllProjects()
  })

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_DETECT_STARTER_PACK,
    async (_event, workingDirectory: string) => {
      return detectProjectStarterPack(workingDirectory)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_CREATE,
    async (
      _event,
      name: string,
      workingDirectory: string,
      color?: string,
      workspaceTarget?: ProjectWorkspaceTarget,
      logPreference?: 'inherit' | 'enabled' | 'disabled',
      skipStarterPack?: boolean
    ) => {
      return createProject(
        name,
        workingDirectory,
        color,
        workspaceTarget,
        logPreference,
        skipStarterPack
      )
    }
  )

  ipcMain.handle(IPC_CHANNELS.PROJECTS_UPDATE, async (_event, id: string, updates: object) => {
    return updateProject(id, updates)
  })

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_TEST_WORKSPACE_TARGET,
    async (_event, workspaceTarget: ProjectWorkspaceTarget) => {
      return testWorkspaceTargetConnection(workspaceTarget)
    }
  )

  ipcMain.handle(IPC_CHANNELS.PROJECTS_DELETE, async (_event, id: string) => {
    return deleteProject(id)
  })

  ipcMain.handle(IPC_CHANNELS.PROJECTS_SET_ACTIVE, async (_event, id: string) => {
    return setActiveProject(id)
  })

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_TOGGLE_FAVORITE,
    async (_event, projectId: string, commandId: string) => {
      return toggleFavoriteCommand(projectId, commandId)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_ADD_RECENT,
    async (_event, projectId: string, commandId: string, commandString: string) => {
      return addRecentCommand(projectId, commandId, commandString)
    }
  )
}
