import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLocaleLoader, loadLocaleResource } from './loader'
import { baseResources } from './resources'

function lookup(resource: Record<string, Record<string, unknown>>, namespace: string, path: string): unknown {
  return path.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], resource[namespace])
}

describe('lazy locale loader', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads the active locale with its translations merged over the base bundle', async () => {
    const german = await loadLocaleResource('de-DE')

    expect(lookup(german, 'layout', 'empty.title')).toBe('Erste Schritte')
    expect(lookup(german, 'layout', 'empty.title')).not.toBe(lookup(baseResources.en, 'layout', 'empty.title'))
    // Every namespace is present so i18next never has to guess
    expect(Object.keys(german)).toEqual(Object.keys(baseResources.en))
  })

  it('returns the English base bundle for English locales without loading any JSON', async () => {
    const loadBundle = vi.fn()
    const load = createLocaleLoader({ './locales/de-DE.json': loadBundle })

    expect(await load('en')).toBe(baseResources.en)
    expect(await load('en-GB')).toBe(baseResources['en-GB'])
    expect(loadBundle).not.toHaveBeenCalled()
  })

  it('falls back to English for an unknown locale', async () => {
    const load = createLocaleLoader({})

    expect(await load('xx-YY')).toBe(baseResources.en)
  })

  it('loads each locale once and reuses the cached result when switching back', async () => {
    const loadGerman = vi.fn(async () => ({ layout: { 'empty.title': 'Erste Schritte' } }))
    const loadFrench = vi.fn(async () => ({ layout: { 'empty.title': 'Premiers pas' } }))
    const load = createLocaleLoader({
      './locales/de-DE.json': loadGerman,
      './locales/fr-FR.json': loadFrench
    })

    const [first, second] = await Promise.all([load('de-DE'), load('de-DE')])
    expect(first).toBe(second)
    expect(lookup(await load('fr-FR'), 'layout', 'empty.title')).toBe('Premiers pas')
    expect(await load('de-DE')).toBe(first)

    expect(loadGerman).toHaveBeenCalledTimes(1)
    expect(loadFrench).toHaveBeenCalledTimes(1)
  })

  it('falls back to the inline bundle when a locale file is missing, and retries after a failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const loadBundle = vi
      .fn<() => Promise<Record<string, Record<string, string>>>>()
      .mockRejectedValueOnce(new Error('chunk missing'))
      .mockResolvedValueOnce({ layout: { 'empty.title': 'Erste Schritte' } })
    const load = createLocaleLoader({ './locales/de-DE.json': loadBundle })

    const degraded = await load('de-DE')
    expect(lookup(degraded, 'layout', 'empty.title')).toBe(
      lookup(baseResources['de-DE'], 'layout', 'empty.title')
    )

    const recovered = await load('de-DE')
    expect(lookup(recovered, 'layout', 'empty.title')).toBe('Erste Schritte')
    expect(loadBundle).toHaveBeenCalledTimes(2)
  })
})
