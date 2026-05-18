import type { AppSettings } from '../../../shared/settings-schema'
import { resolveFormatLocale } from './index'

export function formatDateTime(
  value: string | number | Date | null | undefined,
  settings: Pick<AppSettings, 'formatLocale'>,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (value === null || value === undefined || value === '') return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat(resolveFormatLocale(settings), {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options
  }).format(date)
}

export function formatDate(
  value: string | number | Date | null | undefined,
  settings: Pick<AppSettings, 'formatLocale'>,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return formatDateTime(value, settings, { dateStyle: 'medium', timeStyle: undefined, ...options })
}

export function formatTime(
  value: string | number | Date | null | undefined,
  settings: Pick<AppSettings, 'formatLocale'>,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return formatDateTime(value, settings, { dateStyle: undefined, timeStyle: 'short', ...options })
}

export function formatNumber(
  value: number,
  settings: Pick<AppSettings, 'formatLocale'>,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(resolveFormatLocale(settings), options).format(value)
}

export function compareLocalized(
  left: string,
  right: string,
  settings: Pick<AppSettings, 'formatLocale'>
): number {
  return new Intl.Collator(resolveFormatLocale(settings), {
    sensitivity: 'base',
    numeric: true
  }).compare(left, right)
}
