/// <reference types="vite/client" />
import { FALLBACK_LOCALE } from '../../../shared/locale-schema'
import { applyTranslatedBundle, baseResources, type LocaleResource } from './resources'

type TranslatedBundle = Record<string, Record<string, string>>
type BundleLoaders = Record<string, () => Promise<TranslatedBundle>>

/**
 * Builds a loader that resolves a locale's full resource bundle on demand: the inline base
 * bundle plus its JSON translations, which are fetched lazily and cached per locale.
 */
export function createLocaleLoader(bundleLoaders: BundleLoaders) {
  const cache = new Map<string, Promise<LocaleResource>>()

  async function build(locale: string): Promise<LocaleResource> {
    const loadBundle = bundleLoaders[`./locales/${locale}.json`]
    if (!loadBundle) return applyTranslatedBundle(locale)
    try {
      return applyTranslatedBundle(locale, await loadBundle())
    } catch (error) {
      // Keep the UI usable (inline strings, then English) and allow a retry on the next switch
      console.warn(`Failed to load ${locale} translations`, error)
      cache.delete(locale)
      return applyTranslatedBundle(locale)
    }
  }

  return function loadLocaleResource(locale: string): Promise<LocaleResource> {
    const key = baseResources[locale] ? locale : FALLBACK_LOCALE
    let pending = cache.get(key)
    if (!pending) {
      pending = build(key)
      cache.set(key, pending)
    }
    return pending
  }
}

// Vite emits each locale JSON as its own chunk, so only the locales actually used are loaded
export const loadLocaleResource = createLocaleLoader(
  import.meta.glob<TranslatedBundle>('./locales/*.json', { import: 'default' })
)
