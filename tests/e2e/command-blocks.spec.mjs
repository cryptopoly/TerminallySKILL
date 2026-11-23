import { mkdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

test('finished commands get a mark with copy, run again and explain actions', async ({}, testInfo) => {
  test.setTimeout(60_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1024, 677))
    const workspaceDir = testInfo.outputPath('workspace')
    await mkdir(workspaceDir, { recursive: true })
    await page.evaluate(async (cwd) => {
      await window.electronAPI.updateSettings({ terminalInputMode: 'classic' })
      await window.electronAPI.createProject('E2E Blocks', cwd, '#14b8a6', undefined, 'disabled', true)
    }, workspaceDir)
    await page.reload()
    const input = page.locator('.xterm-helper-textarea').first()
    await input.waitFor({ state: 'attached', timeout: 20_000 })
    const rows = page.locator('.xterm-rows:visible')
    const marks = page.locator('.command-block-mark')

    await page.locator('.xterm:visible').click()
    await page.keyboard.type('echo block-$((40+2))')
    await page.keyboard.press('Enter')
    await expect(rows).toContainText('block-42', { timeout: 15_000 })
    await expect(marks).toHaveCount(1, { timeout: 10_000 })
    await expect(marks.first()).toHaveAttribute('data-exit-code', '0')

    await page.keyboard.type('false')
    await page.keyboard.press('Enter')
    await expect(marks).toHaveCount(2, { timeout: 10_000 })
    await expect(marks.nth(1)).toHaveAttribute('data-exit-code', '1')

    // Copy output gives the command's output without the prompt or the command line
    // The mark sits at the right edge, clear of the prompt text
    const markBox = await marks.first().boundingBox()
    const rowsBox = await rows.boundingBox()
    expect(markBox.x).toBeGreaterThan(rowsBox.x + rowsBox.width * 0.9)

    await marks.first().dispatchEvent('mousedown')
    const menu = page.getByTestId('command-block-menu')
    await expect(menu).toBeVisible()
    await menu.getByRole('menuitem', { name: 'Copy output' }).click()
    await expect(menu).toBeHidden()
    await expect.poll(() => app.evaluate(({ clipboard }) => clipboard.readText())).toBe('block-42')

    await marks.first().dispatchEvent('mousedown')
    await menu.getByRole('menuitem', { name: 'Copy command' }).click()
    await expect.poll(() => app.evaluate(({ clipboard }) => clipboard.readText())).toBe('echo block-$((40+2))')

    // Run again types the command at the prompt and leaves Enter to the user
    await marks.first().dispatchEvent('mousedown')
    await menu.getByRole('menuitem', { name: 'Run again' }).click()
    await page.keyboard.press('Enter')
    await expect(marks).toHaveCount(3, { timeout: 10_000 })

    // Escape closes the menu
    await marks.nth(1).dispatchEvent('mousedown')
    await expect(menu).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()

    // Commands that start or finish on the alternate screen (full-screen apps) get no mark
    await page.keyboard.type('printf "\\033[?1049h"')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await page.keyboard.type('printf "\\033[?1049l"')
    await page.keyboard.press('Enter')
    await page.keyboard.type('echo back-$((1+1))')
    await page.keyboard.press('Enter')
    await expect(rows).toContainText('back-2', { timeout: 15_000 })
    await expect(marks).toHaveCount(4, { timeout: 10_000 })
  } finally {
    await app.close()
  }
})
