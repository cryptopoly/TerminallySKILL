import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

const MAXIMISE_SHORTCUT = process.platform === 'darwin' ? 'Meta+Shift+M' : 'Control+Shift+M'
const THEMES = ['void', 'ember', 'dusk', 'forest', 'slate', 'plum', 'chalk', 'sand', 'stone', 'mist', 'dove', 'clay']
// Set TERMINALLYSKILL_SCREENSHOT_DIR to keep the screenshots somewhere other than test-results.
const shotPath = (testInfo, name) =>
  process.env.TERMINALLYSKILL_SCREENSHOT_DIR
    ? join(process.env.TERMINALLYSKILL_SCREENSHOT_DIR, name)
    : testInfo.outputPath(name)

async function openProject(page, testInfo, name, settings = {}) {
  const workspaceDir = testInfo.outputPath('workspace')
  await mkdir(workspaceDir, { recursive: true })
  await page.evaluate(
    async ({ cwd, name, settings }) => {
      await window.electronAPI.updateSettings({ attentionAlerts: true, terminalInputMode: 'classic', ...settings })
      await window.electronAPI.createProject(name, cwd, '#14b8a6', undefined, 'disabled', true)
    },
    { cwd: workspaceDir, name, settings }
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

test('a running command shows the running dot at once, and an agent reporting idle hides it', async ({}, testInfo) => {
  test.setTimeout(60_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    await openProject(page, testInfo, 'E2E Running', { attentionMinSeconds: 300 })
    const running = page.locator('[data-dot-state="running"]')
    await expect(running).toHaveCount(0)

    await typeInVisibleTerminal(page, 'sleep 3')
    // Well inside the first second or two, long before any attention threshold.
    await expect(running).toHaveCount(1, { timeout: 2_000 })
    await expect(running).toHaveAttribute('title', 'Running')
    await expect(running).toHaveCount(0, { timeout: 10_000 })
    // The running dot never counts as attention
    await expect(page.getByRole('status')).toHaveCount(0)

    // An agent says it is working, then idle while its command keeps going: the dot follows the agent.
    await typeInVisibleTerminal(
      page,
      "printf '\\033]7501;state=working\\033\\\\'; sleep 3; printf '\\033]7501;state=idle\\033\\\\'; sleep 4"
    )
    await expect(running).toHaveCount(1, { timeout: 2_000 })
    await expect(running).toHaveCount(0, { timeout: 6_000 })
    // Command still running, but the agent said idle, so no dot; and none after the command ends.
    await page.waitForTimeout(5_000)
    await expect(running).toHaveCount(0)
  } finally {
    await app.close()
  }
})

test('the terminal maximises and restores from the button, the shortcut and the palette', async ({}, testInfo) => {
  test.setTimeout(60_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    await openProject(page, testInfo, 'E2E Maximise')
    const workspace = page.getByTestId('workspace-panel')
    const button = page.getByTestId('terminal-maximise')
    const heightOf = async () => (await workspace.boundingBox())?.height ?? 0

    const before = await heightOf()
    expect(before).toBeGreaterThan(100)

    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(heightOf).toBeLessThan(2)
    await page.screenshot({ path: shotPath(testInfo, 'maximised-void.png') })
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'chalk'))
    await page.screenshot({ path: shotPath(testInfo, 'maximised-chalk.png') })
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'void'))

    // Same shortcut restores the previous split, even with the terminal focused.
    await page.locator('.xterm:visible').click()
    await page.keyboard.press(MAXIMISE_SHORTCUT)
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(heightOf).toBeGreaterThan(before - 3)
    expect(await heightOf()).toBeLessThan(before + 3)

    await page.keyboard.press(MAXIMISE_SHORTCUT)
    await expect.poll(heightOf).toBeLessThan(2)

    // Palette offers "Restore terminal size" while maximised (focus out of the terminal first)
    // (Playwright's Meta+K does not reach the page in Electron on macOS, so send the event directly.)
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true })))
    await page.keyboard.type('Restore terminal')
    await page.getByText('Restore terminal size', { exact: true }).click()
    await expect.poll(heightOf).toBeGreaterThan(before - 3)

    // Minimise (hide) ends maximise; showing again brings back the old split, not a maximised one.
    await button.click()
    await expect.poll(heightOf).toBeLessThan(2)
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+/' : 'Control+/')
    await expect.poll(heightOf).toBeGreaterThan(before)
    await page.locator('button:has(svg.lucide-chevron-up)').click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(heightOf).toBeGreaterThan(before - 3)
    expect(await heightOf()).toBeLessThan(before + 3)

    // Maximise is never saved: the stored split is the one from before.
    await page.waitForTimeout(1500)
    const saved = await page.evaluate(async () => {
      const data = await window.electronAPI.getAllProjects()
      return data.projects.find((project) => project.name === 'E2E Maximise')?.workspaceLayout.terminalSize
    })
    expect(saved).toBeLessThan(80)
  } finally {
    await app.close()
  }
})

