import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Eye,
  FileText,
  Pencil,
  Play,
  Save,
  X,
  XCircle
} from 'lucide-react'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import rust from 'highlight.js/lib/languages/rust'
import go from 'highlight.js/lib/languages/go'
import sql from 'highlight.js/lib/languages/sql'
import cpp from 'highlight.js/lib/languages/cpp'
import 'highlight.js/styles/atom-one-dark.css'
import { useFileStore, type FileTab } from '../../store/file-store'
import { useProjectStore } from '../../store/project-store'
import { useTerminalStore } from '../../store/terminal-store'
import {
  createProjectTerminalSession,
  ensureProjectExecutionSession
} from '../../lib/workspace-session'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('go', go)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('cpp', cpp)

const EXT_TO_LANG: Record<string, string> = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript', mts: 'typescript',
  py: 'python', pyw: 'python',
  sh: 'bash', zsh: 'bash', bash: 'bash', fish: 'bash',
  json: 'json', jsonc: 'json',
  yaml: 'yaml', yml: 'yaml',
  md: 'markdown', mdx: 'markdown',
  css: 'css', scss: 'css',
  html: 'xml', htm: 'xml', xml: 'xml', svg: 'xml',
  rs: 'rust',
  go: 'go',
  sql: 'sql',
  c: 'cpp', cpp: 'cpp', h: 'cpp', hpp: 'cpp', cc: 'cpp',
  toml: 'yaml',
  env: 'bash'
}

const SCRIPT_EXTENSION_TO_RUNTIME: Record<string, string> = {
  sh: 'bash',
  bash: 'bash',
  zsh: 'zsh',
  fish: 'fish',
  py: 'python3',
  pyw: 'python3',
  js: 'node',
  mjs: 'node',
  cjs: 'node',
  rb: 'ruby',
  pl: 'perl',
  command: 'bash'
}

