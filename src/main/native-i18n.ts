import { app } from 'electron'
import { resources } from '../renderer/src/i18n/resources'
import { FALLBACK_LOCALE, resolveLocalePreference } from '../shared/locale-schema'
import { getSettings } from './settings-manager'

const uiLocaleListeners: Array<() => void> = []

/** Run `listener` whenever the user changes the UI language (to rebuild native menus) */
export function onUiLocaleChange(listener: () => void): void {
  uiLocaleListeners.push(listener)
}

export function notifyUiLocaleChanged(): void {
  for (const listener of uiLocaleListeners) listener()
}

type NativeKey =
  | 'menu.file'
  | 'menu.newWindow'
  | 'menu.edit'
  | 'menu.window'
  | 'closeDialog.title'
  | 'closeDialog.closeAnyway'
  | 'closeDialog.cancel'
  | 'closeDialog.processOne'
  | 'closeDialog.processMany'
  | 'closeDialog.terminateOne'
  | 'closeDialog.terminateMany'
  | `starterPack.${string}`
  | `errors.${string}`

function lookup(bundle: Record<string, unknown> | undefined, key: string): string | undefined {
  let node: unknown = bundle
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

/**
 * Translator for native menus and dialogs, which live in the main process and so cannot use
 * the renderer's i18next instance. Uses the same resource bundles and the saved UI language.
 */
export type NativeTranslator = (key: NativeKey, values?: Record<string, string | number>) => string

function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) => String(values[name] ?? ''))
}

// Last translator built for the saved UI language. Lets synchronous code paths (e.g. error
// constructors) use the current language without awaiting settings; falls back to English
// until getNativeTranslator() has run once (it runs at startup when building the menus).
let cachedTranslator: NativeTranslator | null = null

/** Synchronous translate using the most recently resolved UI language (English before first use) */
export function translateNativeSync(key: NativeKey, values: Record<string, string | number> = {}): string {
  if (cachedTranslator) return cachedTranslator(key, values)
  return interpolate(lookup(resources[FALLBACK_LOCALE].native, key) ?? key, values)
}

export async function getNativeTranslator(): Promise<NativeTranslator> {
  const { uiLocale } = await getSettings()
  const locale = resolveLocalePreference(uiLocale, app.getPreferredSystemLanguages(), FALLBACK_LOCALE)
  const bundle = resources[locale]?.native
  const fallback = resources[FALLBACK_LOCALE].native

  const translator: NativeTranslator = (key, values = {}) =>
    interpolate(lookup(bundle, key) ?? lookup(fallback, key) ?? key, values)
  cachedTranslator = translator
  return translator
}
