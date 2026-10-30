import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

export function SettingToggleCard({
  title,
  description,
  enabled,
  onToggle
}: {
  title: string
  description: string
  enabled: boolean
  onToggle: () => void | Promise<void>
}): JSX.Element {
  const { t } = useTranslation('settings')

  return (
    <button
      type="button"
      onClick={() => void onToggle()}
      className="w-full flex items-center gap-4 rounded-xl border border-surface-border bg-surface-light p-4 text-left transition-colors hover:border-accent/20 hover:bg-surface-light/80"
    >
      <div className="min-w-0 flex-1">
        <span className="text-sm text-gray-200">{title}</span>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <span
        role="switch"
        aria-checked={enabled}
        className={clsx(
          'relative isolate shrink-0 inline-flex h-11 w-28 items-center rounded-full border px-1 transition-all',
          enabled
            ? 'border-accent/30 bg-accent/10 shadow-[0_0_28px_rgba(6,182,212,0.15)]'
            : 'border-gray-500/40 bg-surface-light/60 shadow-inner'
        )}
      >
        <span className="absolute inset-0 rounded-full bg-gradient-to-r from-white/[0.02] via-transparent to-transparent" />
        <span
          className={clsx(
            'absolute top-1 bottom-1 w-[54px] rounded-full border transition-all duration-200',
            enabled
              ? 'left-[52px] border-accent/40 bg-gradient-to-r from-accent to-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.28)]'
              : 'left-1 border-gray-500/30 bg-gradient-to-r from-gray-500/50 to-gray-600/40'
          )}
        />
        <span className="relative z-10 flex w-full items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-[0.22em]">
          <span className={enabled ? 'text-gray-500' : 'text-white'}>{t('toggle.off')}</span>
          <span className={enabled ? 'text-slate-950' : 'text-gray-500'}>{t('toggle.on')}</span>
        </span>
      </span>
    </button>
  )
}
