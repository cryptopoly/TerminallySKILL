import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'
import { shellCommand } from './shell-commands.mjs'

const QUAD_SHORTCUT = process.platform === 'darwin' ? 'Meta+Shift+G' : 'Control+Shift+G'
const shotPath = (testInfo, name) =>
  process.env.TERMINALLYSKILL_SCREENSHOT_DIR
    ? join(process.env.TERMINALLYSKILL_SCREENSHOT_DIR, name)
    : testInfo.outputPath(name)

/**
 * Launches at an explicit window size, so the panes' arrangement does not depend on the screen.
 * 1024x677 is what CI runners (about 1024x768 screens) end up with: docked, quad shows four side by side.
 */
async function launch(testInfo, width = 1024, height = 677) {
  const launched = await launchTerminallySkill(testInfo)
  await setWindowSize(launched.app, width, height)
  return launched
}

async function setWindowSize(app, width, height) {
  await app.evaluate(({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setSize(size.width, size.height), { width, height })
}

async function openProject(page, testInfo, name, settings = {}) {
  const workspaceDir = testInfo.outputPath('workspace')
  await mkdir(join(workspaceDir, 'deep'), { recursive: true })
  await page.evaluate(
    async ({ cwd, name, settings }) => {
      await window.electronAPI.updateSettings({ terminalInputMode: 'classic', ...settings })
      await window.electronAPI.createProject(name, cwd, '#14b8a6', undefined, 'disabled', true)
    },
    { cwd: workspaceDir, name, settings }
  )
  await page.reload()
  await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 })
}

const pane = (page, index) => page.locator(`[data-quad-pane="${index}"]`)

/** Types a command that prints Q<n> (the typed text itself never contains Q<n>). */
function printNumber(n) {
  return shellCommand(`echo Q$((${n - 1}+1))`, `echo ("Q" + (${n - 1}+1))`)
}

/** The Cmd+] / Cmd+[ handler reads metaKey or ctrlKey; send the event straight to the window. */
async function cycleFocus(page, key) {
  await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, metaKey: true, ctrlKey: true })), key)
}

const focusedPaneIndex = (page) =>
  page.locator('[data-focused-pane="true"]').getAttribute('data-quad-pane', { timeout: 5_000 })

test('quad on and off: four live terminals, each runs a command, focus moves by click and keyboard', async ({}, testInfo) => {
  test.setTimeout(90_000)
  const { app, page } = await launch(testInfo)
  try {
    await openProject(page, testInfo, 'E2E Quad')
    const quadButton = page.getByTestId('terminal-quad')
    await expect(page.locator('.xterm:visible')).toHaveCount(1)

    // On: the open tab plus three new terminals
    await quadButton.click()
    await expect(quadButton).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.xterm:visible')).toHaveCount(4, { timeout: 15_000 })
    await expect(page.locator('.xterm')).toHaveCount(4)
    for (let i = 0; i < 4; i++) await expect(pane(page, i)).toBeVisible()
    // Docked at 1024x677 there is no room for two rows: four side by side
    const top = (await pane(page, 0).boundingBox()).y
    for (let i = 1; i < 4; i++) expect(Math.abs((await pane(page, i).boundingBox()).y - top)).toBeLessThan(2)

    // Each pane runs its own command; clicking a pane focuses it
    for (let i = 0; i < 4; i++) {
      await pane(page, i).locator('.xterm').click()
      expect(await focusedPaneIndex(page)).toBe(String(i))
      await page.keyboard.type(printNumber(40 + i))
      await page.keyboard.press('Enter')
      await expect(pane(page, i).locator('.xterm-rows')).toContainText(`Q${40 + i}`, { timeout: 15_000 })
    }
    // ...and only there
    await expect(pane(page, 0).locator('.xterm-rows')).not.toContainText('Q43')

    // Cmd+] / Cmd+[ move the focus round the grid, and the keyboard goes with it
    await pane(page, 1).locator('.xterm').click()
    await cycleFocus(page, ']')
    await expect.poll(() => focusedPaneIndex(page)).toBe('2')
    await expect(pane(page, 2).locator('.xterm-helper-textarea')).toBeFocused()
    await page.keyboard.type(printNumber(52))
    await page.keyboard.press('Enter')
    await expect(pane(page, 2).locator('.xterm-rows')).toContainText('Q52', { timeout: 10_000 })
    await cycleFocus(page, ']')
    await cycleFocus(page, ']')
    await expect.poll(() => focusedPaneIndex(page)).toBe('0')
    await cycleFocus(page, '[')
    await expect.poll(() => focusedPaneIndex(page)).toBe('3')
    await page.screenshot({ path: shotPath(testInfo, 'quad-docked.png') })

    // Off with the shortcut: back to one terminal, none closed
    await page.keyboard.press(QUAD_SHORTCUT)
    await expect(quadButton).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('.xterm:visible')).toHaveCount(1)
    await expect(page.locator('.xterm')).toHaveCount(4)

    // On again from the palette: the same four terminals, no new ones
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true })))
    await page.keyboard.type('Quad split')
    await page.getByText('Quad split', { exact: true }).first().click()
    await expect(page.locator('.xterm:visible')).toHaveCount(4, { timeout: 10_000 })
    await page.waitForTimeout(1000)
    await expect(page.locator('.xterm')).toHaveCount(4)
    for (let i = 0; i < 4; i++) {
      await expect(page.locator('[data-quad-pane] .xterm-rows').filter({ hasText: `Q${40 + i}` })).toHaveCount(1)
    }

    // A closed pane stays empty with a New terminal button, which fills that pane.
    const lastPaneSession = await pane(page, 3).getAttribute('data-session-id')
    await page.locator(`[data-session-tab="${lastPaneSession}"] svg.lucide-x`).click()
    await expect(page.locator('[data-quad-empty="3"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.xterm')).toHaveCount(3)
    await page.locator('[data-quad-empty="3"] button').click()
    await expect(pane(page, 3)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.xterm:visible')).toHaveCount(4)
  } finally {
    await app.close()
  }
})

