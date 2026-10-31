import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialSettings, backfillSettings } from './settings-persistence'

let rootDir = ''
let dataDir = ''

vi.mock('./user-data-path', () => ({ getDataDir: () => dataDir }))
vi.mock('./secret-manager', () => ({
  getStoredProviderApiKeys: async () => ({}),
  setStoredProviderApiKeys: async () => undefined
}))
vi.mock('./native-i18n', () => ({ translateNativeSync: (key: string) => key }))

async function loadSettingsFresh() {
  // settings-manager caches the first load, so each case needs a fresh module
  vi.resetModules()
  const manager = await import('./settings-manager')
  return manager
}

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'settings-first-run-'))
  dataDir = join(rootDir, 'data')
})

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true })
})

describe('welcome tour flag helpers', () => {
  it('treats a settings file without the flag as an upgrading user', () => {
    expect(backfillSettings({ theme: 'chalk' }).hasSeenWelcomeTour).toBe(true)
  })

  it('keeps an explicit value from the settings file', () => {
    expect(backfillSettings({ hasSeenWelcomeTour: false }).hasSeenWelcomeTour).toBe(false)
    expect(backfillSettings({ hasSeenWelcomeTour: true }).hasSeenWelcomeTour).toBe(true)
  })

  it('ignores a non-boolean value and counts it as seen', () => {
    expect(
      backfillSettings({ hasSeenWelcomeTour: 'no' as unknown as boolean }).hasSeenWelcomeTour
    ).toBe(true)
  })

  it('initial settings show the tour only when the data folder is empty', () => {
    expect(createInitialSettings(false).hasSeenWelcomeTour).toBe(false)
    expect(createInitialSettings(true).hasSeenWelcomeTour).toBe(true)
  })
})

describe('welcome tour flag on first launch', () => {
  it('is false for a brand-new data folder', async () => {
    const { getSettings } = await loadSettingsFresh()
    expect((await getSettings()).hasSeenWelcomeTour).toBe(false)
  })

  it('is false for an empty data folder', async () => {
    await mkdir(dataDir, { recursive: true })
    const { getSettings } = await loadSettingsFresh()
    expect((await getSettings()).hasSeenWelcomeTour).toBe(false)
  })

  it('is true when settings.json from 0.9.103 exists without the flag', async () => {
    await mkdir(dataDir, { recursive: true })
    await writeFile(join(dataDir, 'settings.json'), JSON.stringify({ theme: 'ember' }))
    const { getSettings } = await loadSettingsFresh()
    const settings = await getSettings()
    expect(settings.theme).toBe('ember')
    expect(settings.hasSeenWelcomeTour).toBe(true)
  })

  it('is true when there is no settings.json but other app data exists', async () => {
    await mkdir(dataDir, { recursive: true })
    await writeFile(join(dataDir, 'projects.json'), JSON.stringify({ projects: [], activeProjectId: null }))
    const { getSettings } = await loadSettingsFresh()
    expect((await getSettings()).hasSeenWelcomeTour).toBe(true)
  })

  it('is true when settings.json is corrupt (the file is kept aside, not lost)', async () => {
    await mkdir(dataDir, { recursive: true })
    await writeFile(join(dataDir, 'settings.json'), '{ not json')
    const { getSettings } = await loadSettingsFresh()
    expect((await getSettings()).hasSeenWelcomeTour).toBe(true)
  })

  it('persists the flag once the tour is closed, and stays seen on the next launch', async () => {
    const first = await loadSettingsFresh()
    expect((await first.getSettings()).hasSeenWelcomeTour).toBe(false)
    await first.updateSettings({ hasSeenWelcomeTour: true })

    const saved = JSON.parse(await readFile(join(dataDir, 'settings.json'), 'utf-8'))
    expect(saved.hasSeenWelcomeTour).toBe(true)

    const second = await loadSettingsFresh()
    expect((await second.getSettings()).hasSeenWelcomeTour).toBe(true)
  })

  it('still shows the tour on the next launch when it was never closed', async () => {
    const first = await loadSettingsFresh()
    // Another setting is saved while the tour is still due (e.g. language picked first)
    await first.updateSettings({ theme: 'chalk' })
    const second = await loadSettingsFresh()
    expect((await second.getSettings()).hasSeenWelcomeTour).toBe(false)
  })
})
