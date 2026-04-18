import { create } from 'zustand'

export type FileReadAccess = 'scoped' | 'permissive'
export type FileOpenSource =
  | 'project-browser'
  | 'project-restore'
  | 'find-in-files'
  | 'created-file'
  | 'terminal-link'
  | 'unknown'

export interface ActiveFile {
  path: string
  name: string
  content: string
  truncated: boolean
  tooLarge: boolean
  size: number
  modifiedAt?: number
  readAccess?: FileReadAccess
  source?: FileOpenSource
}

export interface FileTab extends ActiveFile {
  draftContent: string
  editMode: boolean
  dirty: boolean
  externalModified: boolean
  readAccess: FileReadAccess
  source: FileOpenSource
}

function getDefaultEditMode(file: ActiveFile): boolean {
  return !file.truncated && !file.tooLarge
}

function resolveFileReadAccess(file: ActiveFile): FileReadAccess {
  return file.readAccess ?? 'permissive'
}

function resolveFileOpenSource(file: ActiveFile): FileOpenSource {
  return file.source ?? 'unknown'
}

function createFileTab(file: ActiveFile): FileTab {
  return {
    ...file,
    readAccess: resolveFileReadAccess(file),
    source: resolveFileOpenSource(file),
    draftContent: file.content,
    editMode: getDefaultEditMode(file),
    dirty: false,
    externalModified: false
  }
}

function deriveActiveFile(openFiles: FileTab[], activeFilePath: string | null): FileTab | null {
  if (!activeFilePath) return null
  return openFiles.find((file) => file.path === activeFilePath) ?? null
}

interface FileStore {
  openFiles: FileTab[]
  activeFilePath: string | null
  activeFile: FileTab | null
  fileViewerVisible: boolean
  /** Pending line to scroll to after a file is opened from search results. Cleared after use. */
  pendingJumpLine: number | null
  setPendingJumpLine: (line: number | null) => void
  /** Incremented to signal FileViewer to close the active tab (with dirty-check dialog). */
  closeActiveFileRequest: number
  requestCloseActiveFile: () => void
  hydrateFiles: (files: ActiveFile[], activeFilePath: string | null, visible?: boolean) => void
  clearFiles: () => void
  setActiveFile: (file: ActiveFile | null) => void
  setActiveFilePath: (path: string | null) => void
  closeFile: (path: string) => void
  updateFileDraft: (content: string) => void
  updateFileContent: (content: string) => void
  saveFileContent: (path: string, content: string, size?: number, modifiedAt?: number) => void
  setFileEditMode: (path: string, editMode: boolean) => void
  refreshFileFromDisk: (file: ActiveFile) => void
  markExternalFileChange: (path: string, modifiedAt?: number, size?: number) => void
  clearExternalFileChange: (path: string) => void
  setFileViewerVisible: (visible: boolean) => void
}