test('quad in the maximised terminal: a 2x2 grid with resizable dividers, and a small window falls back', async ({}, testInfo) => {
  test.setTimeout(90_000)
  const { app, page } = await launch(testInfo, 1400, 900)
  try {
    await openProject(page, testInfo, 'E2E Quad Max')
    const workspace = page.getByTestId('workspace-panel')
    await page.getByTestId('terminal-maximise').click()
    await expect.poll(async () => (await workspace.boundingBox())?.height ?? 0).toBeLessThan(2)

    await page.locator('.xterm:visible').click()
    await page.keyboard.press(QUAD_SHORTCUT)
    await expect(page.locator('.xterm:visible')).toHaveCount(4, { timeout: 15_000 })
    await expect(page.getByTestId('terminal-maximise')).toHaveAttribute('aria-pressed', 'true')

    // 2x2: two columns and two rows, each pane a usable size
    const boxes = []
    for (let i = 0; i < 4; i++) boxes.push(await pane(page, i).boundingBox())
    expect(boxes[0].x).toBeLessThan(boxes[1].x)
    expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(2)
    expect(boxes[0].y).toBeLessThan(boxes[2].y)
    expect(Math.abs(boxes[0].x - boxes[2].x)).toBeLessThan(2)
    for (const box of boxes) {
      expect(box.width).toBeGreaterThan(240)
      expect(box.height).toBeGreaterThan(150)
    }
    // Every pane has its own footer folder
    await expect(page.locator('[data-quad-pane] [data-testid="status-cwd"]')).toHaveCount(4)

    for (let i = 0; i < 4; i++) {
      await pane(page, i).locator('.xterm').click()
      await page.keyboard.type(printNumber(60 + i))
      await page.keyboard.press('Enter')
      await expect(pane(page, i).locator('.xterm-rows')).toContainText(`Q${60 + i}`, { timeout: 15_000 })
    }
    await pane(page, 1).locator('.xterm').click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: shotPath(testInfo, 'quad-maximised.png') })
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'chalk'))
    await page.waitForTimeout(300)
    await page.screenshot({ path: shotPath(testInfo, 'quad-maximised-chalk.png') })
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'void'))

    // Drag the vertical divider left: the left panes shrink, never below their minimum
    const divider = await page.getByTestId('quad-divider-column').boundingBox()
    await page.mouse.move(divider.x + 2, divider.y + 40)
    await page.mouse.down()
    await page.mouse.move(divider.x - 200, divider.y + 40, { steps: 5 })
    await page.mouse.up()
    const narrower = await pane(page, 0).boundingBox()
    expect(narrower.width).toBeLessThan(boxes[0].width - 150)
    await page.mouse.move(divider.x - 200, divider.y + 40)
    await page.mouse.down()
    await page.mouse.move(5, divider.y + 40, { steps: 5 })
    await page.mouse.up()
    expect((await pane(page, 0).boundingBox()).width).toBeGreaterThanOrEqual(238)
    expect((await pane(page, 2).boundingBox()).width).toBeCloseTo((await pane(page, 0).boundingBox()).width, 0)

    // Restore (un-maximise) keeps quad in the docked terminal
    await page.getByTestId('terminal-maximise').click()
    await expect(page.getByTestId('terminal-quad')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.xterm:visible')).toHaveCount(4)

    // A window too small for four panes shows only the focused one, and quad comes back when it grows
    await setWindowSize(app, 800, 600)
    await expect(page.getByTestId('quad-too-small')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.xterm:visible')).toHaveCount(1)
    await page.screenshot({ path: shotPath(testInfo, 'quad-small-window.png') })
    await setWindowSize(app, 1400, 900)
    await page.getByTestId('terminal-maximise').click()
    await expect(page.getByTestId('quad-too-small')).toHaveCount(0, { timeout: 10_000 })
    await expect(page.locator('.xterm:visible')).toHaveCount(4)

    // At 1024x677 (CI runners, small laptops) the maximised terminal is still a 2x2 grid
    await setWindowSize(app, 1024, 677)
    await expect
      .poll(async () => (await pane(page, 2).boundingBox()).y - (await pane(page, 0).boundingBox()).y)
      .toBeGreaterThan(150)
    expect(Math.abs((await pane(page, 0).boundingBox()).y - (await pane(page, 1).boundingBox()).y)).toBeLessThan(2)
    await expect(page.getByTestId('quad-too-small')).toHaveCount(0)
    await page.waitForTimeout(300)
    await page.screenshot({ path: shotPath(testInfo, 'quad-1024-maximised.png') })
  } finally {
    await app.close()
  }
})

