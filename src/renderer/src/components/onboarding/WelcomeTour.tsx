import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight, FolderOpen, X } from 'lucide-react'
import { getTourRect, mergeTouchingRects, placeTourCard, type TourRect } from './welcome-tour-layout'

export interface WelcomeTourStep {
  id: string
  title: string
  body: string
  /**
   * Groups of `data-tour` ids to spotlight. The first group with a visible element wins and all
   * of its visible elements are outlined together. No match: the card is centred, nothing is lit.
   */
  targets: string[][]
}

export const WELCOME_TOUR_STEP_IDS = [
  'welcome',
  'commands',
  'scripts',
  'snippetsFiles',
  'logsSearch',
  'terminal',
  'helpSettings'
] as const

const STEP_TARGETS: Record<(typeof WELCOME_TOUR_STEP_IDS)[number], string[][]> = {
  welcome: [['create-project'], ['project-selector']],
  commands: [['sidebar-tab-commands']],
  scripts: [['sidebar-tab-scripts']],
  snippetsFiles: [['sidebar-tab-snippets', 'sidebar-tab-files']],
  logsSearch: [['sidebar-tab-logs', 'sidebar-tab-search']],
  terminal: [['new-terminal']],
  helpSettings: [['help-guide', 'settings']]
}

const SPOTLIGHT_PADDING = 6

function pad(rect: TourRect): TourRect {
  return {
    left: rect.left - SPOTLIGHT_PADDING,
    top: rect.top - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2
  }
}

interface TourTarget {
  /** One lit hole per element */
  holes: TourRect[]
  /** All holes together, used to place the card */
  bounds: TourRect
  elements: HTMLElement[]
}

function findTarget(groups: string[][]): TourTarget | null {
  for (const group of groups) {
    const elements = group
      .flatMap((id) => Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)))
      .filter((element) => {
        const box = element.getBoundingClientRect()
        return box.width > 0 && box.height > 0
      })
    if (elements.length > 0) {
      const boxes = elements.map((element) => element.getBoundingClientRect())
      return {
        holes: mergeTouchingRects(boxes.map((box) => pad(getTourRect([box])))),
        bounds: pad(getTourRect(boxes)),
        elements
      }
    }
  }
  return null
}

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

