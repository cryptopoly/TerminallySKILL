import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface CommandSearchProps {
  value: string
  onChange: (value: string) => void
}

export function CommandSearch({ value, onChange }: CommandSearchProps): JSX.Element {
  const { t } = useTranslation('commands')
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('search.placeholder')}
        className="w-full bg-surface-light border border-surface-border rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
      />
    </div>
  )
}
