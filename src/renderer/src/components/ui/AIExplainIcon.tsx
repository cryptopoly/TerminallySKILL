import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { Loader2, Sparkles, X } from 'lucide-react'
import { HelpTip } from './HelpTip'
import { useSettingsStore } from '../../store/settings-store'

interface AIExplainIconProps {
  commandName: string
  commandString: string
  commandDescription?: string
}

interface PopoverPosition {
  left: number
  top: number
  width: number
  ready: boolean
}

export function AIExplainIcon({
  commandName,
  commandString,
  commandDescription
}: AIExplainIconProps): JSX.Element {
  const { t } = useTranslation('ai')
  const activeAIProvider = useSettingsStore((s) => s.settings.activeAIProvider)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [meta, setMeta] = useState<{ providerLabel: string; model: string } | null>(null)
  const [position, setPosition] = useState<PopoverPosition>({
    left: 16,
    top: 16,
    width: 380,
    ready: false
  })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !popoverRef.current) return

    const trigger = triggerRef.current.getBoundingClientRect()
    const popover = popoverRef.current.getBoundingClientRect()
    const width = Math.min(420, Math.max(320, window.innerWidth - 32))
    let left = trigger.left + trigger.width / 2 - width / 2
    left = Math.max(16, Math.min(left, window.innerWidth - width - 16))

    let top = trigger.bottom + 10
    if (top + popover.height > window.innerHeight - 16) {
      top = Math.max(16, trigger.top - popover.height - 10)
    }

    setPosition({
      left,
      top,
      width,
      ready: true
    })
  }, [])

  const loadExplanation = useCallback(async () => {
    setLoading(true)
    setError(null)
    setContent(null)
    setMeta(null)

    try {
      let response

      try {
        response = await window.electronAPI.runAIAction({
          action: 'command-explain',
          commandName,
          commandString,
          commandDescription
        })
      } catch (aiError) {
        const message = aiError instanceof Error ? aiError.message : String(aiError)
        if (!message.includes('Unsupported AI action: command-explain')) {
          throw aiError
        }

        response = await window.electronAPI.runAIAction({
          action: 'command-review',
          commandName,
          commandString,
          commandDescription
        })
      }

      setContent(response.content)
      setMeta({
        providerLabel: response.providerLabel,
        model: response.model
      })
    } catch (aiError) {
      setError(aiError instanceof Error ? aiError.message : String(aiError))
    } finally {
      setLoading(false)
    }
  }, [commandDescription, commandName, commandString])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent): void => {
      const target = event.target as Node | null
      if (!target) return
      if (popoverRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }

    const handleReposition = (): void => {
      updatePosition()
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [open, updatePosition])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open, content, error, loading, updatePosition])

  const handleToggle = (): void => {
    if (!activeAIProvider) return

    if (open) {
      setOpen(false)
      return
    }

    setPosition((current) => ({ ...current, ready: false }))
    setOpen(true)
    void loadExplanation()
  }

  const handleOpenDraft = (): void => {
    window.dispatchEvent(
      new CustomEvent('tv:open-ai-draft', {
        detail: {
          prompt: commandDescription
            ? t('explain.draftPromptWithContext', { commandString, commandDescription })
            : t('explain.draftPrompt', { commandString })
        }
      })
    )
    setOpen(false)
  }

  return (
    <>
      <HelpTip
        label={t('explain.label')}
        description={
          activeAIProvider
            ? t('explain.enabledDescription')
            : t('explain.disabledDescription')
        }
        disabled={open}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          disabled={!activeAIProvider}
          className="p-0.5 rounded text-gray-600 hover:text-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t('explain.label')}
        >
          <Sparkles size={12} />
        </button>
      </HelpTip>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[180] rounded-xl border border-surface-border bg-surface-light shadow-2xl shadow-black/45 overflow-hidden"
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              visibility: position.ready ? 'visible' : 'hidden'
            }}
          >
            <div className="flex items-center gap-2 border-b border-surface-border px-3 py-2">
              <Sparkles size={13} className="text-accent-light" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {t('explain.title')}
              </span>
              {meta && (
                <span className="ml-auto text-[11px] text-gray-500">
                  {meta.providerLabel} · {meta.model}
                </span>
              )}
              <button
                type="button"
                onClick={handleOpenDraft}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-gray-400 hover:bg-surface hover:text-accent-light transition-colors"
                title={t('explain.openDraft')}
              >
                {t('explain.aiDraft')}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-gray-500 hover:bg-surface hover:text-gray-200 transition-colors"
                title={t('explain.close')}
              >
                <X size={13} />
              </button>
            </div>
            <div className="border-b border-surface-border/70 px-3 py-2">
              <code className="block truncate font-mono text-[11px] text-accent-light">{commandString}</code>
            </div>
            <div className="max-h-[min(24rem,calc(100vh-7rem))] overflow-y-auto px-3 py-3">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 size={14} className="animate-spin" />
                  {t('explain.loading')}
                </div>
              )}
              {error && <div className="text-sm text-destructive whitespace-pre-wrap">{error}</div>}
              {content && <div className="text-sm text-gray-200 whitespace-pre-wrap leading-6">{content}</div>}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
