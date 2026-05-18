import { Lightbulb } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useBuilderStore } from '../../store/builder-store'
import type { CommandExample } from '../../../../shared/command-schema'

interface ExamplesBarProps {
  examples: CommandExample[]
}

export function ExamplesBar({ examples }: ExamplesBarProps): JSX.Element {
  const { t } = useTranslation('commandBuilder')
  const setValues = useBuilderStore((s) => s.setValues)

  return (
    <div className="mt-4 flex items-center gap-2 flex-wrap">
      <Lightbulb size={14} className="text-gray-500 shrink-0" />
      <span className="text-xs text-gray-500">{t('examples.commandTreeRoot')}</span>
      {examples.map((example, i) => (
        <button
          key={i}
          onClick={() => setValues(example.values)}
          className="text-xs px-2.5 py-1 rounded-full bg-surface border border-surface-border text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
        >
          {example.label}
        </button>
      ))}
    </div>
  )
}
