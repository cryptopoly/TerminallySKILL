import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

// zsh says "bck-i-search", bash says "reverse-i-search".
const SEARCH_PROMPT = /bck-i-search|reverse-i-search/

test('Ctrl+R in the editor prompt opens the shell history search', async ({}, testInfo) => {
  test.setTimeout(60_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    const workspaceDir = testInfo.outputPath('workspace')
    await mkdir(workspaceDir, { recursive: true })
    await page.evaluate(async (cwd) => {
      await window.electronAPI.updateSettings({ terminalInputMode: 'editor' })
      await window.electronAPI.createProject('E2E Search', cwd, '#14b8a6', undefined, 'disabled', true)
    }, workspaceDir)
    await page.reload()
    await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 })

    const editor = page.locator('input[spellcheck="false"]:visible').last()
    const rows = page.locator('.xterm-rows:visible')
    await expect(editor).toBeFocused({ timeout: 20_000 })

    // The file counts the runs, and the count on screen shows the terminal followed the output.
    await page.keyboard.type('echo needle >> ran.txt; echo ran-$(wc -l < ran.txt | tr -d " ")')
    await page.keyboard.press('Enter')
    await expect(rows).toContainText('ran-1', { timeout: 15_000 })
    await expect(editor).toBeFocused({ timeout: 15_000 })

    // Find the old command, run it, and get the editor prompt back.
    await page.keyboard.press('Control+r')
    await expect(rows).toContainText(SEARCH_PROMPT, { timeout: 10_000 })
    await expect(editor).toBeHidden()
    await page.keyboard.type('needle')
    await expect(rows).toContainText(/search.*needle/)
    await page.keyboard.press('Enter')
    await expect(rows).toContainText('ran-2', { timeout: 15_000 })
    expect((await readFile(join(workspaceDir, 'ran.txt'), 'utf8')).trim().split('\n')).toHaveLength(2)
    await expect(editor).toBeFocused({ timeout: 15_000 })

    // Ctrl+C leaves the search, and the next prompt gives the editor prompt back. zsh stays on the same
    // line after the first Ctrl+C, so it takes a second one to reach a new prompt.
    await page.keyboard.press('Control+r')
    await expect(rows).toContainText(SEARCH_PROMPT, { timeout: 10_000 })
    await page.keyboard.press('Control+c')
    await expect(rows).not.toContainText(SEARCH_PROMPT, { timeout: 10_000 })
    await page.keyboard.press('Control+c')
    await expect(editor).toBeFocused({ timeout: 15_000 })
  } finally {
    await app.close()
  }
})
