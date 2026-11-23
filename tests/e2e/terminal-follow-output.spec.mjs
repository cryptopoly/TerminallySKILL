import { mkdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

test('a scrolled-up view stays put, and scrolling back down follows fast output again', async ({}, testInfo) => {
  test.setTimeout(90_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    const workspaceDir = testInfo.outputPath('workspace')
    await mkdir(workspaceDir, { recursive: true })
    await page.evaluate(async (cwd) => {
      await window.electronAPI.updateSettings({ terminalInputMode: 'classic' })
      await window.electronAPI.createProject('E2E Follow', cwd, '#14b8a6', undefined, 'disabled', true)
    }, workspaceDir)
    await page.reload()
    await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 })
    const terminal = page.locator('.xterm:visible')
    await terminal.click()
    const rows = page.locator('.xterm-rows:visible')
    const firstRow = rows.locator('> div').first()

    // Slow output, then a burst far larger than the 10,000-line scrollback
    await page.keyboard.type(
      'seq -f start-%g 1 300; for i in $(seq 1 60); do echo slow-$i; sleep 0.1; done; seq -f burst-%g 1 300000; echo stream-finished'
    )
    await page.keyboard.press('Enter')
    await expect(rows).toContainText(/slow-\d/, { timeout: 15_000 })

    const box = await terminal.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    for (let i = 0; i < 5; i += 1) await page.mouse.wheel(0, -400)
    await expect(page.getByText('Latest output')).toBeVisible()

    // While slow output arrives, the scrolled-up view does not move
    const shown = await firstRow.innerText()
    await page.waitForTimeout(1000)
    expect(await firstRow.innerText()).toBe(shown)

    // During the burst, scroll back to the bottom: the view follows to the end without "Latest output"
    await expect.poll(() => page.evaluate(() => document.body.innerText.includes('burst-')), { timeout: 15_000 }).toBe(true)
    for (let i = 0; i < 60; i += 1) await page.mouse.wheel(0, 2000)
    await expect(rows).toContainText('stream-finished', { timeout: 30_000 })
  } finally {
    await app.close()
  }
})
