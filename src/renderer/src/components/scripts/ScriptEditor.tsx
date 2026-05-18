import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Play,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Plus,
  Clock,
  ScrollText,
  AlertTriangle,
  X,
  Share2,
  ChevronsRight,
} from 'lucide-react'
import clsx from 'clsx'
import { useScriptStore } from '../../store/script-store'
import { resolveProjectTerminalContext, useTerminalStore } from '../../store/terminal-store'
import { useProjectStore } from '../../store/project-store'
import { useSettingsStore } from '../../store/settings-store'
import { isTerminalRunStatus, useWorkflowRunnerStore } from '../../store/workflow-runner-store'
import { HelpTip } from '../ui/HelpTip'
import {
  isScriptApprovalStep,
  isScriptCommandStep,
  type Script,
  type ScriptStep
} from '../../../../shared/script-schema'
import type { WorkflowInputValues } from '../../../../shared/workflow-execution'
import { buildScriptExecutionPlan, buildScriptPreparationSteps } from '../../../../shared/workflow-execution'
import { renameWorkflowStepPlaceholders } from '../../../../shared/workflow-validation'
import { WorkflowInputEditor } from './WorkflowInputEditor'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { WorkflowRunDialog } from './WorkflowRunDialog'
import { createProjectTerminalSession, ensureProjectExecutionSession } from '../../lib/workspace-session'
import { formatDate } from '../../i18n/format'

