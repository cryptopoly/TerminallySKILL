import { mkdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

// CI runners have about 1024x768 screens, so the window ends up near 1024x677. With the editor prompt on,
// the terminal panel's own chrome once left the xterm a single row there.
for (const [width, height] of [
  [1024, 677],
  [800, 600]
]) {
  test(`the terminal keeps at least 8 rows at ${width}x${height} with the editor prompt on`, async ({}, testInfo) => {
    test.setTimeout(60_000)
    const { app, page } = await launchTerminallySkill(testInfo)
    try {
      const workspaceDir = testInfo.outputPath('workspace')
      await mkdir(workspaceDir, { recursive: true })
      await app.evaluate(
        ({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setSize(size.width, size.height),
        { width, height }
      )
      await page.evaluate(async (cwd) => {
        await window.electronAPI.updateSettings({ terminalInputMode: 'editor' })
        await window.electronAPI.createProject('E2E Rows', cwd, '#14b8a6', undefined, 'disabled', true)
      }, workspaceDir)
      await page.reload()
      await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 })
      await expect(page.locator('input[spellcheck="false"]:visible').last()).toBeVisible({ timeout: 20_000 })

      const rows = page.locator('.xterm-rows:visible').first()
      await expect
        .poll(async () => rows.evaluate((element) => element.children.length), { timeout: 10_000 })
        .toBeGreaterThanOrEqual(8)
      await page.screenshot({ path: testInfo.outputPath(`terminal-${width}x${height}.png`) })
    } finally {
      await app.close()
    }
  })
}
