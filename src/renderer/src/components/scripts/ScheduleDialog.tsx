import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { AlertTriangle, CalendarClock, Trash2, X } from 'lucide-react'
import type { Script } from '../../../../shared/script-schema'
import {
  MAX_SCHEDULE_INTERVAL_MINUTES,
  MIN_SCHEDULE_INTERVAL_MINUTES,
  isValidScheduleTime,
  type Schedule,
  type ScheduleRecurrence
} from '../../../../shared/schedule-schema'
import {
  getMissingRequiredWorkflowInputs,
  getWorkflowInputInitialValues
} from '../../../../shared/workflow-execution'
import { useProjectStore } from '../../store/project-store'
import { useScheduleStore } from '../../store/schedule-store'
import { useSettingsStore } from '../../store/settings-store'
import { formatDateTime } from '../../i18n/format'
import { resolveFormatLocale } from '../../i18n'

type Mode = 'interval' | 'daily'
type IntervalUnit = 'minutes' | 'hours'

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const NO_PROJECT = ''

function weekdayLabel(day: number, locale: string): string {
  // 2026-11-01 is a Sunday, so day numbers line up with Date#getDay()
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2026, 10, 1 + day))
}

function unitLabel(unit: 'minute' | 'hour', value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'long' }).format(value)
}

interface ScheduleDialogProps {
  script: Script
  onClose: () => void
}

