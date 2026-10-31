import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

// Test-only: 1.5 s of silence instead of 20 s before a busy, unwatched terminal counts as quiet.
const QUIET_ENV = { TSK_E2E_ATTENTION_QUIET_MS: '1500' }
const shotPath = (testInfo, name) =>
  process.env.TERMINALLYSKILL_SCREENSHOT_DIR
    ? join(process.env.TERMINALLYSKILL_SCREENSHOT_DIR, name)
    : testInfo.outputPath(name)

async function openProject(page, testInfo, name) {
  const workspaceDir = testInfo.outputPath('workspace')
  await mkdir(workspaceDir, { recursive: true })
  await page.evaluate(
    async ({ cwd, name }) => {
      // A high threshold keeps the ordinary "long command finished" dot out of these tests.
      await window.electronAPI.updateSettings({ attentionAlerts: true, attentionMinSeconds: 300, terminalInputMode: 'classic' })
      await window.electronAPI.createProject(name, cwd, '#14b8a6', undefined, 'disabled', true)
    },
    { cwd: workspaceDir, name }
  )
  await page.reload()
  await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 })
  await page.waitForTimeout(2000)
}

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

test('a quiet prompt, a bell and a silent command in background tabs: needs-you, needs-you and idle', async ({}, testInfo) => {
  test.setTimeout(90_000)
  const { app, page } = await launchTerminallySkill(testInfo, QUIET_ENV)
  try {
    await openProject(page, testInfo, 'E2E Waiting')

    // Tab 1: a script asks for a yes, then waits silently (the way an agent sits at its prompt).
    await typeInVisibleTerminal(page, "echo 'Do you want to proceed? (y/n)'; sleep 60")
    // Tab 2: a busy program rings the bell once it is in the background.
    await openNewTab(page, 2)
    await typeInVisibleTerminal(page, "sleep 3; printf '\\007'; sleep 60")
    // Tab 3: a command that prints nothing.
    await openNewTab(page, 3)
    await typeInVisibleTerminal(page, 'sleep 60')
    // Tab 4: the one being watched.
    await openNewTab(page, 4)

    const approval = page.locator('[data-dot-state="approval"][title="Needs you · Waiting for your yes: Do you want to proceed? (y/n)"]')
    const bell = page.locator('[data-dot-state="approval"][title="Needs you · Needs your attention: Rang the terminal bell"]')
    const idle = page.locator('[data-dot-state="idle"]')
    await expect(approval).toHaveCount(1, { timeout: 20_000 })
    await expect(bell).toHaveCount(1, { timeout: 20_000 })
    await expect(idle).toHaveCount(1, { timeout: 20_000 })
    await expect(idle).toHaveAttribute('title', 'Idle')
    // Idle is not an attention entry: two live "needs you" regions, the idle dot is not one.
    await expect(page.getByRole('status')).toHaveCount(2)

    const tabBar = idle.locator('xpath=ancestor::div[contains(@class,"overflow-x-auto")][1]/..')
    for (const theme of ['void', 'chalk']) {
      await page.evaluate((name) => document.documentElement.setAttribute('data-theme', name), theme)
      await page.waitForTimeout(200)
      await tabBar.screenshot({ path: shotPath(testInfo, `waiting-tabs-${theme}.png`) })
    }
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'void'))

    // Looking at the needs-you tab answers it; the idle dot is information, not an alert.
    await approval.click()
    await expect(approval).toHaveCount(0, { timeout: 5_000 })
    await expect(bell).toHaveCount(1)
    // The answered tab is still quiet (its prompt is still there), so it now shows idle too.
    await expect(idle).toHaveCount(2)
  } finally {
    await app.close()
  }
})

test('a quiet command in the watched tab raises nothing', async ({}, testInfo) => {
  test.setTimeout(60_000)
  const { app, page } = await launchTerminallySkill(testInfo, QUIET_ENV)
  try {
    await openProject(page, testInfo, 'E2E Not Waiting')
    // Watched tab, silent command: no idle dot and no alert, however long it is quiet.
    await typeInVisibleTerminal(page, 'sleep 8')
    await page.waitForTimeout(4_000)
    await expect(page.locator('[data-dot-state="idle"]')).toHaveCount(0)
    await expect(page.getByRole('status')).toHaveCount(0)
  } finally {
    await app.close()
  }
})

test('the Notifications card points to the agent notification setting', async ({}, testInfo) => {
  test.setTimeout(60_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    await openProject(page, testInfo, 'E2E Hint')
    await page.locator('button:has(svg.lucide-settings)').first().click()
    const hint = page.getByTestId('attention-agent-hint')
    await expect(hint).toContainText("see your agent's notification setting")
    await hint.scrollIntoViewIfNeeded()
    await hint.locator('xpath=..').screenshot({ path: shotPath(testInfo, 'settings-agent-hint.png') })
  } finally {
    await app.close()
  }
})
