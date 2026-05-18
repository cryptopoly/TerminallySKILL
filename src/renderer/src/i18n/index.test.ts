import { beforeEach, describe, expect, it } from 'vitest'
import { SUPPORTED_LOCALES } from '../../../shared/locale-schema'
import { formatDateTime, formatNumber, compareLocalized } from './format'
import {
  i18n,
  initializeI18n,
  resolveAppLocale,
  resolveFormatLocale,
  syncI18nWithSettings
} from './index'

type TestDocument = {
  documentElement: {
    lang: string
    dir: string
    dataset: Record<string, string>
  }
}

function setNavigatorLocales(languages: string[], language = languages[0] ?? 'en-US'): void {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      languages,
      language
    }
  })
}

function setTestDocument(): TestDocument {
  const testDocument: TestDocument = {
    documentElement: {
      lang: '',
      dir: '',
      dataset: {}
    }
  }

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: testDocument
  })

  return testDocument
}

describe('renderer i18n', () => {
  beforeEach(() => {
    setNavigatorLocales(['en-US'], 'en-US')
    setTestDocument()
  })

  it('resolves app and format locales from system preferences', () => {
    setNavigatorLocales(['fr-CA', 'en-US'], 'fr-CA')

    expect(resolveAppLocale({ uiLocale: 'system' })).toBe('fr-FR')
    expect(resolveFormatLocale({ formatLocale: 'system' })).toBe('fr-FR')

    setNavigatorLocales(['xx-YY'], 'xx-YY')
    expect(resolveAppLocale({ uiLocale: 'system' })).toBe('en')
  })

  it('initializes and syncs document language metadata', async () => {
    const testDocument = setTestDocument()

    await initializeI18n({ uiLocale: 'ar' })
    expect(i18n.language).toBe('ar')
    expect(testDocument.documentElement.lang).toBe('ar')
    expect(testDocument.documentElement.dir).toBe('rtl')
    expect(testDocument.documentElement.dataset.locale).toBe('ar')

    await syncI18nWithSettings({ uiLocale: 'de-DE' })
    expect(i18n.language).toBe('de-DE')
    expect(testDocument.documentElement.lang).toBe('de-DE')
    expect(testDocument.documentElement.dir).toBe('ltr')
    expect(testDocument.documentElement.dataset.locale).toBe('de-DE')
  })

  it('renders non-English launch chrome for German', async () => {
    await syncI18nWithSettings({ uiLocale: 'de-DE' })

    expect(i18n.t('layout:empty.title')).toBe('Erste Schritte')
    expect(i18n.t('layout:sidebar.tabs.commands')).toBe('Befehle')
    expect(i18n.t('projects:selector.none')).toBe('Kein Projekt')
    expect(i18n.t('scripts:empty.globalTitle')).toBe('Noch keine Skripte')
    expect(i18n.t('terminal:panel.noSessions')).toBe('Keine Terminal-Sitzungen. Klicke auf + oder fuhre einen Befehl aus.')
    expect(i18n.t('layout:empty.title')).not.toBe('Get started')
  })

  it('formats dates, numbers, and sorting through the selected format locale', () => {
    const date = new Date(Date.UTC(2026, 4, 12, 13, 30))

    expect(formatDateTime(date, { formatLocale: 'en-GB' }, { timeZone: 'UTC' })).toBe('12 May 2026, 13:30')
    expect(formatNumber(1234567.89, { formatLocale: 'de-DE' })).toBe('1.234.567,89')
    expect(compareLocalized('item2', 'item10', { formatLocale: 'en' })).toBeLessThan(0)
  })

  it('keeps every supported locale usable by Intl formatting', () => {
    const date = new Date(Date.UTC(2026, 4, 12, 13, 30))

    for (const locale of SUPPORTED_LOCALES) {
      expect(formatDateTime(date, { formatLocale: locale }, { timeZone: 'UTC' }), locale).not.toHaveLength(0)
      expect(formatNumber(1234.5, { formatLocale: locale }), locale).not.toHaveLength(0)
    }
  })
})
