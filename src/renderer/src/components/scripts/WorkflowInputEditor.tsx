import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info, Loader2, Plus, Settings2, Sparkles, Trash2, Wand2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { normalizeWorkflowInputDefinitions, normalizeWorkflowInputId } from '../../../../shared/workflow-validation'
import type { WorkflowInputDefinition } from '../../../../shared/workflow-schema'
import { HelpTip } from '../ui/HelpTip'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useSettingsStore } from '../../store/settings-store'

interface WorkflowInputEditorProps {
  inputs: WorkflowInputDefinition[]
  steps: { label: string; commandString?: string }[]
  onChange: (inputs: WorkflowInputDefinition[], renamedInputs?: Record<string, string>) => void
}

function createDefaultInput(index: number): WorkflowInputDefinition {
  return {
    id: '',
    label: '',
    description: '',
    type: 'string',
    required: false,
    defaultValue: '',
    placeholder: ''
  }
}

function normalizeInputType(input: WorkflowInputDefinition, nextType: WorkflowInputDefinition['type']): WorkflowInputDefinition {
  if (nextType === input.type) return input

  if (nextType === 'number') {
    return {
      id: input.id,
      label: input.label,
      description: input.description,
      type: 'number',
      required: input.required,
      defaultValue: typeof input.defaultValue === 'number' ? input.defaultValue : undefined
    }
  }

  if (nextType === 'boolean') {
    return {
      id: input.id,
      label: input.label,
      description: input.description,
      type: 'boolean',
      required: input.required,
      defaultValue: typeof input.defaultValue === 'boolean' ? input.defaultValue : false
    }
  }

  if (nextType === 'choice') {
    return {
      id: input.id,
      label: input.label,
      description: input.description,
      type: 'choice',
      required: input.required,
      defaultValue: typeof input.defaultValue === 'string' ? input.defaultValue : '',
      options: [],
      allowCustomValue: false
    }
  }

  return {
    id: input.id,
    label: input.label,
    description: input.description,
    type: 'string',
    required: input.required,
    defaultValue: typeof input.defaultValue === 'string' ? input.defaultValue : '',
    placeholder: ''
  }
}