export function ScriptEditor(): JSX.Element {
  const { t } = useTranslation('scripts')
  const activeScript = useScriptStore((s) => s.activeScript)
  const { updateScriptInStore, addScriptToStore, setActiveScript } = useScriptStore()
  const runsBySession = useWorkflowRunnerStore((s) => s.runsBySession)
  const startWorkflowRun = useWorkflowRunnerStore((s) => s.startRun)
  const { addSession, activeSessionId, setTerminalVisible } = useTerminalStore()
  const activeProject = useProjectStore((s) => s.activeProject)
  const { updateProjectInStore } = useProjectStore()
  const settings = useSettingsStore((s) => s.settings)
  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [addingStep, setAddingStep] = useState(false)
  const [newStepType, setNewStepType] = useState<'command' | 'approval' | 'note'>('command')
  const [newStepCmd, setNewStepCmd] = useState('')
  const [newStepLabel, setNewStepLabel] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [confirmDeleteStepId, setConfirmDeleteStepId] = useState<string | null>(null)
  const [pendingRun, setPendingRun] = useState<{
    forceNew: boolean
    fromIndex: number
    singleOnly: boolean
  } | null>(null)
  const activeRuns = useMemo(
    () => Object.values(runsBySession).filter((run) => !isTerminalRunStatus(run.status)),
    [runsBySession]
  )
  const { splitSessionId, sessions } = useTerminalStore()
  const { activeProjectSessionId } = useMemo(
    () => resolveProjectTerminalContext(sessions, activeProject?.id ?? null, activeSessionId, splitSessionId),
    [activeProject?.id, activeSessionId, sessions, splitSessionId]
  )
  const activeScriptRun = useMemo(() => {
    if (!activeScript) return null

    return [...activeRuns]
      .filter((run) => run.script.id === activeScript.id)
      .sort((a, b) => {
        const aIsFocused = a.sessionId === activeSessionId ? 1 : 0
        const bIsFocused = b.sessionId === activeSessionId ? 1 : 0
        if (aIsFocused !== bIsFocused) return bIsFocused - aIsFocused
        return b.startedAt.localeCompare(a.startedAt)
      })[0] ?? null
  }, [activeRuns, activeScript, activeSessionId])
  const runningStepIdx =
    activeScriptRun?.steps[activeScriptRun.currentStepIndex]?.sourceIndex ?? null

  if (!activeScript) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
        <ScrollText size={48} className="text-surface-lighter" />
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-400">{t('editor.noSelectionTitle')}</h2>
          <p className="text-sm mt-1">{t('editor.noSelectionDescription')}</p>
        </div>
      </div>
    )
  }

  const saveUpdates = async (updates: Partial<Script>): Promise<void> => {
    const updated = await window.electronAPI.updateScript(activeScript.id, updates)
    if (updated) updateScriptInStore(updated)
  }

  const scriptScopeLabel =
    activeScript.projectId === null
      ? t('meta.global')
      : activeProject && activeScript.projectId === activeProject.id
        ? t('meta.thisProject')
        : t('meta.otherProject')

  const canDetachToProject =
    !!activeProject &&
    (activeScript.projectId === null || activeScript.projectId !== activeProject.id)

  const handleDetachToProject = useCallback(async (): Promise<void> => {
    if (!activeProject) return

    const clone = await window.electronAPI.cloneScriptToProject(activeScript.id, activeProject.id)
    if (!clone) return

    addScriptToStore(clone)

    const nextEnabledScriptIds = activeProject.enabledScriptIds.includes(activeScript.id)
      ? activeProject.enabledScriptIds.map((id) => (id === activeScript.id ? clone.id : id))
      : [...activeProject.enabledScriptIds, clone.id]

    const updatedProject = await window.electronAPI.updateProject(activeProject.id, {
      enabledScriptIds: [...new Set(nextEnabledScriptIds)]
    })
    if (updatedProject) {
      updateProjectInStore(updatedProject)
    }

    setActiveScript(clone)
  }, [activeProject, activeScript.id, addScriptToStore, setActiveScript, updateProjectInStore])

  const moveStep = async (index: number, direction: -1 | 1): Promise<void> => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= activeScript.steps.length) return
    const ids = activeScript.steps.map((s) => s.id)
    ;[ids[index], ids[newIndex]] = [ids[newIndex], ids[index]]
    const updated = await window.electronAPI.reorderScriptSteps(activeScript.id, ids)
    if (updated) updateScriptInStore(updated)
  }

  const removeStep = async (stepId: string): Promise<void> => {
    const updated = await window.electronAPI.removeStepFromScript(activeScript.id, stepId)
    if (updated) updateScriptInStore(updated)
  }

  const toggleStep = async (step: ScriptStep): Promise<void> => {
    const updatedSteps = activeScript.steps.map((s) =>
      s.id === step.id ? { ...s, enabled: !s.enabled } : s
    )
    await saveUpdates({ steps: updatedSteps })
  }

  const updateStepLabel = async (step: ScriptStep, label: string): Promise<void> => {
    const updatedSteps = activeScript.steps.map((s) =>
      s.id === step.id ? { ...s, label } : s
    )
    await saveUpdates({ steps: updatedSteps })
  }

  const updateStepContent = async (step: ScriptStep, content: string): Promise<void> => {
    const updatedSteps = activeScript.steps.map((s) => {
      if (s.id !== step.id) return s
      if (s.type === 'command') return { ...s, commandString: content }
      if (s.type === 'approval') return { ...s, message: content }
      return { ...s, content }
    })
    await saveUpdates({ steps: updatedSteps })
  }

  const updateStepContinueOnError = async (step: ScriptStep): Promise<void> => {
    if (!isScriptCommandStep(step)) return
    const updatedSteps = activeScript.steps.map((s) =>
      s.id === step.id && s.type === 'command'
        ? { ...s, continueOnError: !s.continueOnError }
        : s
    )
    await saveUpdates({ steps: updatedSteps })
  }

  const updateStepDelayMs = async (step: ScriptStep, delayMs: number): Promise<void> => {
    if (!isScriptCommandStep(step)) return
    const updatedSteps = activeScript.steps.map((s) =>
      s.id === step.id && s.type === 'command'
        ? { ...s, delayMs: Math.max(0, delayMs) }
        : s
    )
    await saveUpdates({ steps: updatedSteps })
  }

  const updateStepRetryCount = async (step: ScriptStep, retryCount: number): Promise<void> => {
    if (!isScriptCommandStep(step)) return
    const updatedSteps = activeScript.steps.map((s) =>
      s.id === step.id && s.type === 'command'
        ? { ...s, retryCount: Math.max(0, retryCount) }
        : s
    )
    await saveUpdates({ steps: updatedSteps })
  }

  const toggleApprovalConfirmation = async (step: ScriptStep): Promise<void> => {
    if (!isScriptApprovalStep(step)) return
    const updatedSteps = activeScript.steps.map((s) =>
      s.id === step.id && s.type === 'approval'
        ? { ...s, requireConfirmation: !s.requireConfirmation }
        : s
    )
    await saveUpdates({ steps: updatedSteps })
  }

  const addManualStep = async (): Promise<void> => {
    if (!newStepCmd.trim()) return
    const updated =
      newStepType === 'command'
        ? await window.electronAPI.addStepToScript(
            activeScript.id,
            newStepCmd.trim(),
            null,
            newStepLabel.trim() || undefined
          )
        : newStepType === 'approval'
          ? await window.electronAPI.addApprovalStepToScript(
              activeScript.id,
              newStepCmd.trim(),
              newStepLabel.trim() || undefined
            )
          : await window.electronAPI.addNoteStepToScript(
              activeScript.id,
              newStepCmd.trim(),
              newStepLabel.trim() || undefined
            )
    if (updated) updateScriptInStore(updated)
    setNewStepCmd('')
    setNewStepLabel('')
    setNewStepType('command')
    setAddingStep(false)
  }

  const executeRun = useCallback(async (
    forceNew: boolean,
    fromIndex = 0,
    singleOnly = false,
    inputValues: WorkflowInputValues = {}
  ): Promise<void> => {
    const hasActiveRunInSession = (sessionId: string): boolean => {
      const run = useWorkflowRunnerStore.getState().runsBySession[sessionId]
      return Boolean(run && !isTerminalRunStatus(run.status))
    }

    const plan = buildScriptExecutionPlan(activeScript, { fromIndex, singleOnly, inputValues })
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
      script: activeScript,
      sessionId: sessionId!,
      inputValues,
      fromIndex,
      singleOnly
    })
    if (!startedRun) {
      const fallbackSessionId = await createProjectTerminalSession(
        activeProject,
        addSession,
        envOverrides
      )
      startWorkflowRun({
        script: activeScript,
        sessionId: fallbackSessionId,
        inputValues,
        fromIndex,
        singleOnly
      })
    }
  }, [activeProjectSessionId, activeScript, activeProject, addSession, setTerminalVisible, startWorkflowRun])

  const startRun = useCallback((
    forceNew: boolean,
    fromIndex = 0,
    singleOnly = false
  ): void => {
    const hasPreparation =
      activeScript.inputs.length > 0 ||
      buildScriptPreparationSteps(activeScript, { fromIndex, singleOnly }).length > 0

    if (hasPreparation) {
      setPendingRun({ forceNew, fromIndex, singleOnly })
      return
    }

    void executeRun(forceNew, fromIndex, singleOnly)
  }, [activeScript, executeRun])

  const handleRunAll = useCallback((): void => {
    startRun(false)
  }, [startRun])

  /** Run steps starting from fromIndex (or just one step if singleOnly) */
  const runStepsFrom = useCallback(async (fromIndex: number, singleOnly: boolean): Promise<void> => {
    startRun(false, fromIndex, singleOnly)
  }, [startRun])

  const handleDragReorder = async (fromIndex: number, toIndex: number): Promise<void> => {
    if (fromIndex === toIndex) return
    const ids = activeScript.steps.map((s) => s.id)
    const [removed] = ids.splice(fromIndex, 1)
    ids.splice(toIndex, 0, removed)
    const updated = await window.electronAPI.reorderScriptSteps(activeScript.id, ids)
    if (updated) updateScriptInStore(updated)
  }

  const handleCopyAll = async (): Promise<void> => {
    const allCommands = activeScript.steps
      .filter((s) => s.enabled && s.type === 'command')
      .map((s) => s.commandString)
      .join('\n')
    await window.electronAPI.writeClipboard(allCommands)
  }

  const enabledCount = activeScript.steps.filter((s) => s.enabled).length
  const executableCount = buildScriptExecutionPlan(activeScript).steps.length

  return (
    <div className="h-full flex flex-col bg-surface-light">
      {/* Header */}
      <div className="p-5 pb-3 border-b border-surface-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editingName ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (name.trim()) saveUpdates({ name: name.trim() })
                  setEditingName(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (name.trim()) saveUpdates({ name: name.trim() })
                    setEditingName(false)
                  }
                }}
                className="text-xl font-bold font-mono text-gray-200 bg-transparent border-b-2 border-accent focus:outline-none w-full"
                autoFocus
              />
            ) : (
              <h1
                className="text-xl font-bold font-mono text-gray-200 cursor-pointer hover:text-accent-light transition-colors flex items-center gap-2"
                onClick={() => {
                  setName(activeScript.name)
                  setEditingName(true)
                }}
              >
                {activeScript.name}
                <Pencil size={13} className="text-gray-600" />
              </h1>
            )}

            {editingDesc ? (
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onBlur={() => {
                  saveUpdates({ description: desc.trim() })
                  setEditingDesc(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveUpdates({ description: desc.trim() })
                    setEditingDesc(false)
                  }
                }}
                placeholder={t('editor.addDescriptionPlaceholder')}
                className="mt-2 text-sm text-gray-400 bg-transparent border-b border-surface-border focus:outline-none focus:border-accent w-full max-w-lg"
                autoFocus
              />
            ) : (
              <p
                className="text-sm text-gray-500 mt-2 cursor-pointer hover:text-gray-300 transition-colors"
                onClick={() => {
                  setDesc(activeScript.description)
                  setEditingDesc(true)
                }}
              >
                {activeScript.description || t('editor.clickToAddDescription')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="tv-pill normal-case tracking-normal">
              {scriptScopeLabel}
            </span>
            {canDetachToProject && (
              <HelpTip
                label={activeScript.projectId === null ? t('editor.detachToProject') : t('editor.cloneToProject')}
                description={
                  activeScript.projectId === null
                    ? t('editor.detachToProjectHelp')
                    : t('editor.cloneToProjectHelp')
                }
              >
                <button
                  onClick={() => void handleDetachToProject()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-xs text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors"
                >
                  <Copy size={12} />
                  {activeScript.projectId === null
                    ? t('editor.detachToProject')
                    : t('editor.cloneToProject')}
                </button>
              </HelpTip>
            )}
            <button
              onClick={() => window.electronAPI.exportScript(activeScript.id)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-accent-light hover:bg-surface-light transition-colors"
              title={t('actions.exportTvflow')}
            >
              <Share2 size={14} />
            </button>
            <span className="text-xs text-gray-500">
              {t('meta.step', { count: enabledCount })}
            </span>
            {activeScript.inputs.length > 0 && (
              <span className="text-xs text-gray-500">
                {t('meta.input', { count: activeScript.inputs.length })}
              </span>
            )}
            {activeScript.lastRunAt && (
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <Clock size={10} />
                {formatDate(activeScript.lastRunAt, settings)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto p-6 pb-32">
        {activeScript.steps.length > 0 && (
          <div className="space-y-2">
            {activeScript.steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                totalSteps={activeScript.steps.length}
                isRunning={runningStepIdx === index}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index && draggedIndex !== index}
                onMove={(dir) => moveStep(index, dir)}
                onRemove={() => setConfirmDeleteStepId(step.id)}
                onToggle={() => toggleStep(step)}
                onUpdateLabel={(label) => updateStepLabel(step, label)}
                onUpdateContent={(content) => updateStepContent(step, content)}
                onUpdateDelayMs={(delayMs) => updateStepDelayMs(step, delayMs)}
                onUpdateRetryCount={(retryCount) => updateStepRetryCount(step, retryCount)}
                onToggleContinueOnError={() => updateStepContinueOnError(step)}
                onToggleRequireConfirmation={() => toggleApprovalConfirmation(step)}
                disableRunActions={false}
                onRunStep={isScriptCommandStep(step) ? () => runStepsFrom(index, true) : undefined}
                onRunFromHere={() => runStepsFrom(index, false)}
                onChangeType={(newType) => {
                  const updatedSteps = activeScript.steps.map((s) => {
                    if (s.id !== step.id) return s
                    if (newType === 'command') return { id: s.id, type: 'command' as const, commandString: '', commandId: null, label: s.label || t('editor.generatedStepLabel', { index: index + 1 }), continueOnError: false, delayMs: 0, enabled: s.enabled, retryCount: 0 }
                    if (newType === 'approval') return { id: s.id, type: 'approval' as const, label: s.label || t('editor.approvalRequired'), enabled: s.enabled, message: '', requireConfirmation: true }
                    return { id: s.id, type: 'note' as const, label: s.label || t('editor.stepTypes.note'), enabled: s.enabled, content: '' }
                  })
                  void saveUpdates({ steps: updatedSteps })
                }}
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={() => setDragOverIndex(index)}
                onDrop={() => {
                  if (draggedIndex !== null) handleDragReorder(draggedIndex, index)
                  setDraggedIndex(null)
                  setDragOverIndex(null)
                }}
                onDragEnd={() => {
                  setDraggedIndex(null)
                  setDragOverIndex(null)
                }}
              />
            ))}
          </div>
        )}

        {/* Add step manually */}
        <div className="mt-4">
          {addingStep ? (
            <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {(['command', 'approval', 'note'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNewStepType(type)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs transition-colors border',
                      newStepType === type
                        ? 'border-accent/40 bg-accent/10 text-accent-light'
                        : 'border-surface-border text-gray-400 hover:text-gray-200 hover:border-gray-500'
                    )}
                  >
                    {t(`editor.stepTypes.${type}`)}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={newStepLabel}
                onChange={(e) => setNewStepLabel(e.target.value)}
                placeholder={t('editor.stepLabelPlaceholder')}
                className="w-full bg-surface-light border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
              {newStepType === 'command' ? (
                <input
                  type="text"
                  value={newStepCmd}
                  onChange={(e) => setNewStepCmd(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addManualStep()
                  }}
                  placeholder={t('editor.commandPlaceholder')}
                  className="w-full bg-surface-light border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono"
                  autoFocus
                />
              ) : (
                <textarea
                value={newStepCmd}
                onChange={(e) => setNewStepCmd(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') addManualStep()
                }}
                placeholder={
                  newStepType === 'approval'
                    ? t('editor.approvalPlaceholder')
                    : t('editor.notePlaceholder')
                }
                rows={3}
                className="w-full bg-surface-light border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                autoFocus
              />
              )}
              <div className="flex gap-2">
                <button
                  onClick={addManualStep}
                  className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-light text-white text-xs font-medium transition-colors"
                >
                  {t('editor.addStepType', { type: t(`editor.stepTypes.${newStepType}`) })}
                </button>
                <button
                  onClick={() => {
                    setAddingStep(false)
                    setNewStepCmd('')
                    setNewStepLabel('')
                    setNewStepType('command')
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {t('actions.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingStep(true)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-accent-light transition-colors px-2 py-2"
            >
              <Plus size={14} />
              {t('editor.addStep')}
            </button>
          )}
        </div>

        <div className="mt-6">
          <WorkflowInputEditor
            inputs={activeScript.inputs}
            steps={activeScript.steps.map((s) => ({
              label: s.label,
              commandString: isScriptCommandStep(s) ? s.commandString : undefined
            }))}
            onChange={(inputs, renamedInputs) => {
              void saveUpdates({
                inputs,
                steps: renamedInputs
                  ? renameWorkflowStepPlaceholders(activeScript.steps, renamedInputs)
                  : activeScript.steps
              })
            }}
          />
        </div>
      </div>

      {/* Bottom action bar */}
      {activeScript.steps.length > 0 && (
        <div className="sticky bottom-0 bg-surface border-t border-surface-border px-4 py-2 shadow-lg shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="flex-1 text-xs text-gray-400">
              {t('editor.enabledSummary', {
                enabled: enabledCount,
                total: activeScript.steps.length,
                executable: executableCount
              })}
            </div>
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-lighter border border-surface-border text-xs text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors"
              title={t('editor.copyAllTitle')}
            >
              <Copy size={13} />
              {t('editor.copyAll')}
            </button>
            <button
              onClick={handleRunAll}
              disabled={executableCount === 0}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
              title={t('editor.runAllTitle')}
            >
              <Play size={13} />
              {t('editor.runScript')}
            </button>
          </div>
        </div>
      )}
      {pendingRun && (
        <WorkflowRunDialog
          script={activeScript}
          fromIndex={pendingRun.fromIndex}
          singleOnly={pendingRun.singleOnly}
          title={pendingRun.singleOnly ? t('editor.runStep') : pendingRun.fromIndex > 0 ? t('editor.runFromHere') : t('run.title', { name: activeScript.name })}
          confirmLabel={pendingRun.singleOnly ? t('editor.runStep') : t('editor.runWorkflow')}
          onCancel={() => setPendingRun(null)}
          onConfirm={(values) => {
            const run = pendingRun
            setPendingRun(null)
            void executeRun(run.forceNew, run.fromIndex, run.singleOnly, values)
          }}
        />
      )}
      {confirmDeleteStepId && (
        <ConfirmDialog
          title={t('editor.deleteStepTitle')}
          message={t('editor.deleteStepMessage')}
          confirmLabel={t('editor.deleteStepTitle')}
          onConfirm={() => {
            void removeStep(confirmDeleteStepId)
            setConfirmDeleteStepId(null)
          }}
          onCancel={() => setConfirmDeleteStepId(null)}
        />
      )}
    </div>
  )
}

function StepCard({
  step,
  index,
  totalSteps,
  isRunning,
  isDragging,
  isDragOver,
  onMove,
  onRemove,
  onToggle,
  onUpdateLabel,
  onUpdateContent,
  onUpdateDelayMs,
  onUpdateRetryCount,
  onToggleContinueOnError,
  onToggleRequireConfirmation,
  disableRunActions,
  onRunStep,
  onRunFromHere,
  onChangeType,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: {
  step: ScriptStep
  index: number
  totalSteps: number
  isRunning: boolean
  isDragging: boolean
  isDragOver: boolean
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onToggle: () => void
  onUpdateLabel: (label: string) => void
  onUpdateContent: (content: string) => void
  onUpdateDelayMs: (delayMs: number) => void
  onUpdateRetryCount: (retryCount: number) => void
  onToggleContinueOnError: () => void
  onToggleRequireConfirmation: () => void
  disableRunActions: boolean
  onRunStep?: () => void
  onRunFromHere: () => void
  onChangeType?: (newType: 'command' | 'approval' | 'note') => void
  onChangeType?: (newType: 'command' | 'approval' | 'note') => void
  onDragStart: () => void
  onDragOver: () => void
  onDrop: () => void
  onDragEnd: () => void
}): JSX.Element {
  const { t } = useTranslation('scripts')
  const [editingLabel, setEditingLabel] = useState(false)
  const [editingBody, setEditingBody] = useState(() => {
    // Auto-enter edit mode for empty command steps
    if (step.type === 'command' && !step.commandString) return true
    return false
  })
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const [labelValue, setLabelValue] = useState(step.label)
  const [bodyValue, setBodyValue] = useState(
    step.type === 'command' ? step.commandString : step.type === 'approval' ? step.message : step.content
  )
  const [delayValue, setDelayValue] = useState(step.type === 'command' ? String(step.delayMs) : '0')
  const [retryValue, setRetryValue] = useState(step.type === 'command' ? String(step.retryCount) : '0')

  const bodyText =
    step.type === 'command' ? step.commandString : step.type === 'approval' ? step.message : step.content

  useEffect(() => {
    setLabelValue(step.label)
    setBodyValue(bodyText)
    if (step.type === 'command') {
      setDelayValue(String(step.delayMs))
      setRetryValue(String(step.retryCount))
    }
  }, [bodyText, step])

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onDragOver()
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
      onDragEnd={onDragEnd}
      className={clsx(
        'bg-surface border rounded-xl px-3 py-2 transition-all',
        isDragging && 'opacity-40',
        isDragOver && 'border-accent shadow-lg shadow-accent/10 translate-y-0.5',
        isRunning && !isDragOver
          ? 'border-accent shadow-lg shadow-accent/10'
          : !isDragging && !isDragOver
            ? step.enabled
              ? 'border-surface-border'
              : 'border-surface-border opacity-50'
            : ''
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Step number and drag */}
        <div className="flex flex-col items-center gap-1 pt-0.5 cursor-grab active:cursor-grabbing">
          <span className="text-[11px] font-mono text-gray-600 w-5 text-center">{index + 1}</span>
          <GripVertical size={12} className="text-gray-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Label */}
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            {editingLabel ? (
              <input
                type="text"
                value={labelValue}
                onChange={(e) => setLabelValue(e.target.value)}
                onBlur={() => {
                  onUpdateLabel(labelValue.trim())
                  setEditingLabel(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdateLabel(labelValue.trim())
                    setEditingLabel(false)
                  }
                  if (e.key === 'Escape') {
                    setLabelValue(step.label)
                    setEditingLabel(false)
                  }
                }}
                className="bg-surface-light border border-accent rounded px-2 py-1 text-[11px] text-gray-200 focus:outline-none"
                autoFocus
              />
            ) : step.label.trim() ? (
              <span
                className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-300 truncate cursor-pointer hover:text-accent-light transition-colors"
                onClick={() => {
                  setLabelValue(step.label)
                  setEditingLabel(true)
                }}
              >
                {step.label}
              </span>
            ) : (
              <button
                type="button"
                className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-600 hover:text-accent-light transition-colors"
                onClick={() => {
                  setLabelValue('')
                  setEditingLabel(true)
                }}
              >
                {t('step.addLabel')}
              </button>
            )}
            {(() => {
              const isEmpty = step.type === 'command' ? !step.commandString : step.type === 'approval' ? !step.message : !step.content
              const canSwitch = isEmpty && onChangeType
              return (
                <span className="relative">
                  <span
                    className={clsx(
                      'text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-[0.16em]',
                      step.type === 'command'
                        ? 'border-accent/20 bg-accent/10 text-accent-light'
                        : step.type === 'approval'
                          ? 'border-caution/20 bg-caution/10 text-caution'
                          : 'border-surface-border bg-surface-light text-gray-400',
                      canSwitch && 'cursor-pointer hover:opacity-80'
                    )}
                    onClick={canSwitch ? () => setShowTypeMenu(!showTypeMenu) : undefined}
                    title={canSwitch ? t('step.changeTypeTitle') : undefined}
                  >
                    {t(`editor.stepTypes.${step.type}`)}
                  </span>
                  {showTypeMenu && canSwitch && (
                    <div className="absolute top-full left-0 mt-1 z-20 rounded-lg border border-surface-border bg-surface-light shadow-lg py-1 min-w-[7rem]">
                      {(['command', 'approval', 'note'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => { onChangeType(type); setShowTypeMenu(false) }}
                          className={clsx(
                            'w-full text-left px-3 py-1.5 text-xs transition-colors',
                            type === step.type ? 'text-accent-light bg-accent/10' : 'text-gray-300 hover:bg-surface hover:text-gray-200'
                          )}
                        >
                          {t(`editor.stepTypes.${type}`)}
                        </button>
                      ))}
                    </div>
                  )}
                </span>
              )
            })()}
            {step.type === 'approval' && (
              <span
                className={clsx(
                  'text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-[0.16em]',
                  step.requireConfirmation
                    ? 'border-caution/20 bg-caution/10 text-caution'
                    : 'border-surface-border bg-surface-light text-gray-500'
                )}
              >
                {step.requireConfirmation ? t('step.manualConfirm') : t('step.autoCheckpoint')}
              </span>
            )}
            {step.type === 'command' && step.continueOnError && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-caution/10 text-caution border border-caution/20 uppercase tracking-[0.16em]">
                {t('step.continueOnError')}
              </span>
            )}
            {isRunning && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/20 text-accent-light animate-pulse uppercase tracking-[0.16em]">
                {t('step.running')}
              </span>
            )}
          </div>

          {/* Body */}
          {editingBody ? (
            step.type === 'command' ? (
              <input
                type="text"
                value={bodyValue}
                onChange={(e) => setBodyValue(e.target.value)}
                onBlur={() => {
                  if (bodyValue.trim()) onUpdateContent(bodyValue.trim())
                  setEditingBody(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (bodyValue.trim()) onUpdateContent(bodyValue.trim())
                    setEditingBody(false)
                  }
                  if (e.key === 'Escape') setEditingBody(false)
                }}
                className="w-full bg-surface-light border border-accent rounded px-2 py-1 text-[13px] font-mono text-gray-200 focus:outline-none"
                autoFocus
              />
            ) : (
              <textarea
                value={bodyValue}
                onChange={(e) => setBodyValue(e.target.value)}
                onBlur={() => {
                  if (bodyValue.trim()) onUpdateContent(bodyValue.trim())
                  setEditingBody(false)
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    if (bodyValue.trim()) onUpdateContent(bodyValue.trim())
                    setEditingBody(false)
                  }
                  if (e.key === 'Escape') setEditingBody(false)
                }}
                rows={3}
                className="w-full bg-surface-light border border-accent rounded px-2 py-1 text-[13px] text-gray-200 focus:outline-none"
                autoFocus
              />
            )
          ) : (
            step.type === 'command' ? (
              <div>
                <code
                  className={clsx(
                    'text-[13px] font-mono cursor-pointer hover:text-accent-light transition-colors block truncate leading-5',
                    step.commandString ? 'text-gray-200' : 'text-gray-500 italic'
                  )}
                  onClick={() => {
                    setBodyValue(step.commandString)
                    setEditingBody(true)
                  }}
                  title={t('step.clickToEdit')}
                >
                  {step.commandString || t('step.addCommand')}
                </code>
                {!step.commandString && (
                  <span className="text-[10px] text-gray-600 mt-0.5 block">{t('step.switchTypeHint')}</span>
                )}
              </div>
            ) : (
              <p
                className="text-[13px] text-gray-300 whitespace-pre-wrap leading-5 cursor-pointer hover:text-gray-200 transition-colors"
                onClick={() => {
                  setBodyValue(bodyText)
                  setEditingBody(true)
                }}
                title={t('step.clickToEdit')}
              >
                {bodyText || (step.type === 'approval' ? t('step.addApproval') : t('step.addNote'))}
              </p>
            )
          )}

        </div>

        {/* Actions */}
        <div className="shrink-0 flex flex-col items-end gap-1.5 pl-2">
          <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
            {onRunStep && (
              <button
                onClick={onRunStep}
                disabled={disableRunActions}
                className="p-1 rounded text-gray-600 hover:text-safe disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title={disableRunActions ? t('step.alreadyRunning') : t('step.runStepTitle')}
              >
                <Play size={12} />
              </button>
            )}
            <button
              onClick={onRunFromHere}
              disabled={disableRunActions}
              className="p-1 rounded text-gray-600 hover:text-safe disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={disableRunActions ? t('step.alreadyRunning') : t('step.runFromHereTitle')}
            >
              <ChevronsRight size={12} />
            </button>
            <div className="w-px h-3 bg-surface-border mx-0.5" />
            <button
              onClick={() => onMove(-1)}
              disabled={index === 0}
              className="p-1 rounded text-gray-600 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={t('step.moveUp')}
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => onMove(1)}
              disabled={index === totalSteps - 1}
              className="p-1 rounded text-gray-600 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={t('step.moveDown')}
            >
              <ChevronDown size={14} />
            </button>
            {step.type === 'command' && (
              <button
                onClick={onToggleContinueOnError}
                className={clsx(
                  'p-1 rounded transition-colors',
                  step.continueOnError ? 'text-caution' : 'text-gray-600 hover:text-gray-300'
                )}
                title={step.continueOnError ? t('step.willContinueOnError') : t('step.willStopOnError')}
              >
                <AlertTriangle size={14} />
              </button>
            )}
            <button
              onClick={onToggle}
              className={clsx(
                'p-1 rounded transition-colors',
                step.enabled ? 'text-safe' : 'text-gray-600'
              )}
              title={step.enabled ? t('step.disableStep') : t('step.enableStep')}
            >
              {step.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            </button>
            <button
              onClick={onRemove}
              className="p-1 rounded text-gray-600 hover:text-destructive transition-colors"
              title={t('step.removeStep')}
            >
              <X size={14} />
            </button>
          </div>

          {step.type === 'command' && (
            <div className="flex items-center justify-end gap-2 w-full">
              <label className="flex items-center gap-1 rounded-md border border-surface-border bg-surface-light/40 px-1.5 py-1">
                <span className="text-[9px] uppercase tracking-[0.16em] text-gray-500">{t('step.delay')}</span>
                <input
                  type="number"
                  min={0}
                  value={delayValue}
                  onChange={(e) => setDelayValue(e.target.value)}
                  onBlur={() => onUpdateDelayMs(Number(delayValue || '0'))}
                  className="w-12 bg-surface-light border border-surface-border rounded px-1.5 py-0.5 text-[11px] text-gray-200 focus:outline-none focus:border-accent"
                />
              </label>
              <label className="flex items-center gap-1 rounded-md border border-surface-border bg-surface-light/40 px-1.5 py-1">
                <span className="text-[9px] uppercase tracking-[0.16em] text-gray-500">{t('step.retries')}</span>
                <input
                  type="number"
                  min={0}
                  value={retryValue}
                  onChange={(e) => setRetryValue(e.target.value)}
                  onBlur={() => onUpdateRetryCount(Number(retryValue || '0'))}
                  className="w-10 bg-surface-light border border-surface-border rounded px-1.5 py-0.5 text-[11px] text-gray-200 focus:outline-none focus:border-accent"
                />
              </label>
            </div>
          )}

          {step.type === 'approval' && (
            <label className="w-full rounded-lg border border-surface-border bg-surface-light/40 px-2.5 py-2 text-[11px] text-gray-500 flex items-center gap-2">
              <input
                type="checkbox"
                checked={step.requireConfirmation}
                onChange={() => onToggleRequireConfirmation()}
                className="rounded border-surface-border bg-surface"
              />
              <span className="truncate">{t('step.pauseForConfirmation')}</span>
            </label>
          )}
        </div>
      </div>
    </div>
  )
}
