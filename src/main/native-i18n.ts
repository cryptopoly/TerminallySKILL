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
export async function getNativeTranslator(): Promise<
  (key: NativeKey, values?: Record<string, string | number>) => string
> {
  const { uiLocale } = await getSettings()
  const locale = resolveLocalePreference(uiLocale, app.getPreferredSystemLanguages(), FALLBACK_LOCALE)
  const bundle = resources[locale]?.native
  const fallback = resources[FALLBACK_LOCALE].native

  return (key, values = {}) => {
    const template = lookup(bundle, key) ?? lookup(fallback, key) ?? key
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) => String(values[name] ?? ''))
  }
}
