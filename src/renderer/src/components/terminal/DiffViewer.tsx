import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ArrowLeftRight } from 'lucide-react'
import { useSnapshotStore, type OutputSnapshot } from '../../store/snapshot-store'
import { useSettingsStore } from '../../store/settings-store'
import { formatTime } from '../../i18n/format'

/** Simple line-by-line diff — marks added, removed, and unchanged lines */
function computeDiff(a: string, b: string): DiffLine[] {
  const linesA = a.split('\n')
  const linesB = b.split('\n')
  const result: DiffLine[] = []
  const maxLen = Math.max(linesA.length, linesB.length)

  // Simple aligned diff — compare corresponding lines
  for (let i = 0; i < maxLen; i++) {
    const lineA = i < linesA.length ? linesA[i] : undefined
    const lineB = i < linesB.length ? linesB[i] : undefined

    if (lineA === lineB) {
      result.push({ type: 'same', lineA: i + 1, lineB: i + 1, content: lineA ?? '' })
    } else if (lineA !== undefined && lineB !== undefined) {
      // Both exist but differ
      result.push({ type: 'removed', lineA: i + 1, lineB: null, content: lineA })
      result.push({ type: 'added', lineA: null, lineB: i + 1, content: lineB })
    } else if (lineA !== undefined) {
      result.push({ type: 'removed', lineA: i + 1, lineB: null, content: lineA })
    } else if (lineB !== undefined) {
      result.push({ type: 'added', lineA: null, lineB: i + 1, content: lineB })
    }
  }

  return result
}

interface DiffLine {
  type: 'same' | 'added' | 'removed'
  lineA: number | null
  lineB: number | null
  content: string
}

export function DiffViewer(): JSX.Element | null {
  const { t } = useTranslation('terminal')
  const settings = useSettingsStore((s) => s.settings)
  const { diffOpen, diffSelection, closeDiff, snapshots } = useSnapshotStore()

  const snapshotA = useMemo(
    () => diffSelection ? snapshots.find((s) => s.id === diffSelection[0]) : undefined,
    [diffSelection, snapshots]
  )
  const snapshotB = useMemo(
    () => diffSelection ? snapshots.find((s) => s.id === diffSelection[1]) : undefined,
    [diffSelection, snapshots]
  )

  const diffLines = useMemo(() => {
    if (!snapshotA || !snapshotB) return []
    return computeDiff(snapshotA.content, snapshotB.content)
  }, [snapshotA, snapshotB])

  const stats = useMemo(() => {
    let added = 0, removed = 0, same = 0
    for (const line of diffLines) {
      if (line.type === 'added') added++
      else if (line.type === 'removed') removed++
      else same++
    }
    return { added, removed, same }
  }, [diffLines])

  if (!diffOpen || !snapshotA || !snapshotB) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center">
      <div className="bg-surface border border-surface-border rounded-xl shadow-2xl w-[90vw] max-w-5xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
          <div className="flex items-center gap-3">
            <ArrowLeftRight size={16} className="text-accent" />
            <span className="text-sm font-semibold text-gray-200">{t('diff.title')}</span>
            <span className="text-xs text-gray-500">
              <span className="text-safe">+{stats.added}</span>
              {' / '}
              <span className="text-destructive">-{stats.removed}</span>
              {' / '}
              <span className="text-gray-400">{t('diff.unchanged', { count: stats.same })}</span>
            </span>
          </div>
          <button
            onClick={closeDiff}
            className="p-1 rounded-lg hover:bg-surface-lighter text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Snapshot labels */}
        <div className="flex border-b border-surface-border shrink-0">
          <div className="flex-1 px-4 py-2 border-r border-surface-border">
            <div className="text-xs font-medium text-destructive truncate">{snapshotA.label}</div>
            <div className="text-[10px] text-gray-600">
              {formatTime(snapshotA.capturedAt, settings)} · {t('snapshots.line', { count: snapshotA.lineCount })}
            </div>
          </div>
          <div className="flex-1 px-4 py-2">
            <div className="text-xs font-medium text-safe truncate">{snapshotB.label}</div>
            <div className="text-[10px] text-gray-600">
              {formatTime(snapshotB.capturedAt, settings)} · {t('snapshots.line', { count: snapshotB.lineCount })}
            </div>
          </div>
        </div>

        {/* Diff content */}
        <div className="flex-1 overflow-y-auto font-mono text-xs">
          {diffLines.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              {t('diff.identical')}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {diffLines.map((line, i) => (
                  <tr
                    key={i}
                    className={
                      line.type === 'added'
                        ? 'bg-safe/8'
                        : line.type === 'removed'
                          ? 'bg-destructive/8'
                          : ''
                    }
                  >
                    {/* Line numbers */}
                    <td className="w-10 text-right pr-2 text-gray-600 select-none shrink-0 border-r border-surface-border">
                      {line.lineA ?? ''}
                    </td>
                    <td className="w-10 text-right pr-2 text-gray-600 select-none shrink-0 border-r border-surface-border">
                      {line.lineB ?? ''}
                    </td>
                    {/* Indicator */}
                    <td className="w-5 text-center select-none shrink-0">
                      {line.type === 'added' ? (
                        <span className="text-safe">+</span>
                      ) : line.type === 'removed' ? (
                        <span className="text-destructive">−</span>
                      ) : null}
                    </td>
                    {/* Content */}
                    <td className="px-2 py-px whitespace-pre-wrap break-all">
                      <span className={
                        line.type === 'added'
                          ? 'text-safe'
                          : line.type === 'removed'
                            ? 'text-destructive'
                            : 'text-gray-300'
                      }>
                        {line.content}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
