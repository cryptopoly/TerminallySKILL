import { useState, useRef, useCallback, useMemo } from 'react'
import { Search, ChevronDown, ChevronRight, Loader2, X, CaseSensitive, Regex, Filter } from 'lucide-react'
import clsx from 'clsx'
import { useProjectStore } from '../../store/project-store'
import { useFileStore } from '../../store/file-store'
import { resolveProjectWorkingDirectory, isLocalProjectWorkspaceTarget } from '../../../../shared/project-schema'

interface SearchMatch {
  lineNumber: number
  lineText: string
}

interface SearchResult {
  filePath: string
  matches: SearchMatch[]
}

function getRelativePath(filePath: string, rootDir: string): string {
  if (filePath.startsWith(rootDir + '/')) return filePath.slice(rootDir.length + 1)
  return filePath
}

function getFileName(filePath: string): string {
  return filePath.split('/').pop() ?? filePath
}

function getFileDir(filePath: string, rootDir: string): string {
  const rel = getRelativePath(filePath, rootDir)
  const dir = rel.split('/').slice(0, -1).join('/')
  return dir || '.'
}

function highlightMatch(text: string, query: string, caseSensitive: boolean): React.ReactNode {
  if (!query) return text
  const flags = caseSensitive ? 'g' : 'gi'
  let safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let re: RegExp
  try { re = new RegExp(`(${safeQuery})`, flags) } catch { return text }
  const parts = text.split(re)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <mark key={i} className="bg-accent/30 text-accent-light rounded-sm px-0.5">{part}</mark>
      : <span key={i}>{part}</span>
  )
}

