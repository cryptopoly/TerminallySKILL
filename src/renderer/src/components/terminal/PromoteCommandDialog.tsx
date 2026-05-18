import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Braces, ScrollText, Sparkles, Star, X } from 'lucide-react'
import clsx from 'clsx'
import {
  buildPromotionDefaultName,
  type TerminalPromotionTarget
} from '../../lib/terminal-promotion'

const TARGETS: Array<{
  id: TerminalPromotionTarget
  icon: React.ReactNode
}> = [
  {
    id: 'script',
    icon: <ScrollText size={14} />
  },
  {
    id: 'snippet',
    icon: <Braces size={14} />
  },
  {
    id: 'command',
    icon: <Star size={14} />
  }
]

export function PromoteCommandDialog({
  commandString,
  existingCommand,
  loading,
  error,
  onClose,
  onPromote
}: {
  commandString: string
  existingCommand: boolean
  loading: boolean
  error: string | null
  onClose: () => void
  onPromote: (target: TerminalPromotionTarget, name: string) => Promise<void> | void
}): JSX.Element {
  const { t } = useTranslation('terminal')
  const [target, setTarget] = useState<TerminalPromotionTarget>('script')
  const [name, setName] = useState(buildPromotionDefaultName(commandString, 'script'))

  const helperCopy = useMemo(() => {
    if (target === 'command') {
      return existingCommand
        ? t('promote.helpers.existingCommand')
        : t('promote.helpers.newCommand')
    }

    return t('promote.helpers.artifact')
  }, [existingCommand, target, t])

  useEffect(() => {
    setName(buildPromotionDefaultName(commandString, target))
  }, [commandString, target])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !loading) {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={loading ? undefined : onClose}
    >
      <div
        className="w-[560px] max-w-[calc(100vw-2rem)] rounded-2xl border border-surface-border bg-surface shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-surface-border">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-light">
            <Sparkles size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-gray-200">{t('promote.title')}</h2>
            <p className="mt-1 text-xs text-gray-500">
              {t('promote.description')}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-light transition-colors disabled:opacity-50"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-xl border border-surface-border bg-surface-light/40 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">{t('promote.lastCommand')}</div>
            <code className="mt-2 block text-sm font-mono text-gray-200 whitespace-pre-wrap break-all">
              {commandString}
            </code>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {TARGETS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTarget(option.id)}
                className={clsx(
                  'rounded-xl border px-3 py-3 text-left transition-colors',
                  target === option.id
                    ? 'border-accent bg-accent/10 text-gray-200'
                    : 'border-surface-border bg-surface-light/30 text-gray-400 hover:text-gray-200 hover:border-gray-500'
                )}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  {option.icon}
                  {t(`promote.targets.${option.id}.label`)}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-gray-500">
                  {t(`promote.targets.${option.id}.description`)}
                </p>
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs text-gray-500">{t('promote.name')}</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('promote.namePlaceholder')}
              className="w-full rounded-lg border border-surface-border bg-surface-light px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              autoFocus
            />
          </label>

          <div className="rounded-xl border border-surface-border bg-surface-light/30 px-4 py-3 text-xs text-gray-500 leading-5">
            {helperCopy}
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-surface-border bg-surface-light/20">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            {t('common:actions.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void onPromote(target, name.trim())}
            disabled={loading || !name.trim()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Sparkles size={13} className="animate-pulse" /> : <Sparkles size={13} />}
            {target === 'command'
              ? existingCommand ? t('promote.openCommand') : t('promote.createCommand')
              : target === 'snippet'
                ? t('promote.createSnippet')
                : t('promote.createScript')}
          </button>
        </div>
      </div>
    </div>
  )
}
