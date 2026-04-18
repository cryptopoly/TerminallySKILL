import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Folder,
  File,
  ChevronLeft,
  ExternalLink,
  RefreshCw,
  Eye,
  Home,
  FilePlus,
  Check,
  X
} from 'lucide-react'
import clsx from 'clsx'
import { useProjectStore } from '../../store/project-store'
import { useFileStore } from '../../store/file-store'
import {
  getProjectWorkspaceTargetSummary,
  isLocalProjectWorkspaceTarget,
  resolveProjectWorkingDirectory
} from '../../../../shared/project-schema'

interface FileEntry {
  name: string
  isDirectory: boolean
  size: number
  modified: string
}

export function FileBrowser(): JSX.Element {
  const activeProject = useProjectStore((s) => s.activeProject)
  const setActiveFile = useFileStore((s) => s.setActiveFile)
  const [currentPath, setCurrentPath] = useState<string>('')
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [showHidden, setShowHidden] = useState(true)
  const [openingFile, setOpeningFile] = useState<string | null>(null)
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creatingFile, setCreatingFile] = useState(false)
  const newFileInputRef = useRef<HTMLInputElement>(null)

  const loadDirectory = useCallback(
    async (path: string, includeHidden = showHidden) => {
      setLoading(true)
      try {
        const items = await window.electronAPI.listDirectory(path, includeHidden)
        setEntries(items)
        setCurrentPath(path)
      } catch {
        setEntries([])
      }
      setLoading(false)
    },
    [showHidden]
  )

  useEffect(() => {
    if (activeProject && isLocalProjectWorkspaceTarget(activeProject.workspaceTarget)) {
      void loadDirectory(resolveProjectWorkingDirectory(activeProject), showHidden)
    }
  }, [activeProject, loadDirectory])

  useEffect(() => {
    if (!isCreatingFile) return
    newFileInputRef.current?.focus()
    newFileInputRef.current?.select()
  }, [isCreatingFile])

  const navigateUp = (): void => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/'
    void loadDirectory(parent, showHidden)
  }

  const navigateTo = async (entry: FileEntry): Promise<void> => {
    if (entry.isDirectory) {
      const newPath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`
      void loadDirectory(newPath, showHidden)
      return
    }
    // Open file as text in the main panel
    const filePath = `${currentPath}/${entry.name}`
    setOpeningFile(entry.name)
    try {
      const result = await window.electronAPI.readScopedFileContent(filePath)
      if ('error' in result) {
        // Binary or unreadable — fall back to reveal in Finder
        window.electronAPI.revealInExplorer(filePath)
      } else if ('tooLarge' in result) {
        // Over 50 MB — open a placeholder so the viewer can show a "too large" state
        setActiveFile({
          path: filePath,
          name: entry.name,
          content: '',
          truncated: false,
          tooLarge: true,
          size: result.size,
          modifiedAt: result.modifiedAt,
          readAccess: 'scoped',
          source: 'project-browser'
        })
      } else {
        setActiveFile({
          path: filePath,
          name: entry.name,
          content: result.content,
          truncated: result.truncated,
          tooLarge: false,
          size: result.size,
          modifiedAt: result.modifiedAt,
          readAccess: 'scoped',
          source: 'project-browser'
        })
      }
    } finally {
      setOpeningFile(null)
    }
  }

  const goHome = (): void => {
    if (activeProject && isLocalProjectWorkspaceTarget(activeProject.workspaceTarget)) {
      void loadDirectory(resolveProjectWorkingDirectory(activeProject), showHidden)
    }
  }

  const openInExplorer = (): void => {
    window.electronAPI.openInExplorer(currentPath)
  }

  const revealFile = (name: string): void => {
    window.electronAPI.revealInExplorer(`${currentPath}/${name}`)
  }

  const beginCreateFile = (): void => {
    setCreateError(null)
    setNewFileName('')
    setIsCreatingFile(true)
  }

  const cancelCreateFile = (): void => {
    setCreatingFile(false)
    setCreateError(null)
    setNewFileName('')
    setIsCreatingFile(false)
  }

  const submitCreateFile = async (): Promise<void> => {
    const trimmedName = newFileName.trim()
    if (!trimmedName) {
      setCreateError('Enter a file name, including its extension if you want one.')
      return
    }
    if (trimmedName === '.' || trimmedName === '..' || /[\\/]/.test(trimmedName)) {
      setCreateError('Use a file name only, not a nested path.')
      return
    }

    const filePath = currentPath === '/' ? `/${trimmedName}` : `${currentPath}/${trimmedName}`
    setCreatingFile(true)
    setCreateError(null)

    try {
      const result = await window.electronAPI.createFile(filePath)
      if ('error' in result) {
        if (result.error.includes('EEXIST')) {
          setCreateError('A file with that name already exists here.')
        } else {
          setCreateError('Could not create that file just now.')
        }
        return
      }

      setActiveFile({
        path: filePath,
        name: trimmedName,
        content: '',
        truncated: false,
        tooLarge: false,
        size: 0,
        readAccess: 'scoped',
        source: 'created-file'
      })
      await loadDirectory(currentPath, showHidden)
      cancelCreateFile()
    } finally {
      setCreatingFile(false)
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Build breadcrumb parts from current path relative to project root
  const projectRoot = activeProject ? resolveProjectWorkingDirectory(activeProject) : ''
  const relativePath = currentPath.startsWith(projectRoot)
    ? currentPath.slice(projectRoot.length)
    : currentPath
  const breadcrumbParts = relativePath.split('/').filter(Boolean)

  if (!activeProject) {
    return (
      <div className="h-full flex items-center justify-center text-gray-600 text-sm p-4">
        Select a project to browse files
      </div>
    )
  }

  if (!isLocalProjectWorkspaceTarget(activeProject.workspaceTarget)) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <div className="text-sm font-medium text-gray-300">File browser is local-only for now</div>
          <div className="text-xs text-gray-500 leading-6">
            This workspace targets <span className="font-mono text-gray-400">{getProjectWorkspaceTargetSummary(activeProject)}</span>.
            Run commands over SSH from the command builder, scripts, or snippets instead.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-surface-border shrink-0">
        <button
          onClick={navigateUp}
          className="p-1.5 rounded hover:bg-surface-light text-gray-500 hover:text-gray-300 transition-colors"
          title="Go up"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={goHome}
          className="p-1.5 rounded hover:bg-surface-light text-gray-500 hover:text-gray-300 transition-colors"
          title="Project root"
        >
          <Home size={14} />
        </button>
        <button
          onClick={() => loadDirectory(currentPath)}
          className="p-1.5 rounded hover:bg-surface-light text-gray-500 hover:text-gray-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
        <button
          onClick={beginCreateFile}
          className="p-1.5 rounded hover:bg-surface-light text-gray-500 hover:text-gray-300 transition-colors"
          title="Create file in this folder"
        >
          <FilePlus size={14} />
        </button>
        <button
          onClick={() =>
            setShowHidden((current) => {
              const next = !current
              void loadDirectory(currentPath || projectRoot, next)
              return next
            })
          }
          className={clsx(
            'p-1.5 rounded transition-colors',
            showHidden
              ? 'bg-accent/20 text-accent-light'
              : 'hover:bg-surface-light text-gray-500 hover:text-gray-300'
          )}
          title="Toggle hidden files"
        >
          <Eye size={14} />
        </button>

        {/* Breadcrumb */}
        <div className="flex-1 flex items-center gap-0.5 px-2 text-xs text-gray-500 font-mono overflow-x-auto whitespace-nowrap min-w-0">
          <button
            onClick={goHome}
            className="text-accent-light hover:underline shrink-0"
          >
            {activeProject.name}
          </button>
          {breadcrumbParts.map((part, i) => (
            <span key={i} className="flex items-center gap-0.5 shrink-0">
              <span className="text-gray-600">/</span>
              <button
                onClick={() => {
                  const targetPath =
                    projectRoot + '/' + breadcrumbParts.slice(0, i + 1).join('/')
                  void loadDirectory(targetPath, showHidden)
                }}
                className="hover:text-gray-300 transition-colors"
              >
                {part}
              </button>
            </span>
          ))}
        </div>

        <button
          onClick={openInExplorer}
          className="p-1.5 rounded hover:bg-surface-light text-gray-500 hover:text-gray-300 transition-colors"
          title="Open in Finder/Explorer"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      {isCreatingFile && (
        <div className="px-3 py-2 border-b border-surface-border bg-surface/70 shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={newFileInputRef}
              value={newFileName}
              onChange={(event) => {
                setNewFileName(event.target.value)
                if (createError) setCreateError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void submitCreateFile()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  cancelCreateFile()
                }
              }}
              placeholder="new-file.txt"
              className="flex-1 h-9 px-3 rounded-lg border border-surface-border bg-surface-light text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={() => void submitCreateFile()}
              disabled={creatingFile}
              className="h-9 px-3 rounded-lg border border-surface-border bg-accent text-white hover:bg-accent/90 disabled:opacity-60 transition-colors"
              title="Create file"
            >
              <Check size={14} />
            </button>
            <button
              onClick={cancelCreateFile}
              disabled={creatingFile}
              className="h-9 px-3 rounded-lg border border-surface-border text-gray-400 hover:text-gray-200 hover:bg-surface-light disabled:opacity-60 transition-colors"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
          {createError ? (
            <div className="mt-2 text-xs text-red-400">{createError}</div>
          ) : (
            <div className="mt-2 text-xs text-gray-500">
              Create an empty file in <span className="font-mono text-gray-400">{currentPath}</span>.
            </div>
          )}
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center text-gray-500 text-sm py-8">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center text-gray-600 text-sm py-8">Empty directory</div>
        ) : (
          <div className="py-1">
            {entries.map((entry) => (
              <button
                key={entry.name}
                onClick={() => navigateTo(entry)}
                disabled={openingFile === entry.name}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-surface-light text-left transition-colors group disabled:opacity-60"
              >
                {entry.isDirectory ? (
                  <Folder size={14} className="text-accent-light shrink-0" />
                ) : (
                  <File
                    size={14}
                    className={clsx(
                      'shrink-0 transition-colors',
                      openingFile === entry.name ? 'text-accent' : 'text-gray-500'
                    )}
                  />
                )}
                <span
                  className={clsx(
                    'flex-1 text-sm truncate',
                    entry.isDirectory ? 'text-gray-200' : 'text-gray-400'
                  )}
                >
                  {entry.name}
                </span>
                <span className="text-xs text-gray-600 shrink-0">{formatSize(entry.size)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
