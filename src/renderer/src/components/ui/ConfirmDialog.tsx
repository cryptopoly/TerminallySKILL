import { AlertTriangle } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel
}: ConfirmDialogProps): JSX.Element {
  const { t } = useTranslation('common')
  const resolvedConfirmLabel = confirmLabel ?? t('actions.delete')

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">{message}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            {t('actions.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 rounded-lg bg-destructive hover:bg-destructive/80 text-white text-xs font-medium transition-colors"
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
