import { mkdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

test('a password prompt shows a small status chip that clears after Enter', async ({}, testInfo) => {
  test.setTimeout(60_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    const workspaceDir = testInfo.outputPath('workspace')
    await mkdir(workspaceDir, { recursive: true })
    await page.evaluate(async (cwd) => {
      await window.electronAPI.updateSettings({ terminalInputMode: 'classic' })
      await window.electronAPI.createProject('E2E Secure', cwd, '#14b8a6', undefined, 'disabled', true)
    }, workspaceDir)
    await page.reload()
    await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 })
    await page.locator('.xterm:visible').click()
    const rows = page.locator('.xterm-rows:visible')
    const chip = page.getByTestId('secure-input-chip')

    // The shell keeps running after each answer, like an SSH session, so only Enter can clear the chip.
    await page.keyboard.type('printf "Password: "; read -s a; echo; echo got-$a; printf "Password: "; read -s b; echo; echo got-$b; sleep 8')
    await page.keyboard.press('Enter')
    await expect(chip).toBeVisible({ timeout: 10_000 })

    await page.keyboard.type('abc')
    await page.keyboard.press('Enter')
    await expect(rows).toContainText('got-abc', { timeout: 10_000 })
    // A second prompt (like "Sorry, try again") turns it back on
    await expect(chip).toBeVisible({ timeout: 5_000 })

    await page.keyboard.type('def')
    await page.keyboard.press('Enter')
    await expect(rows).toContainText('got-def', { timeout: 10_000 })
    await expect(chip).toBeHidden({ timeout: 3_000 })
  } finally {
    await app.close()
  }
})