function detectLanguage(filename: string): string | null {
  const lower = filename.toLowerCase()
  if (lower === 'dockerfile' || lower.startsWith('dockerfile.')) return 'bash'
  if (lower === 'makefile') return 'bash'
  const ext = lower.split('.').pop() ?? ''
  return EXT_TO_LANG[ext] ?? null
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightLine(line: string, language: string): string {
  try {
    return hljs.highlight(line, { language, ignoreIllegals: true }).value || '&nbsp;'
  } catch {
    return escapeHtml(line) || '&nbsp;'
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function getParentDirectory(filePath: string): string {
  const lastSlashIndex = filePath.lastIndexOf('/')
  if (lastSlashIndex <= 0) return '/'
  return filePath.slice(0, lastSlashIndex)
}

function getBaseName(filePath: string): string {
  const parts = filePath.split('/')
  return parts[parts.length - 1] || filePath
}

function normalizeInterpreterToken(token: string): string {
  const cleaned = token.trim().split(/\s+/)[0]?.split('/').pop()?.toLowerCase() ?? ''
  if (!cleaned) return ''
  if (cleaned === 'nodejs') return 'node'
  if (cleaned === 'python') return 'python3'
  if (cleaned === 'env') return ''
  return cleaned
}

function detectShebangRuntime(content: string): string | null {
  const firstLine = content.split('\n')[0]?.trim() ?? ''
  if (!firstLine.startsWith('#!')) return null

  const shebang = firstLine.slice(2).trim()
  if (!shebang) return null

  const tokens = shebang.split(/\s+/)
  if (tokens[0]?.endsWith('/env')) {
    const interpreter = normalizeInterpreterToken(tokens[1] ?? '')
    return interpreter || null
  }

  const interpreter = normalizeInterpreterToken(tokens[0] ?? '')
  return interpreter || null
}

function detectRunnableScript(file: FileTab): { runtime: string; label: string } | null {
  if (file.tooLarge) return null

  const shebangRuntime = detectShebangRuntime(file.draftContent || file.content)
  if (shebangRuntime) {
    return {
      runtime: shebangRuntime,
      label: shebangRuntime === 'bash' || shebangRuntime === 'sh'
        ? 'Run Script'
        : `Run ${shebangRuntime}`
    }
  }

  const extension = file.name.toLowerCase().split('.').pop() ?? ''
  const runtime = SCRIPT_EXTENSION_TO_RUNTIME[extension]
  if (!runtime) return null

  return {
    runtime,
    label: runtime === 'bash' || runtime === 'sh' ? 'Run Script' : `Run ${runtime}`
  }
}

export function FileViewer(): JSX.Element {
  const {
    openFiles,
    activeFile,
    setActiveFilePath,
    closeFile,
    updateFileDraft,
    saveFileContent,
    setFileEditMode,
    refreshFileFromDisk,
    markExternalFileChange,
    clearExternalFileChange,
    pendingJumpLine,
    setPendingJumpLine,
    closeActiveFileRequest
  } = useFileStore()
  const activeProject = useProjectStore((s) => s.activeProject)
  const { addSession, activeSessionId, setTerminalVisible } = useTerminalStore()
  const fileViewerRef = useRef<HTMLDivElement>(null)
  const editHighlightRef = useRef<HTMLPreElement>(null)
  const editLineNumbersRef = useRef<HTMLPreElement>(null)
  const [savingPath, setSavingPath] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<{ path: string; status: 'saved' | 'error'; error?: string } | null>(null)
  const [pendingClosePath, setPendingClosePath] = useState<string | null>(null)
  const [runningScript, setRunningScript] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [notExecutable, setNotExecutable] = useState(false)
  const [makingExecutable, setMakingExecutable] = useState(false)
  const [jumpHighlightLine, setJumpHighlightLine] = useState<number | null>(null)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  const language = useMemo(
    () => (activeFile ? detectLanguage(activeFile.name) : null),
    [activeFile?.name]
  )

  const lines = useMemo(
    () => (activeFile ? activeFile.content.split('\n') : []),
    [activeFile?.content]
  )

  const highlightedLines = useMemo(() => {
    if (!language || !activeFile) return null
    return lines.map((line) => highlightLine(line, language))
  }, [activeFile, language, lines])

  const editLines = useMemo(
    () => (activeFile ? activeFile.draftContent.split('\n') : []),
    [activeFile?.draftContent]
  )

  const highlightedEditContent = useMemo(() => {
    if (!activeFile || !activeFile.editMode) return ''
    if (!language) return escapeHtml(activeFile.draftContent || ' ')
    return editLines.map((line) => highlightLine(line, language)).join('\n')
  }, [activeFile, editLines, language])

  const editorLineNumbers = useMemo(
    () => editLines.map((_, index) => String(index + 1)).join('\n'),
    [editLines]
  )

  const sizeLabel = useMemo(() => {
    if (!activeFile) return ''
    const { size } = activeFile
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }, [activeFile?.size])

  const runnableScript = useMemo(
    () => (activeFile ? detectRunnableScript(activeFile) : null),
    [activeFile]
  )

  // Check execute permission whenever we're on a local runnable script
  useEffect(() => {
    setNotExecutable(false)
    if (!activeFile || !runnableScript || !activeProject) return
    if (activeProject.workspaceTarget.type !== 'local') return
    void window.electronAPI.checkIsExecutable(activeFile.path).then((ok) => {
      setNotExecutable(!ok)
    })
  }, [activeFile?.path, runnableScript, activeProject])

  const persistFile = useCallback(async (filePath: string): Promise<boolean> => {
    const file = openFiles.find((openFile) => openFile.path === filePath)
    if (!file) return false

    setSavingPath(filePath)
    setSaveStatus(null)
    try {
      const result = await window.electronAPI.writeFileContent(file.path, file.draftContent)
      if ('error' in result) {
        setSaveStatus({ path: filePath, status: 'error', error: result.error })
        return false
      }

      saveFileContent(filePath, file.draftContent, result.size, result.modifiedAt)
      setSaveStatus({ path: filePath, status: 'saved' })
      window.setTimeout(() => {
        setSaveStatus((current) =>
          current?.path === filePath && current.status === 'saved' ? null : current
        )
      }, 2500)
      return true
    } finally {
      setSavingPath(null)
    }
  }, [openFiles, saveFileContent])

  const loadFileFromDisk = useCallback(async (filePath: string): Promise<void> => {
    const currentFile = useFileStore.getState().openFiles.find((file) => file.path === filePath)
    if (!currentFile) return

    const result = currentFile.readAccess === 'scoped'
      ? await window.electronAPI.readScopedFileContent(filePath)
      : await window.electronAPI.readFileContent(filePath)
    if ('error' in result) {
      setRunError(`Could not reload ${currentFile.name}: ${result.error}`)
      return
    }

    if ('tooLarge' in result) {
      refreshFileFromDisk({
        path: currentFile.path,
        name: currentFile.name,
        content: '',
        truncated: false,
        tooLarge: true,
        size: result.size,
        modifiedAt: result.modifiedAt
      })
      return
    }

    refreshFileFromDisk({
      path: currentFile.path,
      name: currentFile.name,
      content: result.content,
      truncated: result.truncated,
      tooLarge: false,
      size: result.size,
      modifiedAt: result.modifiedAt
    })
  }, [refreshFileFromDisk])

  const syncEditScroll = useCallback((target: HTMLTextAreaElement): void => {
    if (editHighlightRef.current) {
      editHighlightRef.current.scrollTop = target.scrollTop
      editHighlightRef.current.scrollLeft = target.scrollLeft
    }

    if (editLineNumbersRef.current) {
      editLineNumbersRef.current.scrollTop = target.scrollTop
    }
  }, [])

  const requestCloseFile = useCallback((filePath: string): void => {
    const file = openFiles.find((openFile) => openFile.path === filePath)
    if (!file) return

    if (file.dirty) {
      setPendingClosePath(filePath)
      return
    }

    closeFile(filePath)
  }, [closeFile, openFiles])

  const handleCopyFilePath = useCallback(async (filePath: string): Promise<void> => {
    await window.electronAPI.writeClipboard(filePath)
    setCopiedPath(filePath)
    window.setTimeout(() => {
      setCopiedPath((currentPath) => (currentPath === filePath ? null : currentPath))
    }, 1200)
  }, [])

  /** Wait for a specific session's shell to signal ready (with 5s timeout fallback) */
  const waitForShellReady = useCallback((sessionId: string): Promise<void> => {
    return new Promise((resolve) => {
      const timer = window.setTimeout(resolve, 5000)
      const unsub = window.electronAPI.onShellReady((readyId) => {
        if (readyId === sessionId) {
          window.clearTimeout(timer)
          unsub()
          resolve()
        }
      })
    })
  }, [])

  const handleRunScript = useCallback(async (): Promise<void> => {
    if (!activeFile || !runnableScript) return

    setRunError(null)
    setRunningScript(true)
    try {
      if (activeFile.dirty) {
        const saved = await persistFile(activeFile.path)
        if (!saved) {
          setRunError('Save the file first before running it.')
          return
        }
      }

      const envOverrides = useProjectStore.getState().getActiveEnvOverrides()
      let sessionId = activeSessionId
      let isNewSession = false
      if (!sessionId) {
        isNewSession = true
        sessionId = await createProjectTerminalSession(
          activeProject,
          addSession,
          envOverrides,
          'workspace-shell',
          getParentDirectory(activeFile.path)
        )
        // Ensure the terminal panel is visible immediately — addSession sets
        // terminalVisible but the workspace layout restore may override it.
        setTerminalVisible(true)
      } else {
        sessionId = await ensureProjectExecutionSession(
          activeProject,
          sessionId,
          (candidateId) =>
            useTerminalStore.getState().sessions.find((session) => session.id === candidateId)?.mode ?? null,
          addSession,
          envOverrides
        )
      }

      // For a brand-new terminal, wait for the shell to finish initialising
      // before writing the command — otherwise it arrives before the prompt.
      if (isNewSession) {
        await waitForShellReady(sessionId)
      }

      const fileDirectory = getParentDirectory(activeFile.path)
      const fileName = getBaseName(activeFile.path)
      const command = `cd ${shellQuote(fileDirectory)} && ${runnableScript.runtime} ${shellQuote(`./${fileName}`)}`
      setTerminalVisible(true)
      window.electronAPI.writeToTerminal(sessionId, `${command}\n`)
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error))
    } finally {
      setRunningScript(false)
    }
  }, [activeFile, activeProject, activeSessionId, addSession, persistFile, runnableScript, setTerminalVisible, waitForShellReady])

  const handleMakeExecutable = useCallback(async (): Promise<void> => {
    if (!activeFile) return
    setMakingExecutable(true)
    try {
      const envOverrides = useProjectStore.getState().getActiveEnvOverrides()
      let sessionId = activeSessionId
      let isNewSession = false
      if (!sessionId) {
        isNewSession = true
        sessionId = await createProjectTerminalSession(activeProject, addSession, envOverrides)
        setTerminalVisible(true)
      }
      if (isNewSession) await waitForShellReady(sessionId)
      setTerminalVisible(true)
      window.electronAPI.writeToTerminal(
        sessionId,
        `chmod +x ${shellQuote(activeFile.path)}\n`
      )
      setNotExecutable(false)
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error))
    } finally {
      setMakingExecutable(false)
    }
  }, [activeFile, activeProject, activeSessionId, addSession, setTerminalVisible, waitForShellReady])

  useEffect(() => {
    if (!activeFile?.path) return

    let cancelled = false

    const checkForExternalChanges = async (): Promise<void> => {
      const currentFile = useFileStore.getState().openFiles.find((file) => file.path === activeFile.path)
      if (!currentFile) return

      const metadata = await window.electronAPI.getFileMetadata(activeFile.path)
      if (cancelled || 'error' in metadata) return

      const lastKnownModifiedAt = currentFile.modifiedAt ?? 0
      if (metadata.modifiedAt <= lastKnownModifiedAt) return

      if (currentFile.dirty) {
        markExternalFileChange(activeFile.path, metadata.modifiedAt, metadata.size)
        return
      }

      await loadFileFromDisk(activeFile.path)
    }

    void checkForExternalChanges()

    const intervalId = window.setInterval(() => {
      void checkForExternalChanges()
    }, 2000)

    const handleWindowFocus = (): void => {
      void checkForExternalChanges()
    }

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        void checkForExternalChanges()
      }
    }

    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [
    activeFile?.path,
    loadFileFromDisk,
    markExternalFileChange
  ])

  // ⌘W — close active file tab (triggered from AppShell global shortcut)
  useEffect(() => {
    if (!closeActiveFileRequest) return
    const file = useFileStore.getState().activeFile
    if (file) requestCloseFile(file.path)
  }, [closeActiveFileRequest, requestCloseFile])

  // Scroll to and highlight a line when opened from Find in Files
  useEffect(() => {
    if (!pendingJumpLine) return
    const file = useFileStore.getState().activeFile
    if (!file) return

    // Switch to view mode so the table rows exist in the DOM
    if (file.editMode) setFileEditMode(file.path, false)

    const targetLine = pendingJumpLine
    setPendingJumpLine(null)
    setJumpHighlightLine(targetLine)

    // Wait one frame for the table to render (especially after mode switch)
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(`viewer-line-${targetLine}`)
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })

    const timer = window.setTimeout(() => setJumpHighlightLine(null), 1500)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [pendingJumpLine, setFileEditMode, setPendingJumpLine])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!activeFile || !event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.key.toLowerCase() !== 'w') {
        return
      }

      const viewerRoot = fileViewerRef.current
      if (!viewerRoot) return

      const activeElement = document.activeElement
      const focusedInsideViewer = activeElement instanceof Node && viewerRoot.contains(activeElement)
      const bodyFocused = activeElement === document.body

      if (!focusedInsideViewer && !bodyFocused) return

      event.preventDefault()
      requestCloseFile(activeFile.path)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeFile, requestCloseFile])

  if (!activeFile) return <></>

  const isSavingActiveFile = savingPath === activeFile.path
  const saveStateForActiveFile = saveStatus?.path === activeFile.path ? saveStatus : null

  return (
    <div ref={fileViewerRef} className="h-full min-h-0 flex flex-col bg-surface overflow-hidden">
      <div className="flex items-end gap-1 px-2 pt-2 border-b border-surface-border shrink-0 overflow-x-auto bg-surface">
        {openFiles.map((file) => (
          <div
            key={file.path}
            className={`group flex items-center gap-2 rounded-t-lg border px-2.5 py-1.5 text-xs transition-colors shrink-0 ${
              file.path === activeFile.path
                ? 'border-surface-border border-b-surface bg-surface-light text-gray-200'
                : 'border-transparent bg-surface text-gray-500 hover:text-gray-300 hover:bg-surface-light/60'
            }`}
          >
            <button
              onClick={() => setActiveFilePath(file.path)}
              className="flex items-center gap-2 min-w-0"
            >
              <FileText size={12} className="shrink-0" />
              <span className="truncate max-w-[180px]">{file.name}</span>
              {file.dirty && (
                <span className="h-1.5 w-1.5 rounded-full bg-accent-light shrink-0" />
              )}
            </button>
            <button
              onClick={() => requestCloseFile(file.path)}
              className="tv-btn-icon-sm h-5 w-5"
              title={file.dirty ? 'Close tab (unsaved changes)' : 'Close tab'}
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3.5 py-2 border-b border-surface-border shrink-0 bg-surface-light/20">
        <FileText size={14} className="text-accent shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-200 truncate block">{activeFile.name}</span>
          <button
            type="button"
            onClick={() => void handleCopyFilePath(activeFile.path)}
            className="block max-w-full truncate text-left text-[11px] font-mono text-gray-600 transition-colors hover:text-gray-400"
            title={copiedPath === activeFile.path ? 'Copied!' : 'Copy file path'}
          >
            {copiedPath === activeFile.path ? 'Copied!' : activeFile.path}
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {saveStateForActiveFile?.status === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-safe">
              <Check size={11} />
              Saved
            </span>
          )}
          {saveStateForActiveFile?.status === 'error' && (
            <span className="flex items-center gap-1 text-xs text-destructive" title={saveStateForActiveFile.error}>
              <AlertTriangle size={11} />
              Save failed
            </span>
          )}
          <span className="tv-pill normal-case tracking-normal">
            {sizeLabel} · {activeFile.editMode ? editLines.length : lines.length} lines{language ? ` · ${language}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!activeFile.tooLarge && !activeFile.truncated && (
            <button
              onClick={() => setFileEditMode(activeFile.path, !activeFile.editMode)}
              className="tv-btn-icon"
              title={activeFile.editMode ? 'Preview file' : 'Edit file'}
            >
              {activeFile.editMode ? <Eye size={13} /> : <Pencil size={13} />}
            </button>
          )}
          {runnableScript && (
            <button
              onClick={() => void handleRunScript()}
              disabled={runningScript || isSavingActiveFile}
              className="tv-btn-secondary"
              title={runnableScript.label}
            >
              <Play size={12} />
              {activeFile.dirty ? 'Save & Run' : runnableScript.label}
            </button>
          )}
          <button
            onClick={() => void persistFile(activeFile.path)}
            disabled={isSavingActiveFile || activeFile.truncated || activeFile.tooLarge || !activeFile.dirty}
            className="tv-btn-accent"
            title="Save file (⌘S)"
          >
            <Save size={12} />
            {isSavingActiveFile ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => window.electronAPI.revealInExplorer(activeFile.path)}
            className="tv-btn-icon"
            title="Reveal in Finder"
          >
            <ExternalLink size={13} />
          </button>
          <button
            onClick={() => requestCloseFile(activeFile.path)}
            className="tv-btn-icon"
            title="Close tab"
          >
            <XCircle size={13} />
          </button>
        </div>
      </div>

      {notExecutable && runnableScript && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-caution/10 border-b border-caution/20 text-xs text-caution shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={12} className="shrink-0" />
            <span>This file is not executable — it needs <code className="font-mono">chmod +x</code> before it can be run directly.</span>
          </div>
          <button
            onClick={() => void handleMakeExecutable()}
            disabled={makingExecutable}
            className="tv-btn-secondary shrink-0"
          >
            {makingExecutable ? 'Fixing…' : 'Run chmod +x'}
          </button>
        </div>
      )}

      {runError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive shrink-0">
          <AlertTriangle size={12} />
          {runError}
        </div>
      )}

      {activeFile.externalModified && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-caution/10 border-b border-caution/20 text-xs text-caution shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={12} className="shrink-0" />
            <span className="truncate">
              This file changed on disk while it was open. Reload to see the newer version, or keep your current edits for now.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeFile.dirty && (
              <button
                onClick={() => clearExternalFileChange(activeFile.path)}
                className="tv-btn-secondary"
              >
                Keep My Edits
              </button>
            )}
            <button
              onClick={() => void loadFileFromDisk(activeFile.path)}
              className="tv-btn-secondary"
            >
              Reload
            </button>
          </div>
        </div>
      )}

      {activeFile.tooLarge && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-3 px-8 text-center">
          <AlertTriangle size={32} className="text-caution/60" />
          <div>
            <p className="text-sm font-medium text-gray-400">File too large to open</p>
            <p className="text-xs mt-1 text-gray-600">
              {sizeLabel} — files over 50 MB are not loaded in the viewer.
            </p>
          </div>
          <button
            onClick={() => window.electronAPI.revealInExplorer(activeFile.path)}
            className="tv-btn-secondary"
          >
            <ExternalLink size={12} />
            Reveal in Finder
          </button>
        </div>
      )}

      {activeFile.truncated && (
        <div className="flex items-center gap-2 px-4 py-2 bg-caution/10 border-b border-caution/20 text-xs text-caution shrink-0">
          <AlertTriangle size={12} />
          File is larger than 5 MB — showing first 5 MB only. Editing is not available for large files.
        </div>
      )}

      {!activeFile.tooLarge && (activeFile.editMode ? (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden flex">
            <pre
              ref={editLineNumbersRef}
              className="select-none shrink-0 overflow-hidden text-right px-3 py-4 text-xs font-mono leading-5 text-gray-700 border-r border-surface-border bg-surface-light/30"
            >
              {editorLineNumbers}
            </pre>
            <div className="relative flex-1 min-h-0 overflow-hidden">
              <pre
                ref={editHighlightRef}
                className="pointer-events-none absolute inset-0 m-0 overflow-hidden px-4 py-4 text-xs font-mono leading-5 text-gray-300 whitespace-pre"
                style={{ tabSize: 2 }}
              >
                <code dangerouslySetInnerHTML={{ __html: highlightedEditContent }} />
              </pre>
              <textarea
                value={activeFile.draftContent}
                onChange={(event) => updateFileDraft(event.target.value)}
                onScroll={(event) => syncEditScroll(event.currentTarget)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                    event.preventDefault()
                    void persistFile(activeFile.path)
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    setFileEditMode(activeFile.path, false)
                  }
                  if (event.key === 'Tab') {
                    event.preventDefault()
                    const element = event.currentTarget
                    const start = element.selectionStart
                    const end = element.selectionEnd
                    const nextValue = activeFile.draftContent.slice(0, start) + '  ' + activeFile.draftContent.slice(end)
                    updateFileDraft(nextValue)
                    requestAnimationFrame(() => {
                      element.selectionStart = start + 2
                      element.selectionEnd = start + 2
                    })
                  }
                }}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                wrap="off"
                className="absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent px-4 py-4 text-xs font-mono leading-5 text-transparent caret-gray-200 selection:bg-accent/25 focus:outline-none"
                style={{ tabSize: 2 }}
              />
            </div>
          </div>
          <div className="text-xs text-gray-600 px-4 py-1.5 border-t border-surface-border bg-surface-light shrink-0">
            Opens in edit mode by default · ⌘S saves · Esc previews · Tab indents
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full border-collapse text-xs font-mono">
            <tbody>
              {lines.map((line, index) => (
                <tr
                  key={index}
                  id={`viewer-line-${index + 1}`}
                  className={`hover:bg-surface-light/40 group transition-colors ${jumpHighlightLine === index + 1 ? 'bg-accent/15' : ''}`}
                >
                  <td className={`select-none text-right pr-4 pl-3 py-px w-12 shrink-0 border-r border-surface-border leading-5 ${jumpHighlightLine === index + 1 ? 'text-accent/70' : 'text-gray-700 group-hover:text-gray-600'}`}>
                    {index + 1}
                  </td>
                  <td className="pl-4 pr-4 py-px text-gray-300 whitespace-pre leading-5">
                    {highlightedLines ? (
                      <span dangerouslySetInnerHTML={{ __html: highlightedLines[index] }} />
                    ) : (
                      line || '\u00A0'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {pendingClosePath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl border border-surface-border bg-surface shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-border">
              <h2 className="text-sm font-semibold text-gray-200">Unsaved changes</h2>
              <p className="mt-1 text-xs text-gray-500">
                {openFiles.find((file) => file.path === pendingClosePath)?.name ?? 'This file'} has unsaved changes. Save before closing the tab?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 bg-surface-light/20">
              <button
                onClick={() => setPendingClosePath(null)}
                className="tv-btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  closeFile(pendingClosePath)
                  setPendingClosePath(null)
                }}
                className="tv-btn-secondary text-sm"
              >
                Discard
              </button>
              <button
                onClick={async () => {
                  const path = pendingClosePath
                  if (!path) return
                  const saved = await persistFile(path)
                  if (!saved) return
                  closeFile(path)
                  setPendingClosePath(null)
                }}
                className="tv-btn-accent text-sm"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
