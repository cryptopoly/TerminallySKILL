import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCommandStore } from '../../store/command-store'
import { useBuilderStore } from '../../store/builder-store'
import { CommandHeader } from './CommandHeader'
import { OptionGroup } from './OptionGroup'
import { PositionalArgs } from './PositionalArgs'
import { ExamplesBar } from './ExamplesBar'
import { CommandPreview } from './CommandPreview'
import type { CommandOption } from '../../../../shared/command-schema'

export function CommandBuilder(): JSX.Element {
  const { t } = useTranslation('commandBuilder')
  const command = useCommandStore((s) => s.activeCommand)!
  const values = useBuilderStore((s) => s.values)

  const optionGroups = useMemo(() => {
    if (!command.options) return {}
    const groups: Record<string, CommandOption[]> = {}
    for (const opt of command.options) {
      const group = opt.group || t('optionGroups.options')
      if (!groups[group]) groups[group] = []
      groups[group].push(opt)
    }
    // Sort options within each group by order
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    }
    return groups
  }, [command, t])

  return (
    <div className="h-full flex flex-col bg-surface-light">
      <div className="flex-1 overflow-y-auto p-5 pb-28">
        <CommandHeader command={command} />

        {command.examples && command.examples.length > 0 && (
          <ExamplesBar examples={command.examples} />
        )}

        <div className="mt-5 space-y-5">
          {Object.entries(optionGroups).map(([groupName, options]) => (
            <OptionGroup
              key={groupName}
              label={groupName}
              options={options}
              values={values}
              exclusiveGroups={command.exclusiveGroups}
            />
          ))}
        </div>

        {command.positionalArgs && command.positionalArgs.length > 0 && (
          <div className="mt-5">
            <PositionalArgs args={command.positionalArgs} values={values} />
          </div>
        )}
      </div>

      <CommandPreview command={command} />
    </div>
  )
}