export function WorkflowInputEditor({
  inputs,
  steps,
  onChange
}: WorkflowInputEditorProps): JSX.Element {
  const { t } = useTranslation('scripts')
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null)
  const [showAIDraft, setShowAIDraft] = useState(false)
  const [aiDraftPrompt, setAIDraftPrompt] = useState('')
  const [aiDraftLoading, setAIDraftLoading] = useState(false)
  const [aiDraftResult, setAIDraftResult] = useState<string | null>(null)
  const [aiDraftError, setAIDraftError] = useState<string | null>(null)
  const [aiDraftMeta, setAIDraftMeta] = useState<{ providerLabel: string; model: string } | null>(null)
  const activeAIProvider = useSettingsStore((s) => s.settings.activeAIProvider)

  const emitInputs = (
    nextInputs: WorkflowInputDefinition[],
    shouldTrackRenames = false
  ): void => {
    const normalizedInputs = normalizeWorkflowInputDefinitions(nextInputs)

    if (!shouldTrackRenames || normalizedInputs.length !== inputs.length) {
      onChange(normalizedInputs)
      return
    }

    const renamedInputs = Object.fromEntries(
      inputs.flatMap((input, index) => {
        const nextInput = normalizedInputs[index]
        if (!nextInput || nextInput.id === input.id) return []
        return [[input.id, nextInput.id]]
      })
    )

    onChange(
      normalizedInputs,
      Object.keys(renamedInputs).length > 0 ? renamedInputs : undefined
    )
  }

  const updateInput = (index: number, nextInput: WorkflowInputDefinition): void => {
    emitInputs(inputs.map((input, inputIndex) => (inputIndex === index ? nextInput : input)), true)
  }

  const removeInput = (index: number): void => {
    emitInputs(inputs.filter((_, inputIndex) => inputIndex !== index))
    setConfirmDeleteIndex(null)
  }

  const handleAIDraft = async (): Promise<void> => {
    if (!activeAIProvider) return
    if (!aiDraftPrompt.trim()) {
      setAIDraftError(t('inputs.describePromptRequired'))
      return
    }

    setAIDraftLoading(true)
    setAIDraftError(null)
    setAIDraftResult(null)
    setAIDraftMeta(null)

    const stepsDescription = steps.length > 0
      ? steps.map((s, i) => `${t('inputs.stepLabel', { index: i + 1 })}: ${s.label}${s.commandString ? ` - ${s.commandString}` : ''}`).join('\n')
      : t('inputs.noStepsDefined')

    const existingInputs = inputs.length > 0
      ? inputs.map((inp) => `- {{${inp.id}}} (${inp.type}${inp.required ? `, ${t('inputs.requiredMeta')}` : ''}): ${inp.description || inp.label}`).join('\n')
      : t('inputs.none')

    try {
      const response = await window.electronAPI.runAIAction({
        action: 'command-review',
        commandName: t('inputs.aiCommandName'),
        commandString: `${t('inputs.userDescription')}: ${aiDraftPrompt}\n\n${t('inputs.workflowSteps')}:\n${stepsDescription}\n\n${t('inputs.existingInputs')}:\n${existingInputs}`,
        commandDescription: t('inputs.aiCommandDescription', { open: '{{', close: '}}' })
      })
      setAIDraftResult(response.text)
      if (response.providerLabel && response.model) {
        setAIDraftMeta({ providerLabel: response.providerLabel, model: response.model })
      }
    } catch {
      setAIDraftError(t('inputs.providerError'))
    } finally {
      setAIDraftLoading(false)
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Settings2 size={14} className="text-accent-light shrink-0" />
        <h3 className="text-sm font-semibold text-gray-200">{t('inputs.title')}</h3>
        <HelpTip
          label={t('inputs.title')}
          description={t('inputs.help', { open: '{{', close: '}}' })}
        >
          <span className="text-gray-500 hover:text-gray-300 cursor-help transition-colors"><Info size={13} /></span>
        </HelpTip>
        <div className="flex items-center gap-1 ml-auto">
          {activeAIProvider && (
            <button
              onClick={() => setShowAIDraft(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-accent-light transition-colors"
              title={t('inputs.aiDraftTooltip')}
            >
              <Wand2 size={12} />
              {t('inputs.aiDraft')}
            </button>
          )}
          <button
            onClick={() => onChange([...inputs, createDefaultInput(inputs.length)])}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-surface-border text-xs text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors"
          >
            <Plus size={12} />
            {t('inputs.addInput')}
          </button>
        </div>
      </div>

      {inputs.length > 0 && (
        <div className="space-y-2">
          {inputs.map((input, index) => (
            <div key={`${input.id}-${index}`} className="rounded-lg border border-surface-border bg-surface px-3 py-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 flex-1 min-w-0 items-center">
                  <input
                    type="text"
                    value={input.label}
                    onChange={(e) =>
                      updateInput(index, {
                        ...input,
                        label: e.target.value,
                        id:
                          input.id === normalizeWorkflowInputId(input.label, index) || input.id === `input_${index + 1}` || input.id === ''
                            ? normalizeWorkflowInputId(e.target.value, index)
                            : input.id
                      })
                    }
                    placeholder={t('inputs.labelPlaceholder')}
                    title={t('inputs.labelTitle')}
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent min-w-0"
                  />
                  <input
                    type="text"
                    value={input.id}
                    onChange={(e) =>
                      updateInput(index, {
                        ...input,
                        id: normalizeWorkflowInputId(e.target.value, index)
                      })
                    }
                    placeholder={t('inputs.keyPlaceholder')}
                    title={t('inputs.keyTitle', { open: '{{', close: '}}' })}
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:border-accent min-w-0"
                  />
                  <select
                    value={input.type}
                    onChange={(e) =>
                      updateInput(index, normalizeInputType(input, e.target.value as WorkflowInputDefinition['type']))
                    }
                    title={t('inputs.typeTitle')}
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  >
                    <option value="string">{t('inputs.types.string')}</option>
                    <option value="number">{t('inputs.types.number')}</option>
                    <option value="boolean">{t('inputs.types.boolean')}</option>
                    <option value="choice">{t('inputs.types.choice')}</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <label
                      className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer"
                      title={t('inputs.requiredTitle')}
                    >
                      <input
                        type="checkbox"
                        checked={input.required}
                        onChange={(e) => updateInput(index, { ...input, required: e.target.checked })}
                        className="rounded border-surface-border bg-surface w-3 h-3"
                      />
                      {t('inputs.requiredShort')}
                    </label>
                    <button
                      onClick={() => setConfirmDeleteIndex(index)}
                      className="p-1 text-gray-500 hover:text-destructive transition-colors"
                      title={t('inputs.removeTitle')}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>

              {input.type === 'string' && (
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={input.description}
                    onChange={(e) => updateInput(index, { ...input, description: e.target.value })}
                    placeholder={t('inputs.descriptionPlaceholder')}
                    title={t('inputs.descriptionTitle')}
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    value={input.defaultValue ?? ''}
                    onChange={(e) => updateInput(index, { ...input, defaultValue: e.target.value })}
                    placeholder={t('inputs.defaultPlaceholder')}
                    title={t('inputs.defaultTextTitle')}
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    value={input.placeholder}
                    onChange={(e) => updateInput(index, { ...input, placeholder: e.target.value })}
                    placeholder={t('inputs.placeholderText')}
                    title={t('inputs.placeholderTitle')}
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              {input.type === 'number' && (
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    value={input.defaultValue ?? ''}
                    onChange={(e) =>
                      updateInput(index, {
                        ...input,
                        defaultValue: e.target.value === '' ? undefined : Number(e.target.value)
                      })
                    }
                    placeholder={t('inputs.defaultPlaceholder')}
                    title={t('inputs.defaultNumberTitle')}
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    value={input.min ?? ''}
                    onChange={(e) =>
                      updateInput(index, {
                        ...input,
                        min: e.target.value === '' ? undefined : Number(e.target.value)
                      })
                    }
                    placeholder={t('inputs.minPlaceholder')}
                    title={t('inputs.minTitle')}
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    value={input.max ?? ''}
                    onChange={(e) =>
                      updateInput(index, {
                        ...input,
                        max: e.target.value === '' ? undefined : Number(e.target.value)
                      })
                    }
                    placeholder={t('inputs.maxPlaceholder')}
                    title={t('inputs.maxTitle')}
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    value={input.step ?? ''}
                    onChange={(e) =>
                      updateInput(index, {
                        ...input,
                        step: e.target.value === '' ? undefined : Number(e.target.value)
                      })
                    }
                    placeholder={t('inputs.stepPlaceholder')}
                    title={t('inputs.stepTitle')}
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              {input.type === 'boolean' && (
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer" title={t('inputs.booleanDefaultTitle')}>
                  <input
                    type="checkbox"
                    checked={Boolean(input.defaultValue)}
                    onChange={(e) => updateInput(index, { ...input, defaultValue: e.target.checked })}
                    className="rounded border-surface-border bg-surface"
                  />
                  {t('inputs.defaultToTrue')}
                </label>
              )}

              {input.type === 'choice' && (
                <div className="space-y-2">
                  <textarea
                    value={input.options.map((option) => `${option.label}=${option.value}`).join('\n')}
                    onChange={(e) =>
                      updateInput(index, {
                        ...input,
                        options: e.target.value
                          .split('\n')
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const [label, value] = line.includes('=')
                              ? line.split('=').map((part) => part.trim())
                              : [line, line]
                            return { label, value }
                          })
                      })
                    }
                    rows={3}
                    placeholder={t('inputs.optionsPlaceholder')}
                    title={t('inputs.optionsTitle')}
                    className="w-full bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={input.defaultValue ?? ''}
                      onChange={(e) => updateInput(index, { ...input, defaultValue: e.target.value })}
                      placeholder={t('inputs.defaultOptionPlaceholder')}
                      title={t('inputs.defaultOptionTitle')}
                      className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                    />
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer" title={t('inputs.allowCustomTitle')}>
                      <input
                        type="checkbox"
                        checked={input.allowCustomValue}
                        onChange={(e) => updateInput(index, { ...input, allowCustomValue: e.target.checked })}
                        className="rounded border-surface-border bg-surface"
                      />
                      {t('inputs.allowCustom')}
                    </label>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmDeleteIndex !== null && (
        <ConfirmDialog
          title={t('inputs.removeDialogTitle')}
          message={t('inputs.removeDialogMessage', {
            name: inputs[confirmDeleteIndex]?.label || inputs[confirmDeleteIndex]?.id || t('inputs.unnamedInput'),
            open: '{{',
            key: inputs[confirmDeleteIndex]?.id ?? '',
            close: '}}'
          })}
          confirmLabel={t('inputs.remove')}
          onConfirm={() => removeInput(confirmDeleteIndex)}
          onCancel={() => setConfirmDeleteIndex(null)}
        />
      )}

      {showAIDraft && createPortal(
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-start justify-center overflow-y-auto p-6">
          <div className="mt-8 mb-8 w-full max-w-3xl rounded-2xl border border-surface-border bg-surface-light shadow-2xl shadow-black/50 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-surface-border">
              <div>
                <h3 className="text-lg font-semibold text-gray-200">{t('inputs.aiDraftTitle')}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {t('inputs.aiDraftDescription')}
                </p>
              </div>
              <button
                onClick={() => {
                  if (aiDraftLoading) return
                  setShowAIDraft(false)
                }}
                className="p-1 rounded-lg hover:bg-surface text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">{t('inputs.promptLabel')}</label>
                <textarea
                  value={aiDraftPrompt}
                  onChange={(e) => setAIDraftPrompt(e.target.value)}
                  rows={3}
                  placeholder={t('inputs.promptPlaceholder')}
                  className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      void handleAIDraft()
                    }
                  }}
                />
                <button
                  onClick={() => void handleAIDraft()}
                  disabled={aiDraftLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {aiDraftLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Wand2 size={14} />
                  )}
                  {aiDraftLoading ? t('inputs.generating') : t('inputs.generateSuggestions')}
                </button>
              </div>

              {aiDraftError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {aiDraftError}
                </div>
              )}

              {aiDraftResult && (
                <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-accent-light" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {t('inputs.suggestions')}
                    </span>
                    {aiDraftMeta && (
                      <span className="text-[11px] text-gray-500 ml-auto">
                        {aiDraftMeta.providerLabel} · {aiDraftMeta.model}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-200 whitespace-pre-wrap leading-6">
                    {aiDraftResult}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
