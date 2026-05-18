import { describe, expect, it } from 'vitest'
import {
  normalizeAIResponseLocalePreference,
  normalizeLocaleCode,
  normalizeLocalePreference,
  resolveAIResponseLocale,
  resolveLocalePreference
} from './locale-schema'

describe('locale-schema', () => {
  it('normalizes exact locales, regional variants, and script variants', () => {
    expect(normalizeLocaleCode('de-DE')).toBe('de-DE')
    expect(normalizeLocaleCode('de_AT')).toBe('de-DE')
    expect(normalizeLocaleCode('pt-PT')).toBe('pt-PT')
    expect(normalizeLocaleCode('pt-MZ')).toBe('pt-BR')
    expect(normalizeLocaleCode('zh-TW')).toBe('zh-Hant')
    expect(normalizeLocaleCode('zh-CN')).toBe('zh-Hans')
    expect(normalizeLocaleCode('not-a-locale')).toBeNull()
  })

  it('preserves system and app preferences while rejecting unsupported values', () => {
    expect(normalizeLocalePreference('system')).toBe('system')
    expect(normalizeLocalePreference('fr-CA')).toBe('fr-FR')
    expect(normalizeLocalePreference('xx')).toBe('system')
    expect(normalizeAIResponseLocalePreference('app')).toBe('app')
    expect(normalizeAIResponseLocalePreference('ja')).toBe('ja-JP')
    expect(normalizeAIResponseLocalePreference('xx')).toBe('app')
  })

  it('resolves system and AI response preferences with fallbacks', () => {
    expect(resolveLocalePreference('system', ['nl-BE'])).toBe('nl-NL')
    expect(resolveLocalePreference('system', [])).toBe('en')
    expect(resolveLocalePreference('it-IT', ['de-DE'])).toBe('it-IT')
    expect(resolveAIResponseLocale('app', 'pl-PL')).toBe('pl-PL')
    expect(resolveAIResponseLocale('en', 'pl-PL')).toBe('en')
  })
})
