import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { AppSettings } from '../../../shared/settings-schema'
import {
  FALLBACK_LOCALE,
  LOCALE_METADATA,
  resolveLocalePreference,
  type SupportedLocale
} from '../../../shared/locale-schema'
import { I18N_NAMESPACES, resources } from './resources'

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

export async function initializeI18n(settings: Pick<AppSettings, 'uiLocale'>): Promise<void> {
  const locale = resolveAppLocale(settings)

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: FALLBACK_LOCALE,
      supportedLngs: Object.keys(resources),
      load: 'currentOnly',
      ns: [...I18N_NAMESPACES],
      defaultNS: 'common',
      fallbackNS: 'common',
      interpolation: {
        escapeValue: false
      },
      returnEmptyString: false
    })
  } else if (i18n.language !== locale) {
    await i18n.changeLanguage(locale)
  }

  applyDocumentLocale(locale)
}

export async function syncI18nWithSettings(settings: Pick<AppSettings, 'uiLocale'>): Promise<void> {
  const locale = resolveAppLocale(settings)
  if (!i18n.isInitialized) {
    await initializeI18n(settings)
    return
  }

  if (i18n.language !== locale) {
    await i18n.changeLanguage(locale)
  }
  applyDocumentLocale(locale)
}

export { i18n }
