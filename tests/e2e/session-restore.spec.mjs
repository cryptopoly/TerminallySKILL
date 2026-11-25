import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

test('with restore on, terminal tabs, the split and their folders come back after a restart', async ({}, testInfo) => {
  test.setTimeout(90_000)
  const workspaceDir = testInfo.outputPath('workspace')
  await mkdir(join(workspaceDir, 'deep'), { recursive: true })

  const first = await launchTerminallySkill(testInfo)
  try {
    const { page } = first
    await page.evaluate(async (cwd) => {
      await window.electronAPI.updateSettings({ terminalInputMode: 'classic', restoreTerminalTabs: true })
      await window.electronAPI.createProject('E2E Restore', cwd, '#14b8a6', undefined, 'disabled', true)
    }, workspaceDir)
    await page.reload()
    await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 })
    await page.locator('.xterm:visible').first().click()
    await page.keyboard.type('cd deep')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('status-cwd').first()).toContainText('deep', { timeout: 10_000 })

    // Split side by side (the vertical split button)
    await page.locator('svg.lucide-columns-2, svg.lucide-columns2').first().locator('xpath=..').click()
    await expect(page.locator('.xterm:visible')).toHaveCount(2, { timeout: 10_000 })
  } finally {
    await first.app.close()
  }

  const second = await launchTerminallySkill(testInfo)
  try {
    const { page } = second
    await expect(page.locator('.xterm:visible')).toHaveCount(2, { timeout: 20_000 })
    const folders = page.getByTestId('status-cwd')
    await expect(folders.first()).toContainText('deep', { timeout: 15_000 })
    await expect(folders.nth(1)).not.toContainText('deep')
  } finally {
    await second.app.close()
  }
})

test('with restore off (the default), only the usual single tab opens after a restart', async ({}, testInfo) => {
  test.setTimeout(60_000)
  const workspaceDir = testInfo.outputPath('workspace')
  await mkdir(workspaceDir, { recursive: true })

  const first = await launchTerminallySkill(testInfo)
  try {
    const { page } = first
    await page.evaluate(async (cwd) => {
      await window.electronAPI.updateSettings({ terminalInputMode: 'classic' })
      await window.electronAPI.createProject('E2E No Restore', cwd, '#14b8a6', undefined, 'disabled', true)
    }, workspaceDir)
    await page.reload()
    await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 })
    await page.locator('svg.lucide-columns-2, svg.lucide-columns2').first().locator('xpath=..').click()
    await expect(page.locator('.xterm:visible')).toHaveCount(2, { timeout: 10_000 })
  } finally {
    await first.app.close()
  }

  const second = await launchTerminallySkill(testInfo)
  try {
    const { page } = second
    await page.getByText('E2E No Restore').first().waitFor({ timeout: 20_000 })
    await expect(page.locator('.xterm:visible')).toHaveCount(1, { timeout: 20_000 })
    await page.waitForTimeout(1500)
    await expect(page.locator('.xterm:visible')).toHaveCount(1)
  } finally {
    await second.app.close()
  }
})
