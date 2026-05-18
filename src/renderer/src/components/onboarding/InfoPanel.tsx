import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X, FolderOpen, Star, ScrollText, TerminalSquare, FileText, Zap,
  Camera, Keyboard, Code2, Settings, Columns2, Search, Monitor
} from 'lucide-react'

interface Section {
  id: string
  icon: React.ReactNode
  title: string
  color: string
  keywords?: string[]
  steps: { label: string; desc: string }[]
}

interface GuideSection extends Section {
  matchCount: number
  visibleSteps: Section['steps']
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getGuideMatchCount(section: Section, query: string): number {
  if (!query) return section.steps.length

  const sectionHaystack = [section.title, ...(section.keywords ?? [])].join(' ').toLowerCase()
  if (sectionHaystack.includes(query)) {
    return section.steps.length
  }

  return section.steps.reduce((count, step) => {
    const haystack = `${step.label} ${step.desc}`.toLowerCase()
    return haystack.includes(query) ? count + 1 : count
  }, 0)
}

function getVisibleGuideSteps(section: Section, query: string): Section['steps'] {
  if (!query) return section.steps

  const sectionHaystack = [section.title, ...(section.keywords ?? [])].join(' ').toLowerCase()
  if (sectionHaystack.includes(query)) {
    return section.steps
  }

  return section.steps.filter((step) => {
    const haystack = `${step.label} ${step.desc}`.toLowerCase()
    return haystack.includes(query)
  })
}

function highlightGuideText(text: string, query: string): React.ReactNode {
  const trimmed = query.trim()
  if (!trimmed) return text

  const matcher = new RegExp(`(${escapeRegExp(trimmed)})`, 'ig')
  const parts = text.split(matcher)

  return parts.map((part, index) => (
    index % 2 === 1
      ? (
        <span
          key={`${part}-${index}`}
          className="rounded-sm bg-surface-light px-0.5 text-accent-light ring-1 ring-inset ring-accent/20"
        >
          {part}
        </span>
      )
      : <span key={`${part}-${index}`}>{part}</span>
  ))
}

const SECTION_TEMPLATES = [
  {
    id: 'projects',
    icon: <FolderOpen size={16} />,
    color: 'text-accent',
    keywords: ['workspace', 'directory', 'environment', 'project settings', 'ssh', 'remote'],
    steps: ['create', 'switch', 'groups', 'colours', 'workspaceTargets', 'sshKeys', 'envVars', 'starterPacks']
  },
  {
    id: 'commands',
    icon: <Star size={16} />,
    color: 'text-caution',
    keywords: ['builder', 'flags', 'arguments', 'draft', 'ai review', 'ai draft'],
    steps: ['browse', 'builder', 'aiReview', 'aiDraft', 'preview', 'custom', 'favourites']
  },
  {
    id: 'scripts',
    icon: <ScrollText size={16} />,
    color: 'text-safe',
    keywords: ['workflow', 'approvals', 'inputs', 'tvflow', 'steps'],
    steps: ['create', 'inputs', 'run', 'share']
  },
  {
    id: 'snippets',
    icon: <Code2 size={16} />,
    color: 'text-purple-400',
    keywords: ['template', 'placeholder', 'reuse', 'variables'],
    steps: ['create', 'fill', 'copy']
  },
  {
    id: 'terminal',
    icon: <TerminalSquare size={16} />,
    color: 'text-accent-light',
    keywords: ['terminal', 'editor prompt', 'shell', 'split', 'queue', 'path fix', 'ssh', 'vnc', 'remote desktop'],
    steps: ['open', 'editorPrompt', 'aiReview', 'splits', 'queue', 'pathFix', 'promote', 'sshShell', 'vnc']
  },
  {
    id: 'runsLogs',
    icon: <Columns2 size={16} />,
    color: 'text-amber-300',
    keywords: ['logs', 'history', 'search', 'compare', 'structured runs', 'ai review'],
    steps: ['browser', 'history', 'search', 'compare', 'aiReview', 'folder']
  },
  {
    id: 'captureDiff',
    icon: <Camera size={16} />,
    color: 'text-emerald-400',
    keywords: ['snapshots', 'diff', 'capture', 'compare'],
    steps: ['capture', 'manage', 'compare', 'search']
  },
  {
    id: 'files',
    icon: <FileText size={16} />,
    color: 'text-blue-400',
    keywords: ['editor', 'syntax highlight', 'code', 'file browser'],
    steps: ['browse', 'view', 'edit']
  },
  {
    id: 'aiProviders',
    icon: <Zap size={16} />,
    color: 'text-yellow-400',
    keywords: ['ai', 'openai', 'anthropic', 'ollama', 'gemini', 'api key', 'local model', 'lm studio'],
    steps: ['supported', 'local', 'configure', 'routing', 'privacy']
  },
  {
    id: 'settings',
    icon: <Settings size={16} />,
    color: 'text-gray-400',
    keywords: ['theme', 'preferences', 'updates', 'backup'],
    steps: ['themes', 'terminalInput', 'safePaste', 'logs', 'updates', 'backup', 'tooltips']
  },
  {
    id: 'remoteDesktop',
    icon: <Monitor size={16} />,
    color: 'text-purple-400',
    keywords: ['vnc', 'remote desktop', 'tigervnc', 'vncserver', 'ssh tunnel', 'encrypted', 'display', 'xfce', 'desktop environment'],
    steps: ['overview', 'open', 'installTiger', 'installDesktop', 'configureStartup', 'start', 'check', 'ports', 'password']
  },
  {
    id: 'keyboard',
    icon: <Keyboard size={16} />,
    color: 'text-gray-500',
    keywords: ['shortcuts', 'keys', 'hotkeys'],
    steps: ['terminal', 'palette', 'projectSwitcher', 'splitVertical', 'splitHorizontal', 'focusPane', 'terminalSearch', 'findFiles', 'closeFile', 'snapshot', 'help', 'newTerminal']
  },
] as const

export function InfoPanel({ onClose, initialSection }: { onClose: () => void; initialSection?: string }): JSX.Element {
  const { t } = useTranslation('onboarding')
  const [searchQuery, setSearchQuery] = useState(initialSection ?? '')
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const sections = useMemo<Section[]>(() => (
    SECTION_TEMPLATES.map((section) => ({
      id: section.id,
      icon: section.icon,
      color: section.color,
      keywords: section.keywords,
      title: t(`sections.${section.id}.title`),
      steps: section.steps.map((step) => ({
        label: t(`sections.${section.id}.steps.${step}.label`),
        desc: t(`sections.${section.id}.steps.${step}.desc`, {
          placeholderSyntax: '{{placeholders}}',
          portPlaceholder: '{{port}}',
          imagePlaceholder: '{{image}}'
        })
      }))
    }))
  ), [t])
  const filteredSections = useMemo<GuideSection[]>(() => (
    sections
      .map((section) => ({
        ...section,
        matchCount: getGuideMatchCount(section, normalizedQuery),
        visibleSteps: getVisibleGuideSteps(section, normalizedQuery)
      }))
      .filter((section) => section.matchCount > 0)
  ), [normalizedQuery, sections])
  const totalMatches = useMemo(
    () => filteredSections.reduce((count, section) => count + section.matchCount, 0),
    [filteredSections]
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[640px] max-h-[85vh] bg-surface border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-border shrink-0">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-200">{t('title')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-light transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-surface-border shrink-0 space-y-3 bg-surface-light/40">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-lg border border-surface-border bg-surface pl-9 pr-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] text-gray-500">
            <span>
              {normalizedQuery
                ? t('matchingItem', { count: totalMatches })
                : t('guideSection', { count: sections.length })}
            </span>
            {normalizedQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="rounded-md border border-surface-border px-2 py-1 text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
              >
                {t('clearSearch')}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {!normalizedQuery && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-accent/20 bg-accent/10 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-light">{t('startHere')}</div>
                <p className="mt-2 text-sm text-gray-200">{t('startHereDescription')}</p>
              </div>
              <div className="rounded-xl border border-surface-border bg-surface-light p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{t('goodToKnow')}</div>
                <p className="mt-2 text-sm text-gray-300">{t('goodToKnowDescription')}</p>
              </div>
            </div>
          )}

          {filteredSections.length === 0 ? (
            <div className="rounded-xl border border-surface-border bg-surface-light px-4 py-6 text-center">
              <div className="text-sm font-medium text-gray-300">{t('noMatches')}</div>
              <p className="mt-1 text-xs text-gray-500">{t('noMatchesHint')}</p>
            </div>
          ) : (
            filteredSections.map((section) => (
              <div key={section.id}>
                <div className={`flex items-center gap-2 mb-3 ${section.color}`}>
                  {section.icon}
                  <h3 className="text-sm font-semibold">{highlightGuideText(section.title, searchQuery)}</h3>
                  {normalizedQuery && (
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                      {t('match', { count: section.matchCount })}
                    </span>
                  )}
                </div>
                <div className="space-y-2 ml-6">
                  {section.visibleSteps.map((step) => (
                    <div key={step.label} className="flex gap-3">
                      <span className="text-xs font-medium text-gray-300 shrink-0 mt-0.5 w-40">
                        {highlightGuideText(step.label, searchQuery)}
                      </span>
                      <span className="text-xs text-gray-500 leading-relaxed">
                        {highlightGuideText(step.desc, searchQuery)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border shrink-0 flex items-center justify-between">
          <span className="text-xs text-gray-600">{t('footer')}</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-light text-white text-xs font-medium transition-colors"
          >
            {t('gotIt')}
          </button>
        </div>
      </div>
    </div>
  )
}