export function FindInFiles(): JSX.Element {
  const activeProject = useProjectStore((s) => s.activeProject)
  const { setActiveFile, setPendingJumpLine } = useFileStore()

  const [query, setQuery] = useState('')
  const [globFilter, setGlobFilter] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usedRipgrep, setUsedRipgrep] = useState(false)
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set())
  const abortRef = useRef<boolean>(false)

  const rootDir = useMemo(() => {
    if (!activeProject || !isLocalProjectWorkspaceTarget(activeProject.workspaceTarget)) return null
    return resolveProjectWorkingDirectory(activeProject)
  }, [activeProject])

  const totalMatches = useMemo(() =>
    results?.reduce((sum, r) => sum + r.matches.length, 0) ?? 0,
    [results]
  )

  const runSearch = useCallback(async () => {
    if (!query.trim() || !rootDir) return
    abortRef.current = false
    setLoading(true)
    setError(null)
    setResults(null)
    setCollapsedFiles(new Set())

    try {
      const res = await window.electronAPI.searchFiles(rootDir, query, {
        caseSensitive,
        regex: useRegex,
        glob: globFilter.trim() || undefined
      })
      if (abortRef.current) return
      if (res.error) setError(res.error)
      else {
        setResults(res.results)
        setUsedRipgrep(res.usedRipgrep)
      }
    } catch (err) {
      if (!abortRef.current) setError(String(err))
    } finally {
      if (!abortRef.current) setLoading(false)
    }
  }, [query, rootDir, caseSensitive, useRegex, globFilter])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') void runSearch()
  }

  const openFileAtLine = useCallback(async (filePath: string, lineNumber: number) => {
    const result = await window.electronAPI.readScopedFileContent(filePath)
    if ('error' in result) return
    const name = getFileName(filePath)
    setPendingJumpLine(lineNumber)
    if ('tooLarge' in result) {
      setActiveFile({
        path: filePath,
        name,
        content: '',
        truncated: false,
        tooLarge: true,
        size: result.size,
        modifiedAt: result.modifiedAt,
        readAccess: 'scoped',
        source: 'find-in-files'
      })
    } else {
      setActiveFile({
        path: filePath,
        name,
        content: result.content,
        truncated: result.truncated,
        tooLarge: false,
        size: result.size,
        modifiedAt: result.modifiedAt,
        readAccess: 'scoped',
        source: 'find-in-files'
      })
    }
  }, [setActiveFile, setPendingJumpLine])

  const toggleCollapse = (filePath: string): void => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(filePath)) next.delete(filePath)
      else next.add(filePath)
      return next
    })
  }

  if (!rootDir) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-sm font-medium text-gray-400">No local project open</p>
          <p className="text-xs text-gray-600 mt-1">Find in Files works with local workspace projects.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Search input */}
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-surface-border">
        <div className="relative flex items-center gap-1">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search in project…"
              className="w-full bg-surface border border-surface-border rounded-lg pl-7 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              autoFocus
            />
          </div>
          {/* Toggles */}
          <button
            title="Case sensitive"
            onClick={() => setCaseSensitive((v) => !v)}
            className={clsx('p-1.5 rounded-md transition-colors', caseSensitive ? 'bg-accent/20 text-accent-light' : 'text-gray-600 hover:text-gray-400')}
          >
            <CaseSensitive size={14} />
          </button>
          <button
            title="Use regex"
            onClick={() => setUseRegex((v) => !v)}
            className={clsx('p-1.5 rounded-md transition-colors', useRegex ? 'bg-accent/20 text-accent-light' : 'text-gray-600 hover:text-gray-400')}
          >
            <Regex size={14} />
          </button>
          <button
            title="Filter options"
            onClick={() => setShowOptions((v) => !v)}
            className={clsx('p-1.5 rounded-md transition-colors', (showOptions || globFilter) ? 'bg-accent/20 text-accent-light' : 'text-gray-600 hover:text-gray-400')}
          >
            <Filter size={14} />
          </button>
        </div>

        {showOptions && (
          <input
            type="text"
            value={globFilter}
            onChange={(e) => setGlobFilter(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="File filter, e.g. *.ts, src/**/*.tsx"
            className="w-full bg-surface border border-surface-border rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
          />
        )}

        <button
          onClick={() => void runSearch()}
          disabled={!query.trim() || loading}
          className="w-full py-1.5 rounded-lg bg-accent/15 border border-accent/20 text-accent-light text-xs font-medium hover:bg-accent/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {loading ? <><Loader2 size={11} className="animate-spin" /> Searching…</> : <><Search size={11} /> Search</>}
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {error && (
          <div className="px-3 py-3 text-xs text-destructive">{error}</div>
        )}

        {results !== null && !loading && (
          <div className="px-2 py-1.5 flex items-center justify-between">
            <span className="text-[11px] text-gray-500">
              {results.length === 0
                ? 'No results'
                : `${totalMatches} match${totalMatches !== 1 ? 'es' : ''} in ${results.length} file${results.length !== 1 ? 's' : ''}`}
            </span>
            <div className="flex items-center gap-2">
              {usedRipgrep && <span className="text-[10px] text-gray-600 font-mono">rg</span>}
              {results.length > 0 && (
                <button
                  onClick={() => setResults(null)}
                  className="text-gray-600 hover:text-gray-400 transition-colors"
                  title="Clear results"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>
        )}

        {results?.map((result) => {
          const collapsed = collapsedFiles.has(result.filePath)
          const rel = getRelativePath(result.filePath, rootDir)
          const fileName = getFileName(result.filePath)
          const fileDir = getFileDir(result.filePath, rootDir)

          return (
            <div key={result.filePath} className="mb-0.5">
              {/* File header */}
              <button
                className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-surface-light transition-colors text-left group"
                onClick={() => toggleCollapse(result.filePath)}
              >
                {collapsed
                  ? <ChevronRight size={11} className="text-gray-600 shrink-0" />
                  : <ChevronDown size={11} className="text-gray-600 shrink-0" />
                }
                <span className="text-xs font-medium text-gray-300 truncate flex-1">{fileName}</span>
                <span className="text-[10px] text-gray-600 shrink-0 font-mono">{result.matches.length}</span>
              </button>
              {!collapsed && (
                <div>
                  {fileDir !== '.' && (
                    <div className="px-6 pb-0.5 text-[10px] text-gray-600 font-mono truncate">{fileDir}/</div>
                  )}
                  {result.matches.map((match) => (
                    <button
                      key={`${result.filePath}:${match.lineNumber}`}
                      className="w-full flex items-start gap-2 px-6 py-1 hover:bg-surface-light/60 transition-colors text-left group/match"
                      onClick={() => void openFileAtLine(result.filePath, match.lineNumber)}
                    >
                      <span className="text-[10px] text-gray-600 font-mono shrink-0 w-8 text-right pt-0.5 group-hover/match:text-accent/70">
                        {match.lineNumber}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono leading-relaxed truncate group-hover/match:text-gray-200">
                        {highlightMatch(match.lineText.trim(), useRegex ? '' : query, caseSensitive)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {results?.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500">No matches for <span className="text-gray-300 font-mono">{query}</span></p>
            {globFilter && <p className="text-xs text-gray-600 mt-1">in files matching <span className="font-mono">{globFilter}</span></p>}
          </div>
        )}

        {!results && !loading && !error && (
          <div className="px-4 py-8 text-center text-xs text-gray-600">
            Press Enter or click Search to find across all files in this project
          </div>
        )}
      </div>
    </div>
  )
}
