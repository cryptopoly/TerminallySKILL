import { ChevronDown, ChevronRight } from 'lucide-react'
import { CommandCard } from './CommandCard'
import { useCommandStore } from '../../store/command-store'
import { useSettingsStore } from '../../store/settings-store'
import { compareLocalized } from '../../i18n/format'
import type { CommandDefinition } from '../../../../shared/command-schema'

interface CategoryListProps {
  groups: Record<string, CommandDefinition[]>
  onSelect: (command: CommandDefinition) => void
  favoriteIds?: string[]
  onToggleFavorite?: (command: CommandDefinition) => void
  onRemoveCommand?: (command: CommandDefinition) => void
  collapsed: Record<string, boolean>
  onToggleCollapsed: (category: string) => void
}

export function CategoryList({
  groups,
  onSelect,
  favoriteIds = [],
  onToggleFavorite,
  onRemoveCommand,
  collapsed,
  onToggleCollapsed
}: CategoryListProps): JSX.Element {
  const activeCommand = useCommandStore((s) => s.activeCommand)
  const settings = useSettingsStore((s) => s.settings)

  const sortedCategories = Object.keys(groups).sort((left, right) =>
    compareLocalized(left, right, settings)
  )

  return (
    <div className="space-y-1">
      {sortedCategories.map((category) => (
        <div key={category}>
          <button
            onClick={() => onToggleCollapsed(category)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors"
          >
            {collapsed[category] ? (
              <ChevronRight size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
            <span className="truncate">{category}</span>
            <span className="ml-auto text-gray-600">{groups[category].length}</span>
          </button>
          {!collapsed[category] && (
            <div className="space-y-0.5 ml-1">
              {groups[category].map((cmd) => (
                <CommandCard
                  key={cmd.id}
                  command={cmd}
                  isActive={activeCommand?.id === cmd.id}
                  onClick={() => onSelect(cmd)}
                  isFavorite={favoriteIds.includes(cmd.id)}
                  onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(cmd) : undefined}
                  onRemove={onRemoveCommand ? () => onRemoveCommand(cmd) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
