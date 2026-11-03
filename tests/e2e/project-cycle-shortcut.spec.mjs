import { mkdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

// Cmd+Option+Down/Up (macOS) or Ctrl+Alt+PageDown/PageUp cycles projects in the picker's order,
// even while a terminal has focus.
test('the cycle shortcut switches projects with the terminal focused', async ({}, testInfo) => {
  test.setTimeout(90_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    const dirA = testInfo.outputPath('cycle-a')
    const dirB = testInfo.outputPath('cycle-b')
    await mkdir(dirA, { recursive: true })
    await mkdir(dirB, { recursive: true })
    await page.evaluate(
      async ({ dirA, dirB }) => {
        await window.electronAPI.createProject('Cycle A', dirA, '#14b8a6', undefined, 'disabled', true)
        await window.electronAPI.createProject('Cycle B', dirB, '#f97316', undefined, 'disabled', true)
      },
      { dirA, dirB }
    )
    await page.reload()
    await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 })

    const isMac = await page.evaluate(() => navigator.platform.toLowerCase().includes('mac'))
    const next = isMac ? 'Meta+Alt+ArrowDown' : 'Control+Alt+PageDown'
    const previous = isMac ? 'Meta+Alt+ArrowUp' : 'Control+Alt+PageUp'
    const names = ['Cycle A', 'Cycle B']
    // The window title is the active project's name, sometimes followed by " — TerminallySKILL".
    const activeName = async () => (await page.title()).replace(/ — TerminallySKILL$/, '')

    await expect.poll(activeName, { timeout: 20_000 }).toMatch(/^Cycle [AB]$/)
    const start = await activeName()
    const other = names.find((n) => n !== start)

    await page.locator('.xterm-helper-textarea').first().focus()

    await page.keyboard.press(next)
    await expect.poll(activeName, { timeout: 10_000 }).toBe(other)

    await page.keyboard.press(next)
    await expect.poll(activeName, { timeout: 10_000 }).toBe(start)

    await page.keyboard.press(previous)
    await expect.poll(activeName, { timeout: 10_000 }).toBe(other)
  } finally {
    await app.close()
  }
})
