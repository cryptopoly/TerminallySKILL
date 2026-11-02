import { useTranslation } from 'react-i18next'
import { useAttentionStore } from '../../store/attention-store'
import { useSettingsStore } from '../../store/settings-store'

/** Shown once, after the first notification: notifications can stay on screen until closed. */
export function KeepNotificationsTip(): JSX.Element | null {
  const { t } = useTranslation('settings')
  const visible = useAttentionStore((state) => state.keepTipVisible)
  const setVisible = useAttentionStore((state) => state.setKeepTipVisible)
  const setKeepUntilDismissed = useSettingsStore((state) => state.setAttentionKeepUntilDismissed)
  if (!visible) return null

  // macOS keeps this choice in System Settings. Elsewhere the app's own setting controls it.
  const isMac = navigator.platform.toLowerCase().includes('mac')

  const accept = (): void => {
    setVisible(false)
    if (isMac) {
      void window.electronAPI.openSystemNotificationSettings()
    } else {
      setKeepUntilDismissed(true)
      void window.electronAPI.updateSettings({ attentionKeepUntilDismissed: true })
    }
  }

  return (
    <div
      role="dialog"
      aria-label={t('general.attention.keep.title')}
      data-testid="keep-notifications-tip"
      className="fixed bottom-4 end-4 z-40 w-80 rounded-xl border border-surface-border bg-surface-light p-4 shadow-2xl shadow-black/50"
    >
      <div className="text-sm font-medium text-gray-200">{t('general.attention.keep.title')}</div>
      <div className="mt-1 text-xs text-gray-500">
        {t(isMac ? 'general.attention.keep.macDescription' : 'general.attention.keep.description')}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-lg px-3 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-200"
        >
          {t('general.attention.keep.tip.notNow')}
        </button>
        <button
          type="button"
          onClick={accept}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs text-white transition-colors hover:bg-accent/90"
        >
          {t(isMac ? 'general.attention.keep.openSettings' : 'general.attention.keep.tip.turnOn')}
        </button>
      </div>
    </div>
  )
}