test('screenshots: the four live dot states on real tabs, the legend, and all five styles on every theme', async ({}, testInfo) => {
  test.setTimeout(120_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    await openProject(page, testInfo, 'E2E Dots', { attentionMinSeconds: 5 })
    // Tab 1 finishes, tab 2 fails, tab 3 asks for you, tab 4 keeps running, tab 5 is watched.
    await typeInVisibleTerminal(page, 'sleep 6')
    await openNewTab(page, 2)
    await typeInVisibleTerminal(page, 'sleep 6; false')
    await openNewTab(page, 3)
    // Delayed until this tab is in the background: alerts are not raised for the watched tab.
    await typeInVisibleTerminal(page, "sleep 5; printf '\\033]9;Agent needs you\\007'; sleep 60")
    await openNewTab(page, 4)
    await typeInVisibleTerminal(page, 'sleep 120')
    await openNewTab(page, 5)

    await expect(page.locator('[data-dot-state="finished"]')).toHaveCount(1, { timeout: 20_000 })
    await expect(page.locator('[data-dot-state="failed"]')).toHaveCount(1, { timeout: 20_000 })
    await expect(page.locator('[data-dot-state="approval"]')).toHaveCount(1)
    await expect(page.locator('[data-dot-state="running"]')).toHaveCount(1)
    await expect(page.locator('[data-dot-state="approval"]')).toHaveAttribute(
      'title',
      'Needs you · Needs your attention: Agent needs you'
    )

    const tabBar = page
      .locator('[data-dot-state="running"]')
      .locator('xpath=ancestor::div[contains(@class,"overflow-x-auto")][1]/..')
    for (const theme of ['void', 'chalk', 'plum', 'dove']) {
      await page.evaluate((name) => document.documentElement.setAttribute('data-theme', name), theme)
      await page.waitForTimeout(200)
      await tabBar.screenshot({ path: shotPath(testInfo, `tabs-${theme}.png`) })
    }

    // Legend in the help guide
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'void'))
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', metaKey: true, ctrlKey: true })))
    await page.getByPlaceholder(/search/i).first().fill('dot')
    for (const state of ['running', 'approval', 'finished', 'failed', 'idle']) {
      await expect(page.getByTestId(`legend-dot-${state}`)).toHaveCount(1)
    }
    await page.screenshot({ path: shotPath(testInfo, 'legend-void.png') })
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'chalk'))
    await page.screenshot({ path: shotPath(testInfo, 'legend-chalk.png') })
    await page.keyboard.press('Escape')

    // Grid: every dot style on each theme's tab bar (surface) and active tab (surface-light), 3x.
    await page.evaluate((themes) => {
      const dot = (state) =>
        state === 'failed'
          ? '<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="var(--dot-failed)"/><path d="M3.2 3.2 6.8 6.8M6.8 3.2 3.2 6.8" stroke="var(--surface)" stroke-width="1.5" stroke-linecap="round"/></svg>'
          : `<span class="inline-block h-2 w-2 shrink-0 rounded-full ${{ running: 'tv-dot-running', approval: 'tv-dot-needs-you', finished: 'tv-dot-finished', idle: 'tv-dot-idle' }[state]}"></span>`
      const states = ['running', 'approval', 'finished', 'failed', 'idle']
      const grid = document.createElement('div')
      grid.id = 'dot-grid'
      grid.style.cssText = 'position:fixed;top:0;left:0;z-index:9999;background:#000;zoom:3;font:10px sans-serif'
      grid.innerHTML = themes
        .map(
          (theme) => `<div data-theme="${theme}" style="display:flex">
            <div style="width:44px;padding:4px;background:var(--surface);color:var(--gray-300)">${theme}</div>
            ${['var(--surface)', 'var(--surface-light)']
              .map(
                (bg) => `<div style="display:flex;gap:10px;align-items:center;padding:4px 8px;background:${bg}">
                  ${states.map(dot).join('')}
                  <span style="color:var(--accent)">accent</span></div>`
              )
              .join('')}
          </div>`
        )
        .join('')
      document.body.appendChild(grid)
    }, THEMES)
    await page.waitForTimeout(300)
    await page.screenshot({ path: shotPath(testInfo, 'dot-grid-all-themes.png'), animations: 'disabled' })
  } finally {
    await app.close()
  }
})
