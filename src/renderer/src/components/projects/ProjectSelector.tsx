import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  Check,
  Search,
  ExternalLink,
  Terminal
} from 'lucide-react'
import clsx from 'clsx'
import { useProjectStore } from '../../store/project-store'
import { useSettingsStore } from '../../store/settings-store'
import { useTerminalStore } from '../../store/terminal-store'
import { useWorkflowRunnerStore, isTerminalRunStatus } from '../../store/workflow-runner-store'
import {
  getProjectWorkspaceTargetConnectionLabel,
  getProjectWorkspaceTargetDisplayName,
  getProjectWorkspaceTargetSummary,
  resolveProjectWorkingDirectory,
  type Project
} from '../../../../shared/project-schema'
import { compareLocalized } from '../../i18n/format'

/** Parse "Group / Name" convention. Returns group=null for ungrouped projects. */
function parseProjectGroup(name: string): { group: string | null; displayName: string } {
  const idx = name.indexOf(' / ')
  if (idx === -1) return { group: null, displayName: name }
  return { group: name.slice(0, idx).trim(), displayName: name.slice(idx + 3).trim() }
}

interface ProjectSelectorProps {
  onCreateNew: () => void
  onEditProject: (project: Project) => void
}

export function ProjectSelector({ onCreateNew, onEditProject }: ProjectSelectorProps): JSX.Element {
  const { t } = useTranslation('projects')
  const { projects, activeProject } = useProjectStore()
  const settings = useSettingsStore((s) => s.settings)
  const sessions = useTerminalStore((s) => s.sessions)
  const runsBySession = useWorkflowRunnerStore((s) => s.runsBySession)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const getProjectTerminalInfo = useCallback((projectId: string): { count: number; hasActive: boolean } => {
    const projectSessions = sessions.filter((s) => s.projectId === projectId && s.active)
    const count = projectSessions.length
    const hasActive = projectSessions.some((s) => {
      const run = runsBySession[s.id]
      return run && !isTerminalRunStatus(run.status)
    })
    return { count, hasActive }
  }, [sessions, runsBySession])

  // Sort: active processes first, then open terminals, then by lastOpenedAt
  const sorted = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aInfo = getProjectTerminalInfo(a.id)
      const bInfo = getProjectTerminalInfo(b.id)

      // Active processes first
      if (aInfo.hasActive !== bInfo.hasActive) return aInfo.hasActive ? -1 : 1
      // Then projects with open terminals
      if ((aInfo.count > 0) !== (bInfo.count > 0)) return aInfo.count > 0 ? -1 : 1
      // Then by lastOpenedAt (most recent first)
      return (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? '')
    })
  }, [projects, getProjectTerminalInfo])

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted
    const q = search.toLowerCase()
    return sorted.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        getProjectWorkspaceTargetSummary(p).toLowerCase().includes(q) ||
        getProjectWorkspaceTargetConnectionLabel(p).toLowerCase().includes(q)
    )
  }, [sorted, search])

  // Build grouped structure — null when searching (flat mode)
  const groupedProjects = useMemo(() => {
    if (search.trim()) return null
    const map = new Map<string | null, Project[]>()
    for (const p of filtered) {
      const { group } = parseProjectGroup(p.name)
      if (!map.has(group)) map.set(group, [])
      map.get(group)!.push(p)
    }
    const result: Array<{ group: string | null; projects: Project[] }> = []
    const ungrouped = map.get(null)
    if (ungrouped?.length) result.push({ group: null, projects: ungrouped })
    const named = [...map.entries()]
      .filter(([k]) => k !== null)
      .sort(([a], [b]) => compareLocalized(a as string, b as string, settings))
    for (const [group, projects] of named) result.push({ group: group as string, projects })
    return result
  }, [filtered, search, settings])

  // Flat list of currently visible projects (respects collapsed groups) for keyboard nav
  const visibleProjects = useMemo(() => {
    if (!groupedProjects) return filtered
    return groupedProjects.flatMap(({ group, projects }) =>
      group && collapsedGroups.has(group) ? [] : projects
    )
  }, [groupedProjects, collapsedGroups, filtered])

  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cmd/Ctrl+P to toggle selector
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Focus search input when dropdown opens, reset highlight
  useEffect(() => {
    if (open) {
      setHighlightIndex(0)
      setTimeout(() => searchRef.current?.focus(), 0)
    } else {
      setSearch('')
    }
  }, [open])

  // Reset highlight when visible list changes
  useEffect(() => {
    setHighlightIndex(0)
  }, [visibleProjects.length])

  const handleSelect = async (project: Project): Promise<void> => {
    await window.electronAPI.setActiveProject(project.id)
    useProjectStore.getState().setActiveProject(project)
    setOpen(false)
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return
    const items = listRef.current.querySelectorAll('[data-project-item]')
    items[highlightIndex]?.scrollIntoView({ block: 'nearest' })
  }, [highlightIndex, open])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => Math.min(i + 1, visibleProjects.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && visibleProjects[highlightIndex]) {
      e.preventDefault()
      void handleSelect(visibleProjects[highlightIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 min-w-0 rounded-xl px-3 py-1.5 text-sm transition-colors hover:bg-surface-light/60"
      >
        {activeProject ? (
          <>
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: activeProject.color }}
            />
            {(() => {
              const { group, displayName } = parseProjectGroup(activeProject.name)
              return group ? (
                <span className="text-gray-200 font-medium max-w-[160px] truncate">
                  <span className="text-gray-500 font-normal">{group} / </span>{displayName}
                </span>
              ) : (
                <span className="text-gray-200 font-medium max-w-[160px] truncate">{displayName}</span>
              )
            })()}
            <span className="text-gray-500 text-[11px] font-mono max-w-[120px] truncate hidden sm:block">
              {activeProject.workspaceTarget.type === 'local'
                ? resolveProjectWorkingDirectory(activeProject).split('/').pop()
                : getProjectWorkspaceTargetDisplayName(activeProject)}
            </span>
          </>
        ) : (
          <>
            <FolderOpen size={14} className="text-gray-500" />
            <span className="text-gray-400">{t('selector.none')}</span>
          </>
        )}
        <ChevronDown size={12} className="text-gray-500 ml-0.5 shrink-0" />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 w-80 bg-surface-light border border-surface-border rounded-2xl shadow-xl shadow-black/30 z-50 overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('selector.searchPlaceholder')}
                className="tv-input-compact pl-8"
              />
            </div>
          </div>

          {/* Project list */}
          <div ref={listRef} className="max-h-96 overflow-y-auto py-1">
            {projects.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                {t('selector.empty')}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-4 text-center text-gray-500 text-sm">
                {t('selector.noMatches')}
              </div>
            ) : (() => {
              let visibleIdx = 0

              const renderProject = (project: Project, indented: boolean): JSX.Element => {
                const vi = visibleIdx++
                const termInfo = getProjectTerminalInfo(project.id)
                const { displayName } = parseProjectGroup(project.name)
                return (
                  <div
                    key={project.id}
                    data-project-item
                    className={clsx(
                      'mx-1.5 flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors group',
                      vi === highlightIndex
                        ? 'bg-accent/10'
                        : activeProject?.id === project.id
                          ? 'bg-surface-lighter/50'
                          : 'hover:bg-surface-lighter'
                    )}
                    onMouseEnter={() => setHighlightIndex(vi)}
                  >
                    <button
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      onClick={() => handleSelect(project)}
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-200 truncate">{displayName}</span>
                          {termInfo.count > 0 && (
                            <span
                              className={clsx(
                                'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full',
                                termInfo.hasActive
                                  ? 'bg-green-500/15 text-green-400'
                                  : 'bg-gray-500/15 text-gray-400'
                              )}
                              title={
                                termInfo.hasActive
                                  ? t('selector.terminalCountActive', { count: termInfo.count })
                                  : t('selector.terminalCount', { count: termInfo.count })
                              }
                            >
                              <Terminal size={9} />
                              {termInfo.count}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 font-mono truncate">
                          {getProjectWorkspaceTargetSummary(project)}
                        </div>
                      </div>
                      {activeProject?.id === project.id && (
                        <Check size={14} className="text-accent-light shrink-0" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpen(false)
                        void window.electronAPI.openProjectInNewWindow(project.id)
                      }}
                      className="tv-btn-icon-sm shrink-0"
                      title={t('selector.openNewWindow')}
                    >
                      <ExternalLink size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpen(false)
                        onEditProject(project)
                      }}
                      className="tv-btn-icon-sm shrink-0"
                      title={t('selector.edit')}
                    >
                      <Settings size={12} />
                    </button>
                  </div>
                )
              }

              if (!groupedProjects) {
                // Flat mode when searching
                return filtered.map((p) => renderProject(p, false))
              }

              return groupedProjects.map(({ group, projects }) => {
                if (!group) {
                  // Ungrouped — render flat
                  return projects.map((p) => renderProject(p, false))
                }
                const collapsed = collapsedGroups.has(group)
                return (
                  <div key={`group-${group}`} className="mb-1">
                    <button
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 mx-1.5 mt-1 text-left rounded-lg hover:bg-surface-lighter transition-colors group/gh"
                      onClick={() => toggleGroup(group)}
                    >
                      <span className="w-0.5 self-stretch rounded-full bg-accent/40 shrink-0" />
                      <span className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase flex-1 truncate">{group}</span>
                      <span className="text-[10px] text-gray-600 bg-surface px-1.5 py-0.5 rounded-full">{projects.length}</span>
                      {collapsed
                        ? <ChevronRight size={11} className="text-gray-600 shrink-0" />
                        : <ChevronDown size={11} className="text-gray-500 shrink-0" />
                      }
                    </button>
                    {!collapsed && (
                      <div className="ml-2 pl-1.5 border-l border-surface-border/60">
                        {projects.map((p) => renderProject(p, false))}
                      </div>
                    )}
                  </div>
                )
              })
            })()}
          </div>

          {/* Footer */}
          <div className="border-t border-surface-border flex items-center justify-between px-4 py-2.5">
            <button
              onClick={() => {
                setOpen(false)
                onCreateNew()
              }}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-accent-light transition-colors"
            >
              <Plus size={14} />
              {t('selector.newProject')}
            </button>
            <span className="text-[10px] text-gray-600 font-mono">
              {navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl+'}P
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
