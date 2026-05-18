import { Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CommandOption } from '../../../../../shared/command-schema'
import { OptionInfoIcon } from '../../ui/OptionInfoIcon'

interface NumberInputProps {
  option: CommandOption
  value: number
  onChange: (value: number) => void
}

export function NumberInput({ option, value, onChange }: NumberInputProps): JSX.Element {
  const { t } = useTranslation('commandBuilder')
  const flag = option.short || option.long || ''
  const min = option.validation?.min
  const max = option.validation?.max

  const adjust = (delta: number): void => {
    let next = (value || 0) + delta
    if (min !== undefined) next = Math.max(min, next)
    if (max !== undefined) next = Math.min(max, next)
    onChange(next)
  }

  const handleInput = (val: string): void => {
    const num = Number(val)
    if (!isNaN(num)) {
      let clamped = num
      if (min !== undefined) clamped = Math.max(min, clamped)
      if (max !== undefined) clamped = Math.min(max, clamped)
      onChange(clamped)
    }
  }

  return (
    <div className="py-1">
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-sm text-gray-200">{option.label}</label>
        <code className="text-xs text-gray-500 font-mono">{flag}</code>
        <OptionInfoIcon option={option} />
      </div>
      <div className="flex items-center gap-1 max-w-xs">
        <button
          onClick={() => adjust(-1)}
          className="p-2 rounded-lg bg-surface border border-surface-border hover:border-accent/30 text-gray-400 hover:text-accent-light transition-colors"
        >
          <Minus size={14} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={value || ''}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="0"
          className="w-20 text-center bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        />
        <button
          onClick={() => adjust(1)}
          className="p-2 rounded-lg bg-surface border border-surface-border hover:border-accent/30 text-gray-400 hover:text-accent-light transition-colors"
        >
          <Plus size={14} />
        </button>
        {(min !== undefined || max !== undefined) && (
          <span className="text-xs text-gray-500 ml-2">
            {min !== undefined && t('fields.min', { value: min })}
            {min !== undefined && max !== undefined && ' / '}
            {max !== undefined && t('fields.max', { value: max })}
          </span>
        )}
      </div>
      {option.description && (
        <p className="text-xs text-gray-500 mt-1">{option.description}</p>
      )}
    </div>
  )
}
