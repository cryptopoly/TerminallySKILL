import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Tooltip } from './Tooltip'
import { AIExplainIcon } from './AIExplainIcon'
import type { CommandOption } from '../../../../shared/command-schema'
import { useCommandStore } from '../../store/command-store'
import { buildOptionExplainRequest } from '../../lib/command-ai-explain'

interface OptionInfoIconProps {
  option: CommandOption
}

export function OptionInfoIcon({ option }: OptionInfoIconProps): JSX.Element | null {
  const { t } = useTranslation('commandBuilder')
  const activeCommand = useCommandStore((s) => s.activeCommand)
  const explainRequest = activeCommand ? buildOptionExplainRequest(activeCommand, option) : null
  const hasInfoContent = Boolean(option.description || option.long || option.short)

  if (!hasInfoContent && !explainRequest) return null

  const flags = [option.long, option.short].filter(Boolean).join(' / ')
  const typeKey = option.type.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
  const typeLabel = t(`optionInfo.types.${typeKey}`, { defaultValue: option.type })

  return (
    <div className="inline-flex items-center gap-1">
      {hasInfoContent && (
        <Tooltip
          content={
            <div className="space-y-1.5">
              {flags && (
                <code className="block text-accent-light font-mono">{flags}</code>
              )}
              {option.description && (
                <p className="text-gray-300">{option.description}</p>
              )}
              <div className="flex items-center gap-3 text-gray-500">
                <span>{typeLabel}</span>
                {option.required && <span className="text-accent">{t('optionInfo.required')}</span>}
                {option.defaultValue !== undefined && option.defaultValue !== '' && option.defaultValue !== false && (
                  <span>{t('optionInfo.defaultValue')} <code className="text-gray-400">{String(option.defaultValue)}</code></span>
                )}
              </div>
            </div>
          }
        >
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
  )
}
