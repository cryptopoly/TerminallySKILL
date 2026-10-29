import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { AppSettings } from '../../../shared/settings-schema'
import {
  FALLBACK_LOCALE,
  LOCALE_METADATA,
  resolveLocalePreference,
  SUPPORTED_LOCALES,
  type SupportedLocale
} from '../../../shared/locale-schema'
import { loadLocaleResource } from './loader'
import { I18N_NAMESPACES } from './resources'

function getNavigatorLocales(): string[] {
  const languages = navigator.languages?.length ? [...navigator.languages] : []
  if (navigator.language && !languages.includes(navigator.language)) {
    languages.push(navigator.language)
  }
  return languages
}

export function resolveAppLocale(settings: Pick<AppSettings, 'uiLocale'>): SupportedLocale {
  return resolveLocalePreference(settings.uiLocale, getNavigatorLocales(), FALLBACK_LOCALE)
}

export function resolveFormatLocale(settings: Pick<AppSettings, 'formatLocale'>): SupportedLocale {
  return resolveLocalePreference(settings.formatLocale, getNavigatorLocales(), FALLBACK_LOCALE)
}

function applyDocumentLocale(locale: SupportedLocale): void {
  const meta = LOCALE_METADATA[locale]
  document.documentElement.lang = locale
  document.documentElement.dir = meta.direction
  document.documentElement.dataset.locale = locale
}

/** Add a locale's bundles to i18next the first time it is needed (loaded lazily, cached by the loader) */
async function ensureLocaleLoaded(locale: SupportedLocale): Promise<void> {
  if (i18n.hasResourceBundle(locale, 'common')) return
  const resource = await loadLocaleResource(locale)
  for (const [namespace, bundle] of Object.entries(resource)) {
    i18n.addResourceBundle(locale, namespace, bundle, true, true)
  }
}

// Only the most recent switch may apply, so a slow earlier load cannot override a later choice
let latestRequestedLocale: SupportedLocale | null = null

async function activateLocale(locale: SupportedLocale): Promise<void> {
  latestRequestedLocale = locale
  await ensureLocaleLoaded(locale)
  if (latestRequestedLocale !== locale) return
  if (i18n.language !== locale) {
    await i18n.changeLanguage(locale)
  }
  applyDocumentLocale(locale)
}

export async function initializeI18n(settings: Pick<AppSettings, 'uiLocale'>): Promise<void> {
  const locale = resolveAppLocale(settings)

  if (!i18n.isInitialized) {
    // Only English (the fallback) and the active locale are loaded at startup
    const [english, active] = await Promise.all([
      loadLocaleResource(FALLBACK_LOCALE),
      loadLocaleResource(locale)
    ])
    await i18n.use(initReactI18next).init({
      resources: { [FALLBACK_LOCALE]: english, [locale]: active },
      lng: locale,
      fallbackLng: FALLBACK_LOCALE,
      supportedLngs: [...SUPPORTED_LOCALES],
      load: 'currentOnly',
      ns: [...I18N_NAMESPACES],
      defaultNS: 'common',
      fallbackNS: 'common',
      interpolation: {
        escapeValue: false
      },
      returnEmptyString: false
    })
    applyDocumentLocale(locale)
    return
  }

  await activateLocale(locale)
}

export async function syncI18nWithSettings(settings: Pick<AppSettings, 'uiLocale'>): Promise<void> {
  const locale = resolveAppLocale(settings)
  if (!i18n.isInitialized) {
    await initializeI18n(settings)
    return
  }

  await activateLocale(locale)
}

export { i18n }
