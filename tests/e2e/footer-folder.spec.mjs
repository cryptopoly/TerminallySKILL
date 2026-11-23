import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

test('the footer folder opens a picker that types cd, and its menu copies the path', async ({}, testInfo) => {
  test.setTimeout(60_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    const workspaceDir = testInfo.outputPath('workspace')
    const otherDir = join(workspaceDir, "it's here")
    await mkdir(otherDir, { recursive: true })
    await page.evaluate(async (cwd) => {
      await window.electronAPI.updateSettings({ terminalInputMode: 'classic' })
      await window.electronAPI.createProject('E2E Folder', cwd, '#14b8a6', undefined, 'disabled', true)
    }, workspaceDir)
    await page.reload()
    await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 })
    await page.locator('.xterm:visible').click()
    const rows = page.locator('.xterm-rows:visible')
    const folderButton = page.getByTestId('status-cwd')
    await expect(folderButton).toBeEnabled({ timeout: 15_000 })

    // Stand in for the native picker: it returns a folder with a quote in its name
    await app.evaluate(({ dialog }, dir) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] })
    }, otherDir)
    await folderButton.click()
    await expect(rows).toContainText(`cd '${workspaceDir}/it'\\''s here'`, { timeout: 10_000 })
    await page.locator('.xterm:visible').click()
    await page.keyboard.press('Enter')
    await page.keyboard.type('pwd')
    await page.keyboard.press('Enter')
    await expect(rows).toContainText(`${workspaceDir}/it's here`, { timeout: 10_000 })
    await expect(folderButton).toContainText("it's here")

    await page.getByRole('button', { name: 'Folder actions' }).click()
    const menu = page.getByTestId('folder-menu')
    await menu.getByRole('menuitem', { name: 'Copy path' }).click()
    await expect(menu).toBeHidden()
    await expect.poll(() => app.evaluate(({ clipboard }) => clipboard.readText())).toContain("it's here")
  } finally {
    await app.close()
  }
})