test('with restore on, quad comes back after a restart with its four tabs and their folders', async ({}, testInfo) => {
  test.setTimeout(120_000)
  const first = await launch(testInfo)
  try {
    const { page } = first
    await openProject(page, testInfo, 'E2E Quad Restore', { restoreTerminalTabs: true })
    await page.getByTestId('terminal-quad').click()
    await expect(page.locator('.xterm:visible')).toHaveCount(4, { timeout: 15_000 })
    await pane(page, 1).locator('.xterm').click()
    await page.keyboard.type('cd deep')
    await page.keyboard.press('Enter')
    await expect(pane(page, 1).getByTestId('status-cwd')).toContainText('deep', { timeout: 10_000 })
    // Let the layout save land
    await page.waitForTimeout(1500)
    const saved = await page.evaluate(async () => {
      const data = await window.electronAPI.getAllProjects()
      return data.projects.find((project) => project.name === 'E2E Quad Restore')?.workspaceLayout.quadLayout
    })
    expect(saved).toBe(true)
  } finally {
    await first.app.close()
  }

  const second = await launch(testInfo)
  try {
    const { page } = second
    await expect(page.locator('.xterm:visible')).toHaveCount(4, { timeout: 20_000 })
    await expect(page.getByTestId('terminal-quad')).toHaveAttribute('aria-pressed', 'true')
    // Four tabs, no extra terminal opened for the panes
    await page.waitForTimeout(2000)
    await expect(page.locator('.xterm')).toHaveCount(4)
    await expect(pane(page, 1).getByTestId('status-cwd')).toContainText('deep', { timeout: 15_000 })
    await expect(pane(page, 0).getByTestId('status-cwd')).not.toContainText('deep')
    // The reopened panes are live
    await pane(page, 3).locator('.xterm').click()
    await page.keyboard.type(printNumber(77))
    await page.keyboard.press('Enter')
    await expect(pane(page, 3).locator('.xterm-rows')).toContainText('Q77', { timeout: 15_000 })
  } finally {
    await second.app.close()
  }
})

test('with restore off, a project left in quad opens in quad again with fresh terminals', async ({}, testInfo) => {
  test.setTimeout(90_000)
  const first = await launch(testInfo)
  try {
    const { page } = first
    await openProject(page, testInfo, 'E2E Quad Fresh')
    await page.getByTestId('terminal-quad').click()
    await expect(page.locator('.xterm:visible')).toHaveCount(4, { timeout: 15_000 })
    await page.waitForTimeout(1500)
  } finally {
    await first.app.close()
  }

  const second = await launch(testInfo)
  try {
    const { page } = second
    await page.getByText('E2E Quad Fresh').first().waitFor({ timeout: 20_000 })
    await expect(page.locator('.xterm:visible')).toHaveCount(4, { timeout: 20_000 })
    await page.waitForTimeout(1500)
    await expect(page.locator('.xterm')).toHaveCount(4)
  } finally {
    await second.app.close()
  }
})
