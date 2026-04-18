import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type { CommandDefinition, DiscoveredCommand, ParsedHelpResult } from '../shared/command-schema'
import type {
  Project,
  ProjectsData,
  ProjectWorkspaceTarget,
  SSHProjectWorkspaceTarget,
  WorkspaceTargetConnectionResult
} from '../shared/project-schema'
import type { Script } from '../shared/script-schema'
import type { SessionLogMeta, LogSearchResult } from '../shared/log-schema'
import type { AppSettings, AIProvider } from '../shared/settings-schema'
import type { Snippet } from '../shared/snippet-schema'
import type { AIActionRequest, AIActionResponse } from '../shared/ai-schema'
import type { StarterPackPreview } from '../shared/starter-pack-schema'
import type { RunRecord, TerminalSessionInfo } from '../shared/run-schema'
import type { WorkflowStepResultEvent } from '../shared/workflow-shell'
import type { RunStatusFilter } from '../shared/run-history'
import type { ShellIntegrationEvent } from '../shared/shell-integration'
import type { AppUpdateCheckResult, AppUpdateInstallResult } from '../shared/update-schema'
import type { InstallableCommandMatch } from '../shared/cli-install-catalog'
import type { BackupLocationSuggestion, BackupRunResult } from '../shared/backup-schema'

