import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

// Each launch inside one test shares testInfo.outputPath('user-data'), a fresh temp dir per test

test('renders the saved non-English language on first paint after a relaunch', async ({}, testInfo) => {
  const first = await launchTerminallySkill(testInfo)
  try {
    await first.page.evaluate(() => window.electronAPI.updateSettings({ uiLocale: 'de-DE' }))
  } finally {
    await first.app.close()
  }

  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    // The render gate waits for the active locale, so the first shell paint is already German
    await expect(page.getByRole('button', { name: 'Befehle', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Commands', exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('de-DE')
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('ltr')

    // The main process lazy-loads the same locale for native menus
    await expect
      .poll(() => app.evaluate(({ Menu }) => Menu.getApplicationMenu()?.items.map((item) => item.label) ?? []))
      .toContain('Datei')
  } finally {
    await app.close()
  }
})

test('switches language at runtime, loading it on demand and flipping to rtl for Arabic', async ({}, testInfo) => {
  const { app, page } = await launchTerminallySkill(testInfo)

  try {
    await page.evaluate(() => window.electronAPI.updateSettings({ uiLocale: 'en' }))
    await page.reload()
    await expect(page.getByRole('button', { name: 'Commands', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('ltr')

    await page.keyboard.press('ControlOrMeta+s')
    // First select in Settings is the UI language picker (the format picker comes after it)
    const uiLanguage = page.locator('select:has(option[value="ar"])').first()
    await uiLanguage.selectOption('ar')

    await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('rtl')
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('ar')
    await expect(page.getByRole('button', { name: 'Commands', exact: true })).toHaveCount(0)

    await uiLanguage.selectOption('de-DE')
    await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('ltr')
    await expect(page.getByRole('button', { name: 'Befehle', exact: true })).toBeVisible()
  } finally {
    await app.close()
  }
})