export function WelcomeTour({
  step,
  onStepChange,
  onClose,
  onCreateProject
}: {
  step: number
  onStepChange: (step: number) => void
  /** Called when the tour is finished or skipped */
  onClose: () => void
  /** Opens the create-project dialog; the caller hides the tour until the dialog closes */
  onCreateProject: () => void
}): JSX.Element {
  const { t } = useTranslation('onboarding')
  const titleId = useId()
  const bodyId = useId()
  const cardRef = useRef<HTMLDivElement | null>(null)
  const primaryRef = useRef<HTMLButtonElement | null>(null)
  const [target, setTarget] = useState<Omit<TourTarget, 'elements'> | null>(null)
  const maskId = `welcome-tour-mask-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [cardSize, setCardSize] = useState({ width: 360, height: 220 })

  const steps = useMemo<WelcomeTourStep[]>(
    () =>
      WELCOME_TOUR_STEP_IDS.map((id) => ({
        id,
        title: t(`tour.steps.${id}.title`),
        body: t(`tour.steps.${id}.body`),
        targets: STEP_TARGETS[id]
      })),
    [t]
  )
  const index = Math.min(Math.max(step, 0), steps.length - 1)
  const current = steps[index]
  const isFirst = index === 0
  const isLast = index === steps.length - 1

  const measure = useCallback(() => {
    setViewport({ width: window.innerWidth, height: window.innerHeight })
    const found = findTarget(current.targets)
    setTarget(found ? { holes: found.holes, bounds: found.bounds } : null)
  }, [current.targets])

  // Bring the target into view (e.g. a sidebar tab scrolled out of a narrow tab strip), then measure
  useEffect(() => {
    const found = findTarget(current.targets)
    found?.elements[0]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    measure()
    // Layout can settle a frame later (fonts, panels mounting after a project is created)
    const timer = window.setTimeout(measure, 150)
    window.addEventListener('resize', measure)
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(document.body)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [current.targets, measure])

  useLayoutEffect(() => {
    const card = cardRef.current
    if (!card) return
    const { offsetWidth, offsetHeight } = card
    setCardSize((prev) =>
      prev.width === offsetWidth && prev.height === offsetHeight ? prev : { width: offsetWidth, height: offsetHeight }
    )
  })

  // Keep focus inside the tour and return it to where it was when the tour closes
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return () => {
      if (previous && document.contains(previous)) previous.focus()
    }
  }, [])

  useEffect(() => {
    primaryRef.current?.focus()
  }, [index])

  const goNext = useCallback(() => {
    if (isLast) onClose()
    else onStepChange(index + 1)
  }, [index, isLast, onClose, onStepChange])

  const goBack = useCallback(() => {
    if (!isFirst) onStepChange(index - 1)
  }, [index, isFirst, onStepChange])

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }
      // The tour is modal: app shortcuts (new terminal, palette, settings) wait until it closes
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      const inCard = cardRef.current?.contains(event.target as Node) ?? false
      if (event.key === 'Tab') {
        const focusable = Array.from(cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (!inCard || (event.shiftKey && document.activeElement === first)) {
          event.preventDefault()
          ;(event.shiftKey ? last : first).focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
        return
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        const rtl = document.documentElement.dir === 'rtl'
        const forward = (event.key === 'ArrowRight') !== rtl
        event.preventDefault()
        if (forward && !isLast) onStepChange(index + 1)
        if (!forward) goBack()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [goBack, index, isLast, onClose, onStepChange])

  const position = placeTourCard(target?.bounds ?? null, cardSize, viewport)

  return (
    <div className="fixed inset-0 z-[70]" data-testid="welcome-tour">
      {/* Dimmed backdrop with a hole per target; an SVG mask lets several separate holes share one dim layer */}
      <svg aria-hidden="true" className="pointer-events-none fixed inset-0 h-full w-full">
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {target?.holes.map((hole, holeIndex) => (
              <rect key={holeIndex} x={hole.left} y={hole.top} width={hole.width} height={hole.height} rx="10" fill="black" />
            ))}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0, 0, 0, 0.6)" mask={`url(#${maskId})`} />
        {target && (
          <g data-testid="welcome-tour-spotlight">
            {target.holes.map((hole, holeIndex) => (
              <rect
                key={holeIndex}
                x={hole.left}
                y={hole.top}
                width={hole.width}
                height={hole.height}
                rx="10"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
              />
            ))}
          </g>
        )}
      </svg>

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="fixed w-[min(360px,calc(100vw-32px))] rounded-xl border border-surface-border bg-surface p-4 shadow-2xl text-start"
        style={{ top: position.top, left: position.left }}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-accent-light">
              {t('tour.stepOf', { current: index + 1, total: steps.length })}
            </div>
            <h2 id={titleId} className="mt-1 text-base font-semibold text-gray-200">
              {current.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('tour.skip')}
            title={t('tour.skip')}
            className="tv-btn-icon shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        <p id={bodyId} aria-live="polite" className="mt-2 text-sm leading-relaxed text-gray-400">
          {current.body}
        </p>

        {isFirst && (
          <button
            type="button"
            onClick={onCreateProject}
            data-testid="welcome-tour-create-project"
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-light transition-colors hover:bg-accent/20"
          >
            <FolderOpen size={13} />
            {t('empty.createProject', { ns: 'layout' })}
          </button>
        )}

        <ol className="mt-4 flex items-center gap-1.5" aria-label={t('tour.progress')}>
          {steps.map((item, dotIndex) => (
            <li
              key={item.id}
              aria-current={dotIndex === index ? 'step' : undefined}
              className={clsx(
                'h-1.5 rounded-full transition-all',
                dotIndex === index ? 'w-4 bg-accent' : 'w-1.5 bg-surface-border'
              )}
            >
              <span className="sr-only">{item.title}</span>
            </li>
          ))}
        </ol>

        {/* Wraps instead of overflowing when a translation is long */}
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          {!isLast && (
            <button
              type="button"
              onClick={onClose}
              className="me-auto whitespace-nowrap text-xs text-gray-500 transition-colors hover:text-gray-300"
            >
              {t('tour.skip')}
            </button>
          )}
          {!isFirst && (
            <button type="button" onClick={goBack} className="tv-btn-secondary whitespace-nowrap">
              <ChevronLeft size={13} className="rtl:rotate-180" />
              {t('tour.back')}
            </button>
          )}
          <button
            ref={primaryRef}
            type="button"
            onClick={goNext}
            data-testid="welcome-tour-next"
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-light"
          >
            {isLast ? t('tour.done') : t('tour.next')}
            {!isLast && <ChevronRight size={13} className="rtl:rotate-180" />}
          </button>
        </div>
      </div>
    </div>
  )
}
