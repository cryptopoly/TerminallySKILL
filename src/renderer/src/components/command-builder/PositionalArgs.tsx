import { FolderOpen, Info, Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useBuilderStore } from '../../store/builder-store'
import { useCommandStore } from '../../store/command-store'
import { Tooltip } from '../ui/Tooltip'
import { AIExplainIcon } from '../ui/AIExplainIcon'
import type { CommandDefinition, PositionalArgument } from '../../../../shared/command-schema'
import { buildArgumentExplainRequest } from '../../lib/command-ai-explain'

interface PositionalArgsProps {
  args: PositionalArgument[]
  values: Record<string, unknown>
}

export function PositionalArgs({ args, values }: PositionalArgsProps): JSX.Element {
  const { t } = useTranslation('commandBuilder')
  const setValue = useBuilderStore((s) => s.setValue)
  const activeCommand = useCommandStore((s) => s.activeCommand)
  const sorted = [...args].sort((a, b) => a.position - b.position)

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
        {t('referenceHelp.arguments')}
      </h3>
      <div className="space-y-3">
        {sorted.map((arg) => (
          <PositionalArgInput
            key={arg.id}
            arg={arg}
            activeCommand={activeCommand}
            value={(values[arg.id] as string | string[] | undefined) ?? ''}
            onChange={(val) => setValue(arg.id, val)}
          />
        ))}
      </div>
    </div>
  )
}

function PositionalArgInput({
  arg,
  activeCommand,
  value,
  onChange
}: {
  arg: PositionalArgument
  activeCommand: CommandDefinition | null
  value: string | string[]
  onChange: (value: string | string[]) => void
}): JSX.Element {
  const { t } = useTranslation('commandBuilder')
  const isFilePath = arg.type === 'file-path' || arg.type === 'directory-path'
  const explainRequest = activeCommand ? buildArgumentExplainRequest(activeCommand, arg) : null

  const browse = async (): Promise<string | null> => {
    const result =
      arg.type === 'directory-path'
        ? await window.electronAPI.openDirectoryDialog()
        : await window.electronAPI.openFileDialog()
    return result
  }

  if (arg.type === 'enum' && arg.choices && arg.choices.length > 0) {
    return (
      <div className="py-1">
        <div className="flex items-center gap-2 mb-1.5">
          <label className="text-sm text-gray-200">{arg.label}</label>
          {arg.required && <span className="text-xs text-accent">{t('fields.required')}</span>}
          {arg.description && (
            <Tooltip content={<p className="text-gray-300">{arg.description}</p>}>
              <button
                type="button"
                className="p-0.5 rounded text-gray-600 hover:text-gray-400 transition-colors"
                tabIndex={-1}
              >
                <Info size={12} />
              </button>
            </Tooltip>
          )}
          {explainRequest && <AIExplainIcon {...explainRequest} />}
        </div>
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors cursor-pointer max-w-md"
        >
          <option value="">{t('fields.selectPlaceholder')}</option>
          {arg.choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
        {arg.description && <p className="text-xs text-gray-500 mt-1">{arg.description}</p>}
      </div>
    )
  }

  if (arg.variadic) {
    const entries = Array.isArray(value)
      ? value
      : typeof value === 'string' && value.trim().length > 0
        ? [value]
        : ['']

    const updateEntry = (index: number, nextValue: string): void => {
      const next = [...entries]
      next[index] = nextValue
      onChange(next)
    }

    const removeEntry = (index: number): void => {
      const next = entries.filter((_, entryIndex) => entryIndex !== index)
      onChange(next.length > 0 ? next : [''])
    }

    const addEntry = (): void => {
      onChange([...entries, ''])
    }

    return (
      <div className="py-1">
        <div className="flex items-center gap-2 mb-1.5">
          <label className="text-sm text-gray-200">{arg.label}</label>
          {arg.required && <span className="text-xs text-accent">{t('fields.required')}</span>}
          {arg.description && (
            <Tooltip content={<p className="text-gray-300">{arg.description}</p>}>
              <button
                type="button"
                className="p-0.5 rounded text-gray-600 hover:text-gray-400 transition-colors"
                tabIndex={-1}
              >
                <Info size={12} />
              </button>
            </Tooltip>
          )}
          {explainRequest && <AIExplainIcon {...explainRequest} />}
        </div>
        <div className="space-y-2 max-w-md">
          {entries.map((entry, index) => (
            <div key={`${arg.id}-${index}`} className="flex items-center gap-2">
              <input
                type="text"
                value={entry}
                onChange={(event) => updateEntry(index, event.target.value)}
                placeholder={arg.description || `${arg.label} ${index + 1}`}
                className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
              />
              {isFilePath && (
                <button
                  onClick={async () => {
                    const result = await browse()
                    if (result) updateEntry(index, result)
                  }}
                  className="p-2 rounded-lg bg-surface border border-surface-border hover:border-accent/30 text-gray-400 hover:text-accent-light transition-colors"
                >
                  <FolderOpen size={16} />
                </button>
              )}
              <button
                onClick={() => removeEntry(index)}
                className="p-2 rounded-lg bg-surface border border-surface-border hover:border-destructive/30 text-gray-500 hover:text-destructive transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={addEntry}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent-light transition-colors px-2 py-1.5"
          >
            <Plus size={12} />
            {t('fields.addValue')}
          </button>
        </div>
        {arg.description && <p className="text-xs text-gray-500 mt-1">{arg.description}</p>}
      </div>
    )
  }

  return (
    <div className="py-1">
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-sm text-gray-200">{arg.label}</label>
        {arg.required && <span className="text-xs text-accent">{t('fields.required')}</span>}
        {arg.description && (
          <Tooltip content={<p className="text-gray-300">{arg.description}</p>}>
            <button
              type="button"
              className="p-0.5 rounded text-gray-600 hover:text-gray-400 transition-colors"
              tabIndex={-1}
            >
              <Info size={12} />
            </button>
          </Tooltip>
        )}
        {explainRequest && <AIExplainIcon {...explainRequest} />}
      </div>
      <div className="flex items-center gap-2 max-w-md">
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={arg.description || arg.label}
          className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
        />
        {isFilePath && (
          <button
            onClick={async () => {
              const result = await browse()
              if (result) onChange(result)
            }}
            className="p-2 rounded-lg bg-surface border border-surface-border hover:border-accent/30 text-gray-400 hover:text-accent-light transition-colors"
          >
            <FolderOpen size={16} />
          </button>
        )}
      </div>
      {arg.description && <p className="text-xs text-gray-500 mt-1">{arg.description}</p>}
    </div>
  )
}
