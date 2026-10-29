import clsx from 'clsx'
import { useAttentionStore } from '../../store/attention-store'

/** Small status dot on a terminal tab: green finished, red failed, pulsing amber waiting for approval. */
export function AttentionDot({ sessionId }: { sessionId: string }): JSX.Element | null {
  const entry = useAttentionStore((state) => state.entries[sessionId])
  if (!entry) return null

  return (
    <span
      role="status"
      title={entry.detail}
      aria-label={entry.detail}
      className={clsx(
        'h-2 w-2 shrink-0 rounded-full',
        entry.kind === 'finished' && 'bg-safe',
        entry.kind === 'failed' && 'bg-destructive',
        entry.kind === 'approval' && 'bg-caution animate-pulse'
      )}
    />
  )
}
