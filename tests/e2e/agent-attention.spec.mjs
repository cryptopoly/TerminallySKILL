import { mkdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

const JUMP_SHORTCUT = process.platform === 'darwin' ? 'Meta+Shift+J' : 'Control+Shift+J'

async function typeInVisibleTerminal(page, text) {
  await page.locator('.xterm:visible').click()
  await page.keyboard.type(text)
  await page.keyboard.press('Enter')
}

async function openNewTab(page, expectedCount) {
  await page.locator('button.p-2:has(svg.lucide-plus)').last().click()
  await expect(page.locator('.xterm')).toHaveCount(expectedCount, { timeout: 15_000 })
  await page.waitForTimeout(1500)
}

test('the terminal answers the OSC 7501 support query through the pty', async ({}, testInfo) => {
  test.setTimeout(60_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    const workspaceDir = testInfo.outputPath('workspace')
    await mkdir(workspaceDir, { recursive: true })
    await page.evaluate(async (cwd) => {
      await window.electronAPI.updateSettings({ attentionAlerts: true })
      await window.electronAPI.createProject('E2E Agent Query', cwd, '#14b8a6', undefined, 'disabled', true)
    }, workspaceDir)
    await page.reload()
    await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 })
    await page.waitForTimeout(2000)

    // Read the 10-byte reply (ESC ] 7501 ; ? ESC \) raw from the tty and print it with ESC shown as E.
    await typeInVisibleTerminal(
      page,
      "stty -echo -icanon min 10 time 20; printf '\\033]7501;?\\007'; head -c 10 | tr '\\033' E; stty sane; echo"
    )
    await expect(page.locator('.xterm-rows:visible')).toContainText('E]7501;?E\\', { timeout: 15_000 })
  } finally {
    await app.close()
  }
})

test('agent escape sequences in background tabs raise dots, and the shortcut jumps to them oldest first', async ({}, testInfo) => {
  test.setTimeout(90_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    const workspaceDir = testInfo.outputPath('workspace')
    await mkdir(workspaceDir, { recursive: true })
    await page.evaluate(async (cwd) => {
      // A high threshold keeps the ordinary "long command finished" dot out of this test.
      await window.electronAPI.updateSettings({ attentionAlerts: true, attentionMinSeconds: 300 })
      await window.electronAPI.createProject('E2E Agents', cwd, '#14b8a6', undefined, 'disabled', true)
    }, workspaceDir)
    await page.reload()
    await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 })
    await page.waitForTimeout(2000)
    await expect(page.locator('.xterm')).toHaveCount(1)

    // Tab 1: an iTerm2-style notification (OSC 9) after 4 seconds.
    await typeInVisibleTerminal(page, "sleep 4; printf '\\033]9;Agent needs you\\007'; echo tab-one")
    // Tab 2: an OSC 7501 error report ("tests failed", base64) after 6 seconds.
    await openNewTab(page, 2)
    await typeInVisibleTerminal(page, "sleep 6; printf '\\033]7501;state=error:msg=dGVzdHMgZmFpbGVk\\033\\\\'; echo tab-two")
    // Tab 3: the one being watched.
    await openNewTab(page, 3)

    const notifyDot = page.locator('[role="status"][aria-label="Needs your attention: Agent needs you"]')
    const statusDot = page.locator('[role="status"][aria-label="Stopped with an error: tests failed"]')
    await expect(notifyDot).toHaveCount(1, { timeout: 20_000 })
    await expect(statusDot).toHaveCount(1, { timeout: 20_000 })

    // First jump: the oldest alert (tab 1), and its dot clears.
    await page.keyboard.press(JUMP_SHORTCUT)
    await expect(notifyDot).toHaveCount(0)
    await expect(page.locator('.xterm-rows:visible')).toContainText('tab-one')
    await expect(statusDot).toHaveCount(1)

    // Second jump: tab 2.
    await page.keyboard.press(JUMP_SHORTCUT)
    await expect(statusDot).toHaveCount(0)
    await expect(page.locator('.xterm-rows:visible')).toContainText('tab-two')
    await expect(page.getByRole('status')).toHaveCount(0)
  } finally {
    await app.close()
  }
})
