import clsx from 'clsx'
import { AlertTriangle, ShieldAlert, Star, CircleAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CommandDefinition } from '../../../../shared/command-schema'
import { getCommandDisplayDescription, getCommandDisplayName } from '../../lib/command-display'

interface CommandCardProps {
  command: CommandDefinition
  isActive: boolean
  onClick: () => void
  isFavorite?: boolean
  onToggleFavorite?: () => void
  onRemove?: () => void
}

export function CommandCard({
  command,
  isActive,
  onClick,
  isFavorite = false,
  onToggleFavorite,
  onRemove
}: CommandCardProps): JSX.Element {
  const { t } = useTranslation('commands')
  const description = getCommandDisplayDescription(command)
  const name = getCommandDisplayName(command)
  const showRemove = Boolean(onRemove && command.tags?.includes('saved-command'))

  return (
    <div
      className={clsx(
        'w-full px-3 py-2 rounded-lg text-sm transition-colors flex items-start gap-2',
        isActive
          ? 'bg-accent/20 text-accent-light border border-accent/30'
          : 'hover:bg-surface-light text-gray-300 border border-transparent'
      )}
    >
      <button onClick={onClick} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs truncate">{name}</span>
          {command.installed === false && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-caution/25 bg-caution/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-caution shrink-0"
              title={t('status.missingTitle')}
            >
              <CircleAlert size={10} />
              {t('status.missing')}
            </span>
          )}
          {command.dangerLevel === 'caution' && (
            <AlertTriangle size={12} className="text-caution shrink-0" />
          )}
          {command.dangerLevel === 'destructive' && (
            <ShieldAlert size={12} className="text-destructive shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{description}</p>
      </button>
      {onToggleFavorite && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggleFavorite()
          }}
          className={clsx(
            'shrink-0 p-1 rounded transition-colors',
            isFavorite ? 'text-caution' : 'text-gray-600 hover:text-caution'
          )}
          title={isFavorite ? t('favorites.remove') : t('favorites.add')}
        >
          <Star size={13} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      )}
      {showRemove && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onRemove?.()
          }}
          className="shrink-0 p-1 rounded text-gray-600 hover:text-destructive transition-colors"
          title={t('saved.remove')}
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
