import type { MouseEvent } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatUpdateReleaseNotes } from '../../lib/update-release-notes'

type UpdateReleaseNotesProps = {
  notes: string
  title?: string
  hint?: string
  className?: string
  defaultOpen?: boolean
}

export function UpdateReleaseNotes({
  notes,
  title,
  hint,
  className,
  defaultOpen = false
}: UpdateReleaseNotesProps): JSX.Element | null {
  const { t } = useTranslation('settings')
  const formattedNotes = formatUpdateReleaseNotes(notes)
  if (!formattedNotes) return null
  const resolvedTitle = title ?? t('about.releaseNotes')
  const resolvedHint = hint ?? t('about.releaseNotesHint')

  const handleNotesClick = (event: MouseEvent<HTMLDivElement>): void => {
    const target = event.target
    if (!(target instanceof Element)) return

    const link = target.closest('a[href]')
    if (!link) return

    const href = link.getAttribute('href')
    if (!href) return

    event.preventDefault()
    void window.electronAPI.openExternal(href)
  }

  return (
    <details
      className={clsx(
        'tv-release-notes rounded-lg border border-surface-border bg-surface-light/60',
        className
      )}
      open={defaultOpen || undefined}
    >
      <summary className="cursor-pointer list-none px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-200">{resolvedTitle}</div>
            <div className="mt-0.5 text-[11px] leading-5 text-gray-500">{resolvedHint}</div>
          </div>
          <ChevronDown
            size={14}
            className="tv-release-notes-chevron mt-0.5 shrink-0 text-gray-500 transition-transform duration-200"
          />
        </div>
      </summary>

      <div className="border-t border-surface-border px-3 py-3">
        <div
          className="tv-release-notes-content"
          dangerouslySetInnerHTML={{ __html: formattedNotes }}
          onClick={handleNotesClick}
        />
      </div>
    </details>
  )
}
