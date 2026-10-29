import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { ShieldCheck } from 'lucide-react'
import type { OutboundRequestRecord } from '../../../../shared/privacy-schema'
import { useSettingsStore } from '../../store/settings-store'
import { formatTime } from '../../i18n/format'

function StatusChip({ on }: { on: boolean }): JSX.Element {
  const { t } = useTranslation('settings')
  return (
    <span
      className={clsx(
        'shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        on ? 'border-accent/30 bg-accent/10 text-accent-light' : 'border-surface-border text-gray-500'
      )}
    >
      {on ? t('toggle.on') : t('toggle.off')}
    </span>
  )
}

function Row({
  title,
  detail,
  chip
}: {
  title: string
  detail: string
  chip?: JSX.Element
}): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-sm text-gray-200">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5 leading-5">{detail}</div>
      </div>
      {chip}
    </div>
  )
}

export function PrivacyTab(): JSX.Element {
  const { t } = useTranslation('settings')
  const settings = useSettingsStore((s) => s.settings)
  const [records, setRecords] = useState<OutboundRequestRecord[]>([])

  const refresh = useCallback(async () => {
    setRecords(await window.electronAPI.getNetworkLog())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const enabledProviders = settings.aiProviders.filter((provider) => provider.enabled)
  const aiDetail =
    enabledProviders.length === 0
      ? t('privacy.aiNone')
      : `${t('privacy.aiDetail')} ${enabledProviders
          .map((provider) =>
            provider.connectionType === 'local'
              ? t('privacy.aiLocal', { name: provider.label })
              : provider.label
          )
          .join(', ')}`

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
        <ShieldCheck size={12} />
        {t('privacy.title')}
      </div>

      <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-gray-200 leading-6">
        {t('privacy.statement')}
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-light p-4">
        <div className="mb-3 text-xs uppercase tracking-[0.16em] text-gray-600">{t('privacy.leaveTitle')}</div>
        <div className="divide-y divide-surface-border">
          <Row
            title={t('privacy.updates')}
            detail={t('privacy.updatesDetail')}
            chip={<StatusChip on={settings.checkForUpdatesOnStartup} />}
          />
          <Row title={t('privacy.ai')} detail={aiDetail} chip={<StatusChip on={enabledProviders.length > 0} />} />
          <Row title={t('privacy.remote')} detail={t('privacy.remoteDetail')} />
          <Row
            title={t('privacy.logs')}
            detail={t('privacy.logsDetail')}
            chip={<StatusChip on={settings.saveTerminalLogs} />}
          />
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-light p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-[0.16em] text-gray-600">{t('privacy.recentTitle')}</div>
          <div className="flex gap-1.5">
            <button
              onClick={() => void refresh()}
              className="rounded-lg border border-surface-border px-2.5 py-1 text-xs text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
            >
              {t('privacy.refresh')}
            </button>
            <button
              onClick={() => void window.electronAPI.clearNetworkLog().then(refresh)}
              disabled={records.length === 0}
              className="rounded-lg border border-surface-border px-2.5 py-1 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40 transition-colors"
            >
              {t('privacy.clear')}
            </button>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-gray-600 leading-4">{t('privacy.recentHint')}</p>

        {records.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t('privacy.recentEmpty')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-surface-border text-xs">
            {records.map((record, index) => (
              <li key={`${record.at}-${index}`} className="flex items-center gap-3 py-1.5">
                <span className="w-16 shrink-0 text-gray-600">{formatTime(record.at, settings)}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-gray-300">
                  {record.host}
                  {record.local && <span className="ml-2 text-gray-600">({t('privacy.thisComputer')})</span>}
                </span>
                <span className="shrink-0 rounded border border-surface-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                  {t(`privacy.purpose.${record.purpose}`)}
                </span>
                <span className={clsx('w-10 shrink-0 text-right', record.status === null || record.status >= 400 ? 'text-destructive' : 'text-gray-500')}>
                  {record.status ?? t('privacy.failed')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
