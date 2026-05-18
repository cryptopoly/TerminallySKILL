import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, ScrollText, Clock, Trash2, Copy, Play, X, Download, Share2 } from 'lucide-react'
import clsx from 'clsx'
import { useScriptStore } from '../../store/script-store'
import { useProjectStore } from '../../store/project-store'
import { useSettingsStore } from '../../store/settings-store'
import { resolveProjectTerminalContext, useTerminalStore } from '../../store/terminal-store'
import { isTerminalRunStatus, useWorkflowRunnerStore } from '../../store/workflow-runner-store'
import { ScriptSelector, type ScriptSelection } from './ScriptSelector'
import type { Script } from '../../../../shared/script-schema'
import type { WorkflowInputValues } from '../../../../shared/workflow-execution'
import { buildScriptExecutionPlan, buildScriptPreparationSteps } from '../../../../shared/workflow-execution'
import { WorkflowRunDialog } from './WorkflowRunDialog'
import { createProjectTerminalSession, ensureProjectExecutionSession } from '../../lib/workspace-session'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { formatDate } from '../../i18n/format'

interface ScriptListProps {
  onSelectScript: (script: Script) => void
}

export function ScriptList({ onSelectScript }: ScriptListProps): JSX.Element {
  const { t } = useTranslation('scripts')
  const scripts = useScriptStore((s) => s.scripts)
  const activeScript = useScriptStore((s) => s.activeScript)
  const { addScriptToStore, removeScriptFromStore } = useScriptStore()
  const activeProject = useProjectStore((s) => s.activeProject)
  const projects = useProjectStore((s) => s.projects)
  const { updateProjectInStore } = useProjectStore()
  const settings = useSettingsStore((s) => s.settings)
  const runsBySession = useWorkflowRunnerStore((s) => s.runsBySession)
  const startWorkflowRun = useWorkflowRunnerStore((s) => s.startRun)
  const { activeSessionId, splitSessionId, sessions, setTerminalVisible, addSession } = useTerminalStore()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Script | null>(null)
  const [dragScriptId, setDragScriptId] = useState<string | null>(null)
  const [dragOverScriptId, setDragOverScriptId] = useState<string | null>(null)
  const [scriptSelectorOpen, setScriptSelectorOpen] = useState(false)
  const [pendingRun, setPendingRun] = useState<{ script: Script; forceNew: boolean } | null>(null)
  const { activeProjectSessionId } = useMemo(
    () => resolveProjectTerminalContext(sessions, activeProject?.id ?? null, activeSessionId, splitSessionId),
    [activeProject?.id, activeSessionId, sessions, splitSessionId]
  )
  const activeRuns = useMemo(
    () => Object.values(runsBySession).filter((run) => !isTerminalRunStatus(run.status)),
    [runsBySession]
  )
  const runningScriptCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const run of activeRuns) {
      counts.set(run.script.id, (counts.get(run.script.id) ?? 0) + 1)
    }
    return counts
  }, [activeRuns])

  // Filter scripts by project's enabledScriptIds when a project is active
  const displayedScripts = useMemo(() => {
    if (!activeProject) return scripts
    return scripts.filter((s) => activeProject.enabledScriptIds.includes(s.id))
  }, [scripts, activeProject])

  const sorted = useMemo(() => {
    if (activeProject) {
      // Sort by enabledScriptIds order (user-defined drag order)
      const order = activeProject.enabledScriptIds
      return [...displayedScripts].sort((a, b) => {
        const ai = order.indexOf(a.id)
        const bi = order.indexOf(b.id)
        if (ai === -1 && bi === -1) return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
    }
    return [...displayedScripts].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [displayedScripts, activeProject])

  const handleScriptDrop = async (fromId: string, toId: string): Promise<void> => {
    if (!activeProject || fromId === toId) return
    const order = [...activeProject.enabledScriptIds]
    const fromIdx = order.indexOf(fromId)
    const toIdx = order.indexOf(toId)
    if (fromIdx === -1 || toIdx === -1) return
    order.splice(fromIdx, 1)
    order.splice(toIdx, 0, fromId)
    const updated = await window.electronAPI.updateProject(activeProject.id, {
      enabledScriptIds: order
    })
    if (updated) updateProjectInStore(updated)
  }

  const handleCreate = async (): Promise<void> => {
    if (!newName.trim()) return
    const script = await window.electronAPI.createScript(
      newName.trim(),
      activeProject?.id ?? null
    )
    addScriptToStore(script)

    // Auto-enable this script in the active project
    if (activeProject) {
      const updated = await window.electronAPI.updateProject(activeProject.id, {
        enabledScriptIds: [...activeProject.enabledScriptIds, script.id]
      })
      if (updated) {
        updateProjectInStore(updated)
      }
    }

    onSelectScript(script)
    setNewName('')
    setCreating(false)
  }

  const handleRemoveFromProject = async (e: React.MouseEvent, script: Script): Promise<void> => {
    e.stopPropagation()
    if (!activeProject) return
    const updated = await window.electronAPI.updateProject(activeProject.id, {
      enabledScriptIds: activeProject.enabledScriptIds.filter((id) => id !== script.id)
    })
    if (updated) {
      updateProjectInStore(updated)
    }
  }

  const handleDelete = useCallback(async (script: Script): Promise<void> => {
    await window.electronAPI.deleteScript(script.id)
    removeScriptFromStore(script.id)
    setConfirmDelete(null)
  }, [removeScriptFromStore])

  const handleDuplicate = async (e: React.MouseEvent, script: Script): Promise<void> => {
    e.stopPropagation()
    const copy = await window.electronAPI.duplicateScript(script.id)
    if (copy) {
      addScriptToStore(copy)

      // Auto-enable the duplicate in the active project
      if (activeProject) {
        const updated = await window.electronAPI.updateProject(activeProject.id, {
          enabledScriptIds: [...activeProject.enabledScriptIds, copy.id]
        })
        if (updated) {
          updateProjectInStore(updated)
        }
      }

      onSelectScript(copy)
    }
  }

  const executeScript = async (
    script: Script,
    forceNew: boolean,
    inputValues: WorkflowInputValues = {}
  ): Promise<void> => {
    const hasActiveRunInSession = (sessionId: string): boolean => {
      const run = useWorkflowRunnerStore.getState().runsBySession[sessionId]
      return Boolean(run && !isTerminalRunStatus(run.status))
    }

    const plan = buildScriptExecutionPlan(script, { inputValues })
    if (plan.steps.length === 0) return

    const envOverrides = useProjectStore.getState().getActiveEnvOverrides()
    let sessionId = forceNew ? null : activeProjectSessionId
    if (!sessionId) {
      sessionId = await createProjectTerminalSession(
        activeProject,
        addSession,
        envOverrides
      )
    } else if (!forceNew) {
      sessionId = await ensureProjectExecutionSession(
        activeProject,
        sessionId,
        (candidateId) =>
          useTerminalStore.getState().sessions.find((session) => session.id === candidateId)?.mode ?? null,
        addSession,
        envOverrides
      )
      if (hasActiveRunInSession(sessionId)) {
        sessionId = await createProjectTerminalSession(
          activeProject,
          addSession,
          envOverrides
        )
      }
    }
    setTerminalVisible(true)
    const startedRun = startWorkflowRun({
      script,
      sessionId: sessionId!,
      inputValues
    })
    if (!startedRun) {
      const fallbackSessionId = await createProjectTerminalSession(
        activeProject,
        addSession,
        envOverrides
      )
      startWorkflowRun({
        script,
        sessionId: fallbackSessionId,
        inputValues
      })
    }
  }

  const maybeRunScript = (script: Script, forceNew: boolean): void => {
    const hasPreparation =
      script.inputs.length > 0 || buildScriptPreparationSteps(script).length > 0

    if (hasPreparation) {
      setPendingRun({ script, forceNew })
      return
    }

    void executeScript(script, forceNew)
  }

  const handleRunScript = (e: React.MouseEvent, script: Script): void => {
    e.stopPropagation()
    maybeRunScript(script, false)
  }

  const handleImport = async (): Promise<void> => {
    const imported = await window.electronAPI.importScript(activeProject?.id ?? null)
    if (imported) {
      addScriptToStore(imported)
      if (activeProject) {
        const updated = await window.electronAPI.updateProject(activeProject.id, {
          enabledScriptIds: [...activeProject.enabledScriptIds, imported.id]
        })
        if (updated) {
          updateProjectInStore(updated)
        }
      }
      onSelectScript(imported)
    }
  }

  const handleExport = async (e: React.MouseEvent, script: Script): Promise<void> => {
    e.stopPropagation()
    await window.electronAPI.exportScript(script.id)
  }

  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project.name])),
    [projects]
  )

  const handleSaveScripts = async (selections: ScriptSelection[]): Promise<void> => {
    if (!activeProject) return

    const nextEnabledScriptIds: string[] = []

    for (const selection of selections) {
      const script = scripts.find((entry) => entry.id === selection.scriptId)
      if (!script) continue

      const isForeignProjectScript =
        script.projectId !== null && script.projectId !== activeProject.id
      const shouldClone =
        selection.mode === 'clone' && (script.projectId === null || isForeignProjectScript)

      if (shouldClone) {
        const clone = await window.electronAPI.cloneScriptToProject(script.id, activeProject.id)
        if (clone) {
          addScriptToStore(clone)
          nextEnabledScriptIds.push(clone.id)
        }
        continue
      }

      nextEnabledScriptIds.push(script.id)
    }

    const updated = await window.electronAPI.updateProject(activeProject.id, {
      enabledScriptIds: [...new Set(nextEnabledScriptIds)]
    })
    if (updated) {
      updateProjectInStore(updated)
    }
    setScriptSelectorOpen(false)
  }

  const getExecutableStepCount = (script: Script): number => buildScriptExecutionPlan(script).steps.length

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {/* Create new / Add scripts */}
      <div className="p-3 border-b border-surface-border">
        {creating ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') {
                  setCreating(false)
                  setNewName('')
                }
              }}
              placeholder={t('placeholders.scriptName')}
              className="tv-input"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="tv-btn-accent flex-1"
              >
                {t('actions.create')}
              </button>
              <button
                onClick={() => {
                  setCreating(false)
                  setNewName('')
                }}
                className="tv-btn-ghost"
              >
                {t('actions.cancel')}
              </button>
            </div>
          </div>
        ) : activeProject ? (
          <div className="flex gap-2">
            <button
              onClick={() => setScriptSelectorOpen(true)}
              className="tv-btn-dashed flex-1"
            >
              <Plus size={14} />
              {t('actions.addScript')}
            </button>
            <button
              onClick={() => setCreating(true)}
              className="tv-btn-dashed px-2.5"
              title={t('actions.createNewScript')}
            >
              <ScrollText size={14} />
            </button>
            <button
              onClick={handleImport}
              className="tv-btn-dashed px-2.5"
              title={t('actions.importTvflow')}
            >
              <Download size={14} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setCreating(true)}
              className="tv-btn-dashed flex-1"
            >
              <Plus size={14} />
              {t('actions.newScript')}
            </button>
            <button
              onClick={handleImport}
              className="tv-btn-dashed px-2.5"
              title={t('actions.importTvflow')}
            >
              <Download size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Script list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pt-2 pb-12">
        {sorted.length === 0 ? (
          <div className="text-center text-gray-600 text-sm py-8">
            <ScrollText size={24} className="mx-auto mb-2 text-gray-700" />
            {activeProject ? (
              <>
                <p>{t('empty.projectTitle')}</p>
                <p className="text-xs mt-1">{t('empty.projectDescription')}</p>
                <button
                  onClick={() => setScriptSelectorOpen(true)}
                  className="tv-btn-dashed mt-3 text-xs"
                >
                  <Plus size={12} />
                  {t('actions.addScript')}
                </button>
              </>
            ) : (
              <>
                <p>{t('empty.globalTitle')}</p>
                <p className="text-xs mt-1">{t('empty.globalDescription')}</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {sorted.map((script) => {
              const runCount = runningScriptCounts.get(script.id) ?? 0
              const isRunning = runCount > 0

              return (
                <button
                  key={script.id}
                  draggable={!!activeProject}
                  onClick={() => onSelectScript(script)}
                  onDragStart={() => setDragScriptId(script.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverScriptId(script.id) }}
                  onDrop={() => {
                    if (dragScriptId && dragScriptId !== script.id) void handleScriptDrop(dragScriptId, script.id)
                    setDragScriptId(null)
                    setDragOverScriptId(null)
                  }}
                  onDragEnd={() => { setDragScriptId(null); setDragOverScriptId(null) }}
                  className={clsx(
                    'tv-list-card w-full text-left px-3 py-2.5 text-sm group',
                    activeScript?.id === script.id
                      ? 'bg-accent/20 text-accent-light border border-accent/30'
                      : 'text-gray-300',
                    dragOverScriptId === script.id && dragScriptId !== script.id && 'border-t-2 border-t-accent'
                  )}
                >
                <div className="flex items-center gap-2">
                  <ScrollText size={13} className="text-gray-500 shrink-0" />
                  <span className="flex-1 truncate font-medium">{script.name}</span>
                  <div className="flex items-center gap-0.5 text-gray-600">
                    <span
                      onClick={(e) => {
                        handleRunScript(e, script)
                      }}
                      className={clsx(
                        'tv-btn-icon-sm',
                        isRunning
                          ? 'text-accent-light animate-pulse'
                          : 'text-gray-500 hover:text-safe'
                      )}
                      title={
                        isRunning
                          ? t('meta.running', { count: runCount })
                          : t('meta.runCommand', { count: getExecutableStepCount(script) })
                      }
                    >
                      <Play size={11} />
                    </span>
                    <span
                      onClick={(e) => handleExport(e, script)}
                      className="tv-btn-icon-sm"
                      title={t('actions.exportTvflow')}
                    >
                      <Share2 size={11} />
                    </span>
                    <span
                      onClick={(e) => handleDuplicate(e, script)}
                      className="tv-btn-icon-sm"
                      title={t('actions.duplicate')}
                    >
                      <Copy size={11} />
                    </span>
                    {activeProject && (
                      <span
                        onClick={(e) => handleRemoveFromProject(e, script)}
                        className="tv-btn-icon-sm"
                        title={t('actions.removeFromProject')}
                      >
                        <X size={11} />
                      </span>
                    )}
                    <span
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(script) }}
                      className="tv-btn-icon-sm hover:text-destructive"
                      title={t('actions.deletePermanently')}
                    >
                      <Trash2 size={11} />
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                  <span className="tv-pill normal-case tracking-normal">
                    {t('meta.step', { count: script.steps.length })}
                  </span>
                  <span className="tv-pill normal-case tracking-normal">
                    {script.projectId === null
                      ? t('meta.global')
                      : script.projectId === activeProject?.id
                        ? t('meta.thisProject')
                        : projectNameById[script.projectId] ?? t('meta.otherProject')}
                  </span>
                  {script.inputs.length > 0 && (
                    <span className="tv-pill normal-case tracking-normal">
                      {t('meta.input', { count: script.inputs.length })}
                    </span>
                  )}
                  {script.description && <span className="truncate min-w-0 flex-1">{script.description}</span>}
                  {script.lastRunAt && (
                    <span className="flex items-center gap-1 ml-auto shrink-0">
                      <Clock size={10} />
                      {formatDate(script.lastRunAt, settings)}
                    </span>
                  )}
                </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {scriptSelectorOpen && activeProject && (
        <ScriptSelector
          activeProjectId={activeProject.id}
          projectNameById={projectNameById}
          enabledScriptIds={activeProject.enabledScriptIds}
          allScripts={scripts}
          onSave={handleSaveScripts}
          onCreateNew={(name) => {
            setScriptSelectorOpen(false)
            if (name) {
              setNewName(name)
              void (async () => {
                const script = await window.electronAPI.createScript(
                  name,
                  activeProject?.id ?? null
                )
                addScriptToStore(script)
                if (activeProject) {
                  const updated = await window.electronAPI.updateProject(activeProject.id, {
                    enabledScriptIds: [...activeProject.enabledScriptIds, script.id]
                  })
                  if (updated) updateProjectInStore(updated)
                }
                onSelectScript(script)
                setNewName('')
              })()
            } else {
              setCreating(true)
            }
          }}
          onClose={() => setScriptSelectorOpen(false)}
        />
      )}

      {pendingRun && (
        <WorkflowRunDialog
          script={pendingRun.script}
          title={t('run.title', { name: pendingRun.script.name })}
          confirmLabel={t('actions.runWorkflow')}
          onCancel={() => setPendingRun(null)}
          onConfirm={(values) => {
            const run = pendingRun
            setPendingRun(null)
            void executeScript(run.script, run.forceNew, values)
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={t('delete.title')}
          message={t('delete.message', { name: confirmDelete.name })}
          onConfirm={() => void handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