export const electronAPI = {
  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),

  checkForAppUpdate: (): Promise<AppUpdateCheckResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_CHECK_UPDATES),

  downloadAndOpenAppUpdate: (): Promise<AppUpdateInstallResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_DOWNLOAD_UPDATE),

  getDefaultICloudBackupDirectory: (): Promise<BackupLocationSuggestion> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_GET_DEFAULT_ICLOUD_BACKUP_DIR),

  createAppDataBackup: (targetDirectory: string): Promise<BackupRunResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_CREATE_BACKUP, targetDirectory),

  openNewWindow: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_NEW_WINDOW),

  openProjectInNewWindow: (projectId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_NEW_WINDOW_PROJECT, projectId),

  getDataDirectoryInfo: (): Promise<{ currentPath: string; defaultPath: string; isCustom: boolean }> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_GET_DATA_DIR_INFO),

  moveDataDirectory: (targetDirectory: string): Promise<{ success: boolean; path: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_MOVE_DATA_DIR, targetDirectory),

  resetDataDirectory: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_RESET_DATA_DIR),

  loadAllCommands: (): Promise<CommandDefinition[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_LOAD_ALL),

  createTerminal: (
    cwd?: string,
    projectId?: string,
    projectName?: string,
    projectWorkingDir?: string,
    envOverrides?: Record<string, string>
  ): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.PTY_CREATE, cwd, projectId, projectName, projectWorkingDir, envOverrides),

  writeToTerminal: (sessionId: string, data: string): void => {
    ipcRenderer.send(IPC_CHANNELS.PTY_WRITE, sessionId, data)
  },

  resizeTerminal: (sessionId: string, cols: number, rows: number): void => {
    ipcRenderer.send(IPC_CHANNELS.PTY_RESIZE, sessionId, cols, rows)
  },

  killTerminal: (sessionId: string): void => {
    ipcRenderer.send(IPC_CHANNELS.PTY_KILL, sessionId)
  },

  onTerminalData: (callback: (sessionId: string, data: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, sessionId: string, data: string): void =>
      callback(sessionId, data)
    ipcRenderer.on(IPC_CHANNELS.PTY_DATA, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.PTY_DATA, handler)
  },

  onTerminalExit: (
    callback: (
      sessionId: string,
      exitCode: number,
      meta: { cwd: string; startedAt: string } | null
    ) => void
  ): (() => void) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      sessionId: string,
      exitCode: number,
      meta: { cwd: string; startedAt: string } | null
    ): void => callback(sessionId, exitCode, meta)
    ipcRenderer.on(IPC_CHANNELS.PTY_EXIT, handler)
    // Return unsubscribe function for cleanup
    return () => ipcRenderer.removeListener(IPC_CHANNELS.PTY_EXIT, handler)
  },

  onWorkflowStepResult: (
    callback: (sessionId: string, result: WorkflowStepResultEvent) => void
  ): (() => void) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      sessionId: string,
      result: WorkflowStepResultEvent
    ): void => callback(sessionId, result)
    ipcRenderer.on(IPC_CHANNELS.WORKFLOW_STEP_RESULT, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.WORKFLOW_STEP_RESULT, handler)
  },

  openFileDialog: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE),

  openDirectoryDialog: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY),

  writeClipboard: (text: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_WRITE, text),

  getDefaultShell: (): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.SHELL_GET_DEFAULT),

  // Projects
  getAllProjects: (): Promise<ProjectsData> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_GET_ALL),

  detectStarterPack: (workingDirectory: string): Promise<StarterPackPreview> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_DETECT_STARTER_PACK, workingDirectory),

  createProject: (
    name: string,
    workingDirectory: string,
    color?: string,
    workspaceTarget?: ProjectWorkspaceTarget,
    logPreference?: 'inherit' | 'enabled' | 'disabled',
    skipStarterPack?: boolean
  ): Promise<Project> =>
    ipcRenderer.invoke(
      IPC_CHANNELS.PROJECTS_CREATE,
      name,
      workingDirectory,
      color,
      workspaceTarget,
      logPreference,
      skipStarterPack
    ),

  updateProject: (id: string, updates: Partial<Project>): Promise<Project | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_UPDATE, id, updates),

  testWorkspaceTarget: (
    workspaceTarget: ProjectWorkspaceTarget
  ): Promise<WorkspaceTargetConnectionResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_TEST_WORKSPACE_TARGET, workspaceTarget),

  deleteProject: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_DELETE, id),

  setActiveProject: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_SET_ACTIVE, id),

  toggleFavoriteCommand: (projectId: string, commandId: string): Promise<string[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_TOGGLE_FAVORITE, projectId, commandId),

  addRecentCommand: (projectId: string, commandId: string, commandString: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_ADD_RECENT, projectId, commandId, commandString),

  // File browser
  listDirectory: (
    dirPath: string,
    includeHidden?: boolean
  ): Promise<{ name: string; isDirectory: boolean; size: number; modified: string }[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILES_LIST_DIR, dirPath, includeHidden),

  createFile: (
    filePath: string
  ): Promise<{ success: boolean } | { error: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILES_CREATE_FILE, filePath),

  getFileMetadata: (
    filePath: string
  ): Promise<{ size: number; modifiedAt: number } | { error: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILES_GET_METADATA, filePath),

  readFileContent: (
    filePath: string
  ): Promise<
    | { content: string; truncated: boolean; size: number; modifiedAt: number }
    | { tooLarge: true; size: number; modifiedAt: number }
    | { error: string }
  > =>
    ipcRenderer.invoke(IPC_CHANNELS.FILES_READ_CONTENT, filePath),

  readScopedFileContent: (
    filePath: string
  ): Promise<
    | { content: string; truncated: boolean; size: number; modifiedAt: number }
    | { tooLarge: true; size: number; modifiedAt: number }
    | { error: string }
  > =>
    ipcRenderer.invoke(IPC_CHANNELS.FILES_READ_SCOPED_CONTENT, filePath),

  readApprovedFileContent: (
    filePath: string
  ): Promise<
    | { content: string; truncated: boolean; size: number; modifiedAt: number }
    | { tooLarge: true; size: number; modifiedAt: number }
    | { error: string }
  > =>
    ipcRenderer.invoke(IPC_CHANNELS.FILES_READ_APPROVED_CONTENT, filePath),

  writeFileContent: (
    filePath: string,
    content: string
  ): Promise<{ success: boolean; size: number; modifiedAt: number } | { error: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILES_WRITE_CONTENT, filePath, content),

  openInExplorer: (dirPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILES_OPEN_IN_EXPLORER, dirPath),

  revealInExplorer: (filePath: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILES_REVEAL_IN_EXPLORER, filePath),

  checkIsExecutable: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILES_CHECK_EXECUTABLE, filePath),

  searchFiles: (
    rootDir: string,
    query: string,
    options?: { caseSensitive?: boolean; regex?: boolean; glob?: string }
  ): Promise<{
    results: Array<{ filePath: string; matches: Array<{ lineNumber: number; lineText: string }> }>
    error?: string
    usedRipgrep: boolean
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILES_SEARCH, rootDir, query, options ?? {}),

  // Scripts
  getAllScripts: (): Promise<Script[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_GET_ALL),

  getScriptsByProject: (projectId: string | null): Promise<Script[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_GET_BY_PROJECT, projectId),

  createScript: (name: string, projectId: string | null, description?: string): Promise<Script> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_CREATE, name, projectId, description),

  updateScript: (id: string, updates: Partial<Script>): Promise<Script | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_UPDATE, id, updates),

  deleteScript: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_DELETE, id),

  addStepToScript: (
    scriptId: string,
    commandString: string,
    commandId: string | null,
    label?: string
  ): Promise<Script | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_ADD_STEP, scriptId, commandString, commandId, label),

  addApprovalStepToScript: (
    scriptId: string,
    message: string,
    label?: string
  ): Promise<Script | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_ADD_APPROVAL_STEP, scriptId, message, label),

  addNoteStepToScript: (
    scriptId: string,
    content: string,
    label?: string
  ): Promise<Script | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_ADD_NOTE_STEP, scriptId, content, label),

  removeStepFromScript: (scriptId: string, stepId: string): Promise<Script | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_REMOVE_STEP, scriptId, stepId),

  reorderScriptSteps: (scriptId: string, stepIds: string[]): Promise<Script | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_REORDER_STEPS, scriptId, stepIds),

  markScriptRun: (scriptId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_MARK_RUN, scriptId),

  duplicateScript: (scriptId: string): Promise<Script | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_DUPLICATE, scriptId),

  cloneScriptToProject: (scriptId: string, projectId: string): Promise<Script | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_CLONE_TO_PROJECT, scriptId, projectId),

  exportScript: (scriptId: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_EXPORT, scriptId),

  importScript: (projectId: string | null): Promise<Script | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_IMPORT, projectId),

  // Command detection
  scanPathForCommands: (knownExecutables: string[]): Promise<DiscoveredCommand[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_SCAN_PATH, knownExecutables),

  parseHelp: (executable: string): Promise<ParsedHelpResult | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_PARSE_HELP, executable),

  addManualCommand: (executable: string, category?: string): Promise<DiscoveredCommand> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_ADD_MANUAL, executable, category),

  removeDiscoveredCommand: (executable: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_REMOVE_DISCOVERED, executable),

  resetCommandTrees: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_RESET_TREES),

  saveDiscoveredCommands: (commands: DiscoveredCommand[]): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_SAVE_DISCOVERED, commands),

  saveEnrichedCommand: (executable: string, definition: CommandDefinition): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_SAVE_ENRICHED, executable, definition),

  saveEnrichedBulk: (executable: string, definitions: CommandDefinition[]): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_SAVE_ENRICHED_BULK, executable, definitions),

  // PATH fix
  findCommand: (executable: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_FIND_COMMAND, executable),

  searchInstallableCommands: (query: string, limit = 12): Promise<InstallableCommandMatch[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_SEARCH_INSTALLABLE, query, limit),

  fixPath: (dir: string): Promise<{ success: boolean; configFile: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_FIX_PATH, dir),

  getShellConfigPath: (): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_GET_SHELL_CONFIG),

  // Terminal logs
  saveSessionLog: (params: {
    sessionId: string
    projectId: string | null
    projectName: string | null
    projectWorkingDir: string | null
    shell: string
    cwd: string
    startedAt: string
    exitCode: number | null
    content: string
  }): Promise<SessionLogMeta> =>
    ipcRenderer.invoke(IPC_CHANNELS.LOGS_SAVE_SESSION, params),

  getLogIndex: (projectId: string | null): Promise<SessionLogMeta[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.LOGS_GET_INDEX, projectId),

  getLogsByProject: (projectId: string): Promise<SessionLogMeta[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.LOGS_GET_BY_PROJECT, projectId),

  readLogContent: (logFilePath: string): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.LOGS_READ_CONTENT, logFilePath),

  searchLogs: (
    projectId: string | null,
    query: string
  ): Promise<LogSearchResult[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.LOGS_SEARCH, projectId, query),

  deleteLog: (logFilePath: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.LOGS_DELETE, logFilePath),

  getLogBasePath: (projectId: string | null): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.LOGS_GET_BASE_PATH, projectId),

  getRunIndex: (projectId: string | null): Promise<RunRecord[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.RUNS_GET_INDEX, projectId),

  searchRuns: (
    projectId: string | null,
    query: string,
    statusFilter?: RunStatusFilter
  ): Promise<RunRecord[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.RUNS_SEARCH, projectId, query, statusFilter),

  upsertRunRecord: (run: RunRecord): Promise<RunRecord> =>
    ipcRenderer.invoke(IPC_CHANNELS.RUNS_UPSERT, run),

  getSessionInfo: (sessionId: string): Promise<TerminalSessionInfo | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.PTY_GET_SESSION_INFO, sessionId),

  // Shell integration
  onShellReady: (callback: (sessionId: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, sessionId: string): void =>
      callback(sessionId)
    ipcRenderer.on(IPC_CHANNELS.SHELL_READY, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SHELL_READY, handler)
  },

  onShellEvent: (
    callback: (sessionId: string, event: ShellIntegrationEvent) => void
  ): (() => void) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      sessionId: string,
      event: ShellIntegrationEvent
    ): void => callback(sessionId, event)
    ipcRenderer.on(IPC_CHANNELS.SHELL_EVENT, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SHELL_EVENT, handler)
  },

  // Settings
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),

  updateSettings: (updates: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, updates),

  updateProvider: (providerId: string, updates: Partial<AIProvider>): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE_PROVIDER, providerId, updates),

  testAIConnection: (providerId: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_TEST_AI, providerId),

  listAIModels: (
    providerId: string
  ): Promise<{ success: boolean; models: string[]; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_LIST_AI_MODELS, providerId),

  runAIAction: (request: AIActionRequest): Promise<AIActionResponse> =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_RUN_ACTION, request),

  // Snippets
  getAllSnippets: (): Promise<Snippet[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.SNIPPETS_GET_ALL),

  createSnippet: (
    name: string,
    template: string,
    projectId: string | null,
    description?: string
  ): Promise<Snippet> =>
    ipcRenderer.invoke(IPC_CHANNELS.SNIPPETS_CREATE, name, template, projectId, description),

  updateSnippet: (id: string, updates: Partial<Snippet>): Promise<Snippet | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SNIPPETS_UPDATE, id, updates),

  deleteSnippet: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SNIPPETS_DELETE, id),

  duplicateSnippet: (id: string): Promise<Snippet | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SNIPPETS_DUPLICATE, id),

  markSnippetRun: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SNIPPETS_MARK_RUN, id),

  // Shell utilities
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, url),

  // VNC
  startVncSession: (
    target: SSHProjectWorkspaceTarget,
    vncPort: number
  ): Promise<{ sessionId: string; wsPort: number; token: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.VNC_START, target, vncPort),

  stopVncSession: (sessionId: string): void => {
    ipcRenderer.send(IPC_CHANNELS.VNC_STOP, sessionId)
  },

  onVncError: (callback: (sessionId: string, message: string) => void): (() => void) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      sessionId: string,
      message: string
    ): void => callback(sessionId, message)
    ipcRenderer.on(IPC_CHANNELS.VNC_ERROR, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.VNC_ERROR, handler)
  },

  getVncPassword: (storageKey: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.VNC_GET_PASSWORD, storageKey),

  saveVncPassword: (storageKey: string, password: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.VNC_SAVE_PASSWORD, storageKey, password),

  deleteVncPassword: (storageKey: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.VNC_DELETE_PASSWORD, storageKey)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
