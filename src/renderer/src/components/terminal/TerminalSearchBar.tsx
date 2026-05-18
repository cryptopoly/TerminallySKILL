import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronUp, ChevronDown } from 'lucide-react'
import type { SearchAddon } from '@xterm/addon-search'

interface TerminalSearchBarProps {
  searchAddon: SearchAddon | null
  onClose: () => void
}

export function TerminalSearchBar({ searchAddon, onClose }: TerminalSearchBarProps): JSX.Element {
  const { t } = useTranslation('terminal')
  const [query, setQuery] = useState('')
  const [matchCount, setMatchCount] = useState<number | null>(null)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [regex, setRegex] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const doSearch = useCallback((direction: 'next' | 'prev') => {
    if (!searchAddon || !query) return
    const options = {
      caseSensitive,
      regex,
      wholeWord,
      incremental: direction === 'next'
    }
    if (direction === 'next') {
      searchAddon.findNext(query, options)
    } else {
      searchAddon.findPrevious(query, options)
    }
  }, [searchAddon, query, caseSensitive, regex, wholeWord])

  // Trigger search on query/options change
  useEffect(() => {
    if (!searchAddon) return
    if (!query) {
      searchAddon.clearDecorations()
      setMatchCount(null)
      return
    }
    // findNext with incremental searches from current position
    searchAddon.findNext(query, {
      caseSensitive,
      regex,
      wholeWord,
      incremental: true
    })
  }, [searchAddon, query, caseSensitive, regex, wholeWord])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      searchAddon?.clearDecorations()
      onClose()
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        doSearch('prev')
      } else {
        doSearch('next')
      }
    }
  }

  return (
    <div className="absolute top-1 right-2 z-30 flex items-center gap-1 bg-surface-light/95 backdrop-blur-sm border border-surface-border rounded-lg shadow-xl px-2 py-1">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('search.placeholder')}
        className="w-48 bg-transparent text-xs text-gray-200 placeholder-gray-600 outline-none px-1 py-0.5"
      />

      {/* Option toggles */}
      <button
        onClick={() => setCaseSensitive(!caseSensitive)}
        className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded transition-colors ${
          caseSensitive ? 'text-accent bg-accent/15' : 'text-gray-500 hover:text-gray-300'
        }`}
        title={t('search.caseSensitive')}
      >
        Aa
      </button>
      <button
        onClick={() => setRegex(!regex)}
        className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded transition-colors ${
          regex ? 'text-accent bg-accent/15' : 'text-gray-500 hover:text-gray-300'
        }`}
        title={t('search.regex')}
      >
        .*
      </button>
      <button
        onClick={() => setWholeWord(!wholeWord)}
        className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded transition-colors ${
          wholeWord ? 'text-accent bg-accent/15' : 'text-gray-500 hover:text-gray-300'
        }`}
        title={t('search.wholeWord')}
      >
        ab
      </button>

      <div className="w-px h-4 bg-surface-border mx-0.5" />

      {/* Navigation */}
      <button
        onClick={() => doSearch('prev')}
        className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
        title={t('search.previous')}
      >
        <ChevronUp size={13} />
      </button>
      <button
        onClick={() => doSearch('next')}
        className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
        title={t('search.next')}
      >
        <ChevronDown size={13} />
      </button>

      <div className="w-px h-4 bg-surface-border mx-0.5" />

      <button
        onClick={() => {
          searchAddon?.clearDecorations()
          onClose()
        }}
        className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
        title={t('search.close')}
      >
        <X size={13} />
      </button>
    </div>
  )
}
