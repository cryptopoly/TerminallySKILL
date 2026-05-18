export const SUPPORTED_LOCALES = [
  'en',
  'en-US',
  'en-GB',
  'de-DE',
  'fr-FR',
  'es',
  'pt-BR',
  'zh-Hans',
  'zh-Hant',
  'ja-JP',
  'ru-RU',
  'pl-PL',
  'it-IT',
  'ko-KR',
  'nl-NL',
  'uk-UA',
  'id-ID',
  'tr-TR',
  'pt-PT',
  'ar',
  'hi-IN'
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export type LocalePreference = 'system' | SupportedLocale
export type AIResponseLocalePreference = 'app' | SupportedLocale
export type TextDirection = 'ltr' | 'rtl'

export interface LocaleMetadata {
  code: SupportedLocale
  englishName: string
  nativeName: string
  direction: TextDirection
  launchTier: 'P0' | 'P1' | 'P2'
}

export const DEFAULT_UI_LOCALE: LocalePreference = 'system'
export const DEFAULT_FORMAT_LOCALE: LocalePreference = 'system'
export const DEFAULT_AI_RESPONSE_LOCALE: AIResponseLocalePreference = 'app'
export const FALLBACK_LOCALE: SupportedLocale = 'en'

export const LOCALE_METADATA: Record<SupportedLocale, LocaleMetadata> = {
  en: {
    code: 'en',
    englishName: 'English',
    nativeName: 'English',
    direction: 'ltr',
    launchTier: 'P0'
  },
  'en-US': {
    code: 'en-US',
    englishName: 'English (United States)',
    nativeName: 'English (United States)',
    direction: 'ltr',
    launchTier: 'P0'
  },
  'en-GB': {
    code: 'en-GB',
    englishName: 'English (United Kingdom)',
    nativeName: 'English (United Kingdom)',
    direction: 'ltr',
    launchTier: 'P0'
  },
  'de-DE': {
    code: 'de-DE',
    englishName: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    launchTier: 'P0'
  },
  'fr-FR': {
    code: 'fr-FR',
    englishName: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    launchTier: 'P0'
  },
  es: {
    code: 'es',
    englishName: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    launchTier: 'P0'
  },
  'pt-BR': {
    code: 'pt-BR',
    englishName: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
    direction: 'ltr',
    launchTier: 'P0'
  },
  'zh-Hans': {
    code: 'zh-Hans',
    englishName: 'Chinese (Simplified)',
    nativeName: '简体中文',
    direction: 'ltr',
    launchTier: 'P0'
  },
  'zh-Hant': {
    code: 'zh-Hant',
    englishName: 'Chinese (Traditional)',
    nativeName: '繁體中文',
    direction: 'ltr',
    launchTier: 'P1'
  },
  'ja-JP': {
    code: 'ja-JP',
    englishName: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    launchTier: 'P0'
  },
  'ru-RU': {
    code: 'ru-RU',
    englishName: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    launchTier: 'P0'
  },
  'pl-PL': {
    code: 'pl-PL',
    englishName: 'Polish',
    nativeName: 'Polski',
    direction: 'ltr',
    launchTier: 'P0'
  },
  'it-IT': {
    code: 'it-IT',
    englishName: 'Italian',
    nativeName: 'Italiano',
    direction: 'ltr',
    launchTier: 'P0'
  },
  'ko-KR': {
    code: 'ko-KR',
    englishName: 'Korean',
    nativeName: '한국어',
    direction: 'ltr',
    launchTier: 'P1'
  },
  'nl-NL': {
    code: 'nl-NL',
    englishName: 'Dutch',
    nativeName: 'Nederlands',
    direction: 'ltr',
    launchTier: 'P1'
  },
  'uk-UA': {
    code: 'uk-UA',
    englishName: 'Ukrainian',
    nativeName: 'Українська',
    direction: 'ltr',
    launchTier: 'P1'
  },
  'id-ID': {
    code: 'id-ID',
    englishName: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    direction: 'ltr',
    launchTier: 'P1'
  },
  'tr-TR': {
    code: 'tr-TR',
    englishName: 'Turkish',
    nativeName: 'Türkçe',
    direction: 'ltr',
    launchTier: 'P2'
  },
  'pt-PT': {
    code: 'pt-PT',
    englishName: 'Portuguese (Portugal)',
    nativeName: 'Português (Portugal)',
    direction: 'ltr',
    launchTier: 'P2'
  },
  ar: {
    code: 'ar',
    englishName: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    launchTier: 'P2'
  },
  'hi-IN': {
    code: 'hi-IN',
    englishName: 'Hindi',
    nativeName: 'हिन्दी',
    direction: 'ltr',
    launchTier: 'P2'
  }
}

const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES)

const LANGUAGE_FALLBACKS: Record<string, SupportedLocale> = {
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es',
  pt: 'pt-BR',
  zh: 'zh-Hans',
  ja: 'ja-JP',
  ru: 'ru-RU',
  pl: 'pl-PL',
  it: 'it-IT',
  ko: 'ko-KR',
  nl: 'nl-NL',
  uk: 'uk-UA',
  id: 'id-ID',
  tr: 'tr-TR',
  ar: 'ar',
  hi: 'hi-IN'
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && SUPPORTED_LOCALE_SET.has(value)
}

export function normalizeLocaleCode(value: string | null | undefined): SupportedLocale | null {
  if (!value) return null
  const normalized = value.replace(/_/g, '-')
  if (isSupportedLocale(normalized)) return normalized

  const lower = normalized.toLowerCase()
  if (lower.startsWith('zh-hant') || lower === 'zh-tw' || lower === 'zh-hk' || lower === 'zh-mo') {
    return 'zh-Hant'
  }
  if (lower.startsWith('zh')) return 'zh-Hans'

  const language = lower.split('-')[0]
  return LANGUAGE_FALLBACKS[language] ?? null
}

export function normalizeLocalePreference(value: unknown): LocalePreference {
  if (value === 'system') return 'system'
  return normalizeLocaleCode(typeof value === 'string' ? value : null) ?? DEFAULT_UI_LOCALE
}

export function normalizeAIResponseLocalePreference(value: unknown): AIResponseLocalePreference {
  if (value === 'app') return 'app'
  return normalizeLocaleCode(typeof value === 'string' ? value : null) ?? DEFAULT_AI_RESPONSE_LOCALE
}

export function resolveLocalePreference(
  preference: LocalePreference,
  systemLocales: readonly string[],
  fallback: SupportedLocale = FALLBACK_LOCALE
): SupportedLocale {
  if (preference !== 'system') return preference

  for (const locale of systemLocales) {
    const normalized = normalizeLocaleCode(locale)
    if (normalized) return normalized
  }

  return fallback
}

export function resolveAIResponseLocale(
  preference: AIResponseLocalePreference,
  appLocale: SupportedLocale
): SupportedLocale {
  return preference === 'app' ? appLocale : preference
}
