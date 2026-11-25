import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useToastStore, type Toast } from '../../store/toast-store'

const TOAST_TIMEOUT_MS = 10_000

function ToastItem({ toast }: { toast: Toast }): JSX.Element {
  const { t } = useTranslation()
  const dismiss = useToastStore((state) => state.dismiss)

  useEffect(() => {
    const timeout = setTimeout(() => dismiss(toast.id), TOAST_TIMEOUT_MS)
    return () => clearTimeout(timeout)
  }, [dismiss, toast.id])

  return (
    <div
      role="alert"
      data-testid="toast"
      className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-surface-light p-3 text-xs text-gray-200 shadow-2xl shadow-black/50"
    >
      <div className="min-w-0 flex-1 break-words">{t(toast.messageKey, toast.values)}</div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label={t('common:actions.close')}
        className="shrink-0 text-gray-500 transition-colors hover:text-gray-200"
      >
        <X size={14} />
      </button>
    </div>
  )
}

/** Error toasts, stacked under the header. Each closes itself after a few seconds. */
export function Toasts(): JSX.Element | null {
  const toasts = useToastStore((state) => state.toasts)
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-14 end-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
