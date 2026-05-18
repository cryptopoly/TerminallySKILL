import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Check, Square, CheckSquare, Layers, Loader2, Radar } from 'lucide-react'
import { CATEGORY_LABELS } from '../../../../shared/category-labels'

interface CategorySelectorProps {
  enabledCategories: string[]
  commandCountsByCategory: Record<string, number>
  onSave: (categories: string[]) => void
  onScan?: () => void
  scanning?: boolean
  onClose: () => void
}

export function CategorySelector({
  enabledCategories,
  commandCountsByCategory,
  onSave,
  onScan,
  scanning,
  onClose
}: CategorySelectorProps): JSX.Element {
  const { t } = useTranslation('commands')
  const [selected, setSelected] = useState<Set<string>>(new Set(enabledCategories))

  // Show all categories that have commands OR are in the labels map
  const allCategories = [
    ...new Set([
      ...Object.keys(CATEGORY_LABELS),
      ...Object.keys(commandCountsByCategory)
    ])
  ]
    .filter((cat) => (commandCountsByCategory[cat] ?? 0) > 0 || CATEGORY_LABELS[cat])
    .sort((a, b) => (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b))

  const categoriesWithCommands = allCategories.filter(
    (cat) => (commandCountsByCategory[cat] ?? 0) > 0
  )

  const toggle = (cat: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  const selectAll = (): void => setSelected(new Set(categoriesWithCommands))
  const deselectAll = (): void => setSelected(new Set())

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
      <div className="bg-surface-light border border-surface-border rounded-2xl w-full max-w-sm shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-accent-light" />
            <h2 className="text-lg font-semibold text-gray-200">{t('categorySelector.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-lighter text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-3 px-6 pt-4 pb-2">
          <button
            onClick={selectAll}
            className="text-xs text-accent-light hover:text-accent transition-colors"
          >
            {t('categorySelector.selectAll')}
          </button>
          <span className="text-gray-700">|</span>
          <button
            onClick={deselectAll}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {t('categorySelector.deselectAll')}
          </button>
          <span className="ml-auto text-xs text-gray-600">
            {t('categorySelector.selectedOfTotal', { selected: selected.size, total: categoriesWithCommands.length })}
          </span>
        </div>

        {/* Category list */}
        <div className="px-4 py-2 space-y-0.5 max-h-72 overflow-y-auto">
          {categoriesWithCommands.map((cat) => {
            const isChecked = selected.has(cat)
            const count = commandCountsByCategory[cat] ?? 0

            return (
              <button
                key={cat}
                onClick={() => toggle(cat)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-lighter transition-colors text-left"
              >
                {isChecked ? (
                  <CheckSquare size={16} className="text-accent-light shrink-0" />
                ) : (
                  <Square size={16} className="text-gray-600 shrink-0" />
                )}
                <span className={`flex-1 text-sm ${isChecked ? 'text-gray-200' : 'text-gray-400'}`}>
                  {CATEGORY_LABELS[cat] || cat.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                <span className="text-xs text-gray-600">{t('categorySelector.commandCount', { count })}</span>
              </button>
            )
          })}
        </div>

        {/* Scan for installed commands */}
        {onScan && (
          <div className="px-4 py-3 border-t border-surface-border">
            <button
              onClick={onScan}
              disabled={scanning}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-surface-border text-sm text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scanning ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t('categorySelector.scanning')}
                </>
              ) : (
                <>
                  <Radar size={14} />
                  {t('categorySelector.scanInstalled')}
                </>
              )}
            </button>
            <p className="mt-2 text-[11px] text-gray-600 leading-relaxed">
              {t('categorySelector.scanDescription')}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            {t('common:actions.cancel')}
          </button>
          <button
            onClick={() => onSave(Array.from(selected))}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium transition-colors"
          >
            <Check size={14} />
            {t('categorySelector.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
