import { Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CommandOption } from '../../../../../shared/command-schema'
import { OptionInfoIcon } from '../../ui/OptionInfoIcon'

interface RepeatableInputProps {
  option: CommandOption
  value: string[]
  onChange: (value: string[]) => void
}

export function RepeatableInput({ option, value, onChange }: RepeatableInputProps): JSX.Element {
  const { t } = useTranslation('commandBuilder')
  const flag = option.short || option.long || ''

  const add = (): void => {
    onChange([...value, ''])
  }

  const remove = (index: number): void => {
    onChange(value.filter((_, i) => i !== index))
  }

  const update = (index: number, val: string): void => {
    const next = [...value]
    next[index] = val
    onChange(next)
  }

  return (
    <div className="py-1">
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-sm text-gray-200">{option.label}</label>
        <code className="text-xs text-gray-500 font-mono">{flag}</code>
        <OptionInfoIcon option={option} />
      </div>
      <div className="space-y-2 max-w-md">
        {value.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={entry}
              onChange={(e) => update(i, e.target.value)}
              placeholder={option.description || t('fields.valuePlaceholder', { index: i + 1 })}
              className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
            <button
              onClick={() => remove(i)}
              className="p-2 rounded-lg bg-surface border border-surface-border hover:border-destructive/30 text-gray-500 hover:text-destructive transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={add}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent-light transition-colors px-2 py-1.5"
        >
          <Plus size={12} />
          {t('fields.addValue')}
        </button>
      </div>
    </div>
  )
}