export const useFileStore = create<FileStore>((set) => ({
  openFiles: [],
  activeFilePath: null,
  activeFile: null,
  fileViewerVisible: false,
  pendingJumpLine: null,
  setPendingJumpLine: (line) => set({ pendingJumpLine: line }),
  closeActiveFileRequest: 0,
  requestCloseActiveFile: () => set((state) => ({ closeActiveFileRequest: state.closeActiveFileRequest + 1 })),
  hydrateFiles: (files, activeFilePath, visible = false) =>
    set(() => {
      const nextOpenFiles: FileTab[] = files.map((file) => createFileTab(file))
      const nextActiveFilePath =
        activeFilePath && nextOpenFiles.some((file) => file.path === activeFilePath)
          ? activeFilePath
          : nextOpenFiles[0]?.path ?? null

      return {
        openFiles: nextOpenFiles,
        activeFilePath: nextActiveFilePath,
        activeFile: deriveActiveFile(nextOpenFiles, nextActiveFilePath),
        fileViewerVisible: visible && nextOpenFiles.length > 0
      }
    }),
  clearFiles: () =>
    set({
      openFiles: [],
      activeFilePath: null,
      activeFile: null,
      fileViewerVisible: false
    }),
  setActiveFile: (file) =>
    set((state) => {
      if (!file) {
        const nextOpenFiles = state.activeFilePath
          ? state.openFiles.filter((openFile) => openFile.path !== state.activeFilePath)
          : state.openFiles
        const currentIndex = state.activeFilePath
          ? state.openFiles.findIndex((openFile) => openFile.path === state.activeFilePath)
          : -1
        const nextActiveFilePath =
          nextOpenFiles.length === 0
            ? null
            : nextOpenFiles[Math.max(0, currentIndex - 1)]?.path ?? nextOpenFiles[0]?.path ?? null

        return {
          openFiles: nextOpenFiles,
          activeFilePath: nextActiveFilePath,
          activeFile: deriveActiveFile(nextOpenFiles, nextActiveFilePath),
          fileViewerVisible: nextOpenFiles.length > 0 ? state.fileViewerVisible : false
        }
      }

      const existingIndex = state.openFiles.findIndex((openFile) => openFile.path === file.path)
      if (existingIndex !== -1) {
        const existingFile = state.openFiles[existingIndex]
        const nextFile: FileTab = existingFile.dirty
          ? {
              ...existingFile,
              name: file.name,
              truncated: file.truncated,
              tooLarge: file.tooLarge,
              size: file.size,
              modifiedAt: file.modifiedAt,
              readAccess: file.readAccess ?? existingFile.readAccess,
              source: file.source ?? existingFile.source
            }
          : createFileTab(file)

        const nextOpenFiles = state.openFiles.map((openFile, index) =>
          index === existingIndex ? nextFile : openFile
        )

        return {
          openFiles: nextOpenFiles,
          activeFilePath: file.path,
          activeFile: deriveActiveFile(nextOpenFiles, file.path),
          fileViewerVisible: true
        }
      }

      const nextFile = createFileTab(file)
      const nextOpenFiles = [...state.openFiles, nextFile]

      return {
        openFiles: nextOpenFiles,
        activeFilePath: file.path,
        activeFile: nextFile,
        fileViewerVisible: true
      }
    }),
  setActiveFilePath: (path) =>
    set((state) => ({
      activeFilePath: path,
      activeFile: deriveActiveFile(state.openFiles, path),
      fileViewerVisible: path ? true : state.fileViewerVisible
    })),
  closeFile: (path) =>
    set((state) => {
      const currentIndex = state.openFiles.findIndex((file) => file.path === path)
      if (currentIndex === -1) return state

      const nextOpenFiles = state.openFiles.filter((file) => file.path !== path)
      let nextActiveFilePath = state.activeFilePath

      if (state.activeFilePath === path) {
        nextActiveFilePath =
          nextOpenFiles.length === 0
            ? null
            : nextOpenFiles[Math.max(0, currentIndex - 1)]?.path ?? nextOpenFiles[0]?.path ?? null
      }

      return {
        openFiles: nextOpenFiles,
        activeFilePath: nextActiveFilePath,
        activeFile: deriveActiveFile(nextOpenFiles, nextActiveFilePath),
        fileViewerVisible: nextOpenFiles.length > 0 ? state.fileViewerVisible : false
      }
    }),
  updateFileDraft: (content) =>
    set((state) => {
      if (!state.activeFilePath) return state
      const nextOpenFiles = state.openFiles.map((file) =>
        file.path === state.activeFilePath
          ? {
              ...file,
              draftContent: content,
              dirty: content !== file.content
            }
          : file
      )
      return {
        openFiles: nextOpenFiles,
        activeFile: deriveActiveFile(nextOpenFiles, state.activeFilePath)
      }
    }),
  updateFileContent: (content) =>
    set((state) => {
      if (!state.activeFilePath) return state
      const nextOpenFiles = state.openFiles.map((file) =>
        file.path === state.activeFilePath
          ? {
              ...file,
              content,
              draftContent: content,
              dirty: false,
              externalModified: false
            }
          : file
      )
      return {
        openFiles: nextOpenFiles,
        activeFile: deriveActiveFile(nextOpenFiles, state.activeFilePath)
      }
    }),
  saveFileContent: (path, content, size, modifiedAt) =>
    set((state) => {
      const nextOpenFiles = state.openFiles.map((file) =>
        file.path === path
          ? {
              ...file,
              content,
              draftContent: content,
              dirty: false,
              size: size ?? file.size,
              modifiedAt: modifiedAt ?? file.modifiedAt,
              externalModified: false
            }
          : file
      )
      return {
        openFiles: nextOpenFiles,
        activeFile: deriveActiveFile(nextOpenFiles, state.activeFilePath)
      }
    }),
  setFileEditMode: (path, editMode) =>
    set((state) => {
      const nextOpenFiles = state.openFiles.map((file) =>
        file.path === path
          ? { ...file, editMode }
          : file
      )
      return {
        openFiles: nextOpenFiles,
        activeFile: deriveActiveFile(nextOpenFiles, state.activeFilePath)
      }
    }),
  refreshFileFromDisk: (file) =>
    set((state) => {
      const nextOpenFiles = state.openFiles.map((openFile) =>
        openFile.path === file.path
          ? {
              ...openFile,
              ...file,
              readAccess: file.readAccess ?? openFile.readAccess,
              source: file.source ?? openFile.source,
              draftContent: file.content,
              editMode: getDefaultEditMode(file),
              dirty: false,
              externalModified: false
            }
          : openFile
      )
      return {
        openFiles: nextOpenFiles,
        activeFile: deriveActiveFile(nextOpenFiles, state.activeFilePath)
      }
    }),
  markExternalFileChange: (path, modifiedAt, size) =>
    set((state) => {
      const nextOpenFiles = state.openFiles.map((file) =>
        file.path === path
          ? {
              ...file,
              externalModified: true,
              modifiedAt: modifiedAt ?? file.modifiedAt,
              size: size ?? file.size
            }
          : file
      )
      return {
        openFiles: nextOpenFiles,
        activeFile: deriveActiveFile(nextOpenFiles, state.activeFilePath)
      }
    }),
  clearExternalFileChange: (path) =>
    set((state) => {
      const nextOpenFiles = state.openFiles.map((file) =>
        file.path === path
          ? {
              ...file,
              externalModified: false
            }
          : file
      )
      return {
        openFiles: nextOpenFiles,
        activeFile: deriveActiveFile(nextOpenFiles, state.activeFilePath)
      }
    }),
  setFileViewerVisible: (visible) => set({ fileViewerVisible: visible })
}))