export function ScheduleDialog({ script, onClose }: ScheduleDialogProps): JSX.Element {
  const { t } = useTranslation('scripts')
  const settings = useSettingsStore((s) => s.settings)
  const projects = useProjectStore((s) => s.projects)
  const activeProject = useProjectStore((s) => s.activeProject)
  const allSchedules = useScheduleStore((s) => s.schedules)
  const refresh = useScheduleStore((s) => s.refresh)
  const locale = resolveFormatLocale(settings)

  const [mode, setMode] = useState<Mode>('interval')
  const [intervalValue, setIntervalValue] = useState(30)
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>('minutes')
  const [time, setTime] = useState('09:00')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [projectId, setProjectId] = useState<string>(script.projectId ?? activeProject?.id ?? NO_PROJECT)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void refresh()
  }, [refresh])

  const schedules = useMemo(
    () => allSchedules.filter((schedule) => schedule.scriptId === script.id),
    [allSchedules, script.id]
  )

  // A scheduled run has nobody to type input values, so only defaults can fill them.
  const missingDefaults = getMissingRequiredWorkflowInputs(
    script.inputs,
    getWorkflowInputInitialValues(script.inputs)
  )
  const hasApprovalStep = script.steps.some((step) => step.type === 'approval' && step.enabled)

  const intervalMinutes = intervalUnit === 'hours' ? intervalValue * 60 : intervalValue
  const intervalValid =
    Number.isFinite(intervalMinutes) &&
    intervalMinutes >= MIN_SCHEDULE_INTERVAL_MINUTES &&
    intervalMinutes <= MAX_SCHEDULE_INTERVAL_MINUTES
  const canAdd = missingDefaults.length === 0 && (mode === 'interval' ? intervalValid : isValidScheduleTime(time))

  const describe = (recurrence: ScheduleRecurrence): string => {
    if (recurrence.kind === 'interval') {
      const value =
        recurrence.everyMinutes % 60 === 0
          ? unitLabel('hour', recurrence.everyMinutes / 60, locale)
          : unitLabel('minute', recurrence.everyMinutes, locale)
      return t('schedule.summaryInterval', { interval: value })
    }
    if (recurrence.weekdays.length === 0) return t('schedule.summaryDaily', { time: recurrence.time })
    const days = WEEKDAY_ORDER.filter((day) => recurrence.weekdays.includes(day))
      .map((day) => weekdayLabel(day, locale))
      .join(', ')
    return t('schedule.summaryWeekdays', { days, time: recurrence.time })
  }

  const handleAdd = async (): Promise<void> => {
    setError(null)
    const recurrence: ScheduleRecurrence =
      mode === 'interval'
        ? { kind: 'interval', everyMinutes: intervalMinutes }
        : { kind: 'daily', time, weekdays }
    try {
      await window.electronAPI.saveSchedule({
        scriptId: script.id,
        projectId: projectId === NO_PROJECT ? null : projectId,
        recurrence,
        enabled: true
      })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleToggle = async (schedule: Schedule): Promise<void> => {
    await window.electronAPI.saveSchedule({ ...schedule, enabled: !schedule.enabled })
    await refresh()
  }

  const handleDelete = async (schedule: Schedule): Promise<void> => {
    await window.electronAPI.deleteSchedule(schedule.id)
    await refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4">
      <div className="bg-surface-light border border-surface-border rounded-2xl w-full max-w-lg shadow-2xl shadow-black/40 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarClock size={16} className="text-accent-light shrink-0" />
            <h2 className="text-lg font-semibold text-gray-200 truncate">
              {t('schedule.title', { name: script.name })}
            </h2>
          </div>
          <button onClick={onClose} className="tv-btn-icon" aria-label={t('schedule.close')}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <p className="text-xs text-gray-500 leading-5">{t('schedule.intro')}</p>

          {missingDefaults.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-caution/30 bg-caution/10 p-3 text-xs text-caution">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{t('schedule.needsDefaults')}</span>
            </div>
          )}

          <section className="space-y-2">
            {schedules.length === 0 && <p className="text-sm text-gray-500">{t('schedule.none')}</p>}
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface p-3"
              >
                <input
                  type="checkbox"
                  checked={schedule.enabled}
                  onChange={() => void handleToggle(schedule)}
                  aria-label={t('schedule.enabled')}
                  className="rounded border-surface-border bg-surface"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-200">{describe(schedule.recurrence)}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                    {schedule.enabled && schedule.nextRunAt
                      ? t('schedule.nextRun', { when: formatDateTime(schedule.nextRunAt, settings) })
                      : t('schedule.paused')}
                    {schedule.lastStatus && (
                      <>
                        {' · '}
                        {t('schedule.lastRun', { status: t(`schedule.status.${schedule.lastStatus}`) })}
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => void handleDelete(schedule)}
                  className="tv-btn-icon-sm hover:text-destructive"
                  title={t('schedule.delete')}
                  aria-label={t('schedule.delete')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </section>

          <section className="space-y-3 rounded-xl border border-surface-border bg-surface p-4">
            <div className="inline-flex rounded-lg border border-surface-border p-0.5 text-xs">
              {(['interval', 'daily'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  className={clsx(
                    'rounded-md px-3 py-1 transition-colors',
                    mode === value ? 'bg-accent/15 text-accent-light' : 'text-gray-500 hover:text-gray-300'
                  )}
                >
                  {t(`schedule.mode.${value}`)}
                </button>
              ))}
            </div>

            {mode === 'interval' ? (
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span>{t('schedule.every')}</span>
                <input
                  type="number"
                  min={1}
                  value={intervalValue}
                  onChange={(e) => setIntervalValue(Number(e.target.value))}
                  className="tv-input w-20"
                />
                <select
                  value={intervalUnit}
                  onChange={(e) => setIntervalUnit(e.target.value as IntervalUnit)}
                  className="tv-input"
                >
                  <option value="minutes">{t('schedule.minutes')}</option>
                  <option value="hours">{t('schedule.hours')}</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span>{t('schedule.at')}</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="tv-input"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_ORDER.map((day) => {
                    const on = weekdays.includes(day)
                    return (
                      <button
                        key={day}
                        onClick={() =>
                          setWeekdays((current) =>
                            on ? current.filter((entry) => entry !== day) : [...current, day]
                          )
                        }
                        aria-pressed={on}
                        className={clsx(
                          'rounded-md border px-2 py-1 text-xs transition-colors',
                          on
                            ? 'border-accent/40 bg-accent/10 text-accent-light'
                            : 'border-surface-border text-gray-500 hover:text-gray-300'
                        )}
                      >
                        {weekdayLabel(day, locale)}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[11px] text-gray-600">{t('schedule.weekdaysHint')}</p>
              </div>
            )}

            {script.projectId === null && (
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <span className="shrink-0">{t('schedule.runIn')}</span>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="tv-input min-w-0 flex-1"
                >
                  <option value={NO_PROJECT}>{t('schedule.localShell')}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              onClick={() => void handleAdd()}
              disabled={!canAdd}
              className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
            >
              {t('schedule.add')}
            </button>
          </section>

          {hasApprovalStep && <p className="text-[11px] text-gray-500 leading-5">{t('schedule.approvalNote')}</p>}
        </div>
      </div>
    </div>
  )
}
