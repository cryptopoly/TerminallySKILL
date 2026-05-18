import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Play, ScrollText, X } from 'lucide-react'
import type { Script } from '../../../../shared/script-schema'
import type { WorkflowInputValues } from '../../../../shared/workflow-execution'
import {
  buildScriptExecutionPlan,
  buildScriptPreparationSteps,
  getScriptUnknownInputReferences,
  getMissingRequiredWorkflowInputs,
  getWorkflowInputInitialValues
} from '../../../../shared/workflow-execution'
import { getWorkflowInputValidationIssues } from '../../../../shared/workflow-validation'

interface WorkflowRunDialogProps {
  script: Script
  fromIndex?: number
  singleOnly?: boolean
  title: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: (values: WorkflowInputValues) => void
}

export function WorkflowRunDialog({
  script,
  fromIndex = 0,
  singleOnly = false,
  title,
  confirmLabel,
  onCancel,
  onConfirm
}: WorkflowRunDialogProps): JSX.Element {
  const { t } = useTranslation('scripts')
  const [values, setValues] = useState<WorkflowInputValues>(() =>
    getWorkflowInputInitialValues(script.inputs)
  )
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  useEffect(() => {
    setValues(getWorkflowInputInitialValues(script.inputs))
    setAttemptedSubmit(false)
  }, [script.id, script.updatedAt, fromIndex, singleOnly])

  const executionPlan = useMemo(
    () => buildScriptExecutionPlan(script, { fromIndex, singleOnly, inputValues: values }),
    [script, fromIndex, singleOnly, values]
  )

  const preparationSteps = useMemo(
    () => buildScriptPreparationSteps(script, { fromIndex, singleOnly, inputValues: values }),
    [script, fromIndex, singleOnly, values]
  )

  const missingInputs = getMissingRequiredWorkflowInputs(script.inputs, values)
  const invalidInputs = getWorkflowInputValidationIssues(script.inputs, values)
  const unknownPlaceholders = getScriptUnknownInputReferences(script, { fromIndex, singleOnly })
  const canRun =
    missingInputs.length === 0 &&
    invalidInputs.length === 0 &&
    unknownPlaceholders.length === 0 &&
    executionPlan.steps.length > 0

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4">
      <div className="bg-surface-light border border-surface-border rounded-2xl w-full max-w-2xl shadow-2xl shadow-black/40 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <ScrollText size={16} className="text-accent-light" />
            <div>
              <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('workflowRun.readyCommand', { count: executionPlan.steps.length })}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-surface-lighter text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {script.inputs.length > 0 && (
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">{t('workflowRun.inputs')}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {t('workflowRun.inputDescription', { example: '{{target}}' })}
                </p>
              </div>
              <div className="space-y-3">
                {script.inputs.map((input) => (
                  <div key={input.id} className="bg-surface border border-surface-border rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">{input.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-surface-border text-gray-500 uppercase tracking-wide">
                        {input.type}
                      </span>
                      {input.required && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent-light border border-accent/20 uppercase tracking-wide">
                          {t('workflowRun.required')}
                        </span>
                      )}
                    </div>
                    {input.description && <p className="text-xs text-gray-500">{input.description}</p>}
                    {input.type === 'boolean' ? (
                      <label className="flex items-center gap-3 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={Boolean(values[input.id])}
                          onChange={(e) =>
                            setValues((current) => ({ ...current, [input.id]: e.target.checked }))
                          }
                          className="rounded border-surface-border bg-surface"
                        />
                        <span>{t('workflowRun.setTrue')}</span>
                      </label>
                    ) : input.type === 'choice' && !input.allowCustomValue ? (
                      <select
                        value={String(values[input.id] ?? input.defaultValue ?? '')}
                        onChange={(e) =>
                          setValues((current) => ({ ...current, [input.id]: e.target.value }))
                        }
                        className="w-full bg-surface-light border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      >
                        {!input.required && <option value="">{t('workflowRun.noSelection')}</option>}
                        {input.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={input.type === 'number' ? 'number' : 'text'}
                        value={values[input.id] === undefined ? '' : String(values[input.id])}
                        onChange={(e) =>
                          setValues((current) => ({
                            ...current,
                            [input.id]:
                              input.type === 'number'
                                ? (e.target.value === '' ? undefined : Number(e.target.value))
                                : e.target.value
                          }))
                        }
                        placeholder={
                          input.type === 'choice'
                            ? input.options.map((option) => option.value).join(', ')
                            : input.type === 'string'
                              ? input.placeholder
                              : ''
                        }
                        min={input.type === 'number' ? input.min : undefined}
                        max={input.type === 'number' ? input.max : undefined}
                        step={input.type === 'number' ? input.step : undefined}
                        className="w-full bg-surface-light border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(invalidInputs.length > 0 || unknownPlaceholders.length > 0) && (
            <div className="rounded-xl border border-caution/30 bg-caution/10 px-4 py-3 text-sm text-caution space-y-2">
              {unknownPlaceholders.length > 0 && (
                <div>
                  {t('workflowRun.unknownPlaceholders', {
                    placeholders: unknownPlaceholders.map((placeholder) => `{{${placeholder}}}`).join(', ')
                  })}
                </div>
              )}
              {invalidInputs.length > 0 && (
                <div>
                  {t('workflowRun.invalidInputValues', {
                    issues: invalidInputs.map((issue) => `${issue.label}: ${issue.message}`).join(' ')
                  })}
                </div>
              )}
            </div>
          )}

          {preparationSteps.length > 0 && (
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">{t('workflowRun.preparation')}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {t('workflowRun.preparationDescription')}
                </p>
              </div>
              <div className="space-y-3">
                {preparationSteps.map((step) => (
                  <div
                    key={`${step.type}-${step.sourceIndex}`}
                    className={`rounded-xl border p-4 ${
                      step.type === 'approval'
                        ? 'border-caution/30 bg-caution/5'
                        : 'border-surface-border bg-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {step.type === 'approval' ? (
                        <AlertTriangle size={14} className="text-caution" />
                      ) : (
                        <ScrollText size={14} className="text-accent-light" />
                      )}
                      <span className="text-sm font-medium text-gray-200">{step.label}</span>
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-6">
                      {step.type === 'approval' ? step.message : step.content}
                    </p>
                    {step.type === 'approval' && step.requireConfirmation && (
                      <div className="mt-3 text-xs text-caution">
                        {t('workflowRun.requiresConfirmation')}
                      </div>
                    )}
                    {step.type === 'approval' && !step.requireConfirmation && (
                      <div className="mt-3 text-xs text-gray-500">
                        {t('workflowRun.autoCheckpoint')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {attemptedSubmit && !canRun && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {missingInputs.length > 0 && (
                <div>{t('workflowRun.requiredInputsMissing', { inputs: missingInputs.map((input) => input.label).join(', ') })}</div>
              )}
              {invalidInputs.length > 0 && (
                <div>
                  {t('workflowRun.invalidInputs', {
                    issues: invalidInputs.map((issue) => `${issue.label} (${issue.message})`).join(', ')
                  })}
                </div>
              )}
              {unknownPlaceholders.length > 0 && (
                <div>
                  {t('workflowRun.unknownMustBeFixed', {
                    placeholders: unknownPlaceholders.map((placeholder) => `{{${placeholder}}}`).join(', ')
                  })}
                </div>
              )}
              {executionPlan.steps.length === 0 && <div>{t('workflowRun.noCommandSteps')}</div>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border">
          <div className="text-xs text-gray-500">
            {t('workflowRun.prepStep', { count: preparationSteps.length })} ·{' '}
            {t('workflowRun.command', { count: executionPlan.steps.length })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              {t('common:actions.cancel')}
            </button>
            <button
              onClick={() => {
                setAttemptedSubmit(true)
                if (!canRun) return
                onConfirm(values)
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium transition-colors"
            >
              <Play size={14} />
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
