import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

// Layout preferences (quad, maximise, divider positions) are remembered per project whatever the
// session-restore setting (decision D0046). These run with restore off.

const shotPath = (testInfo, name) =>
  process.env.TERMINALLYSKILL_SCREENSHOT_DIR
    ? join(process.env.TERMINALLYSKILL_SCREENSHOT_DIR, name)
    : testInfo.outputPath(name)

async function launch(testInfo, width = 1400, height = 900) {
  const launched = await launchTerminallySkill(testInfo)
  await setWindowSize(launched.app, width, height)
  return launched
}

async function setWindowSize(app, width, height) {
  await app.evaluate(({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setSize(size.width, size.height), { width, height })
}

async function createProjects(page, testInfo, names) {
  for (const name of names) await mkdir(testInfo.outputPath(name), { recursive: true })
  await page.evaluate(
    async ({ dirs }) => {
      await window.electronAPI.updateSettings({ terminalInputMode: 'classic' })
      for (const [name, dir] of dirs) await window.electronAPI.createProject(name, dir, '#14b8a6', undefined, 'disabled', true)
    },
    { dirs: names.map((name) => [name, testInfo.outputPath(name)]) }
  )
  await page.reload()
  await waitForTerminal(page)
}

async function waitForTerminal(page) {
  await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 })
}

const savedLayout = (page, name) =>
  page.evaluate(async (projectName) => {
    const data = await window.electronAPI.getAllProjects()
    return data.projects.find((project) => project.name === projectName)?.workspaceLayout
  }, name)

const activeName = async (page) => (await page.title()).replace(/ — TerminallySKILL$/, '')

/** Cycles projects with the shortcut until `name` is active. */
async function switchTo(page, name) {
  const isMac = process.platform === 'darwin'
  for (let i = 0; i < 4 && (await activeName(page)) !== name; i++) {
    await page.locator('.xterm-helper-textarea').first().focus()
    await page.keyboard.press(isMac ? 'Meta+Alt+ArrowDown' : 'Control+Alt+PageDown')
    await page.waitForTimeout(500)
  }
  await expect.poll(() => activeName(page), { timeout: 10_000 }).toBe(name)
}

async function drag(page, box, toX, toY) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(toX, toY, { steps: 6 })
  await page.mouse.up()
}

const pane = (page, index) => page.locator(`[data-quad-pane="${index}"]`)
const visiblePanes = (page) => page.locator('[data-session-id]:visible')
const splitButton = (page) => page.locator('svg.lucide-columns-2, svg.lucide-columns2').first().locator('xpath=..')

test('split and quad divider positions come back after a restart, and a small window clamps them', async ({}, testInfo) => {
  test.setTimeout(120_000)
  const name = 'E2E Dividers'
  let leftSplitWidth = 0
  let quadPane0 = null
  const first = await launch(testInfo)
  try {
    const { page } = first
    await createProjects(page, testInfo, [name])

    // Two-pane split: move the divider to about a third
    await splitButton(page).click()
    await expect(page.locator('.xterm:visible')).toHaveCount(2, { timeout: 10_000 })
    const container = await visiblePanes(page).first().locator('xpath=..').boundingBox()
    await drag(page, await page.locator('div.cursor-col-resize').first().boundingBox(), container.x + container.width * 0.33, container.y + 50)
    await expect.poll(async () => (await savedLayout(page, name))?.splitRatio, { timeout: 5_000 }).toBeLessThan(40)
    leftSplitWidth = (await visiblePanes(page).first().boundingBox()).width

    // Close the split, then quad: move both dividers
    await splitButton(page).click()
    await expect(page.locator('.xterm:visible')).toHaveCount(1, { timeout: 10_000 })
    await page.getByTestId('terminal-maximise').click()
    await page.getByTestId('terminal-quad').click()
    await expect(page.locator('.xterm:visible')).toHaveCount(4, { timeout: 15_000 })
    const grid = await pane(page, 0).locator('xpath=..').boundingBox()
    await drag(page, await page.getByTestId('quad-divider-column').boundingBox(), grid.x + grid.width * 0.62, grid.y + 50)
    await drag(page, await page.getByTestId('quad-divider-row').boundingBox(), grid.x + 50, grid.y + grid.height * 0.35)
    await expect.poll(async () => (await savedLayout(page, name))?.quadRatios.row, { timeout: 5_000 }).toBeLessThan(40)
    const saved = await savedLayout(page, name)
    expect(saved.quadRatios.column).toBeGreaterThan(58)
    expect(saved.terminalMaximised).toBe(true)
    quadPane0 = await pane(page, 0).boundingBox()
  } finally {
    await first.app.close()
  }

  const second = await launch(testInfo)
  try {
    const { page } = second
    // Maximised quad with the dragged dividers
    await expect(page.locator('.xterm:visible')).toHaveCount(4, { timeout: 20_000 })
    await expect(page.getByTestId('terminal-maximise')).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(async () => (await pane(page, 0).boundingBox())?.width ?? 0).toBeGreaterThan(quadPane0.width - 4)
    const box = await pane(page, 0).boundingBox()
    expect(box.width).toBeLessThan(quadPane0.width + 4)
    expect(Math.abs(box.height - quadPane0.height)).toBeLessThan(4)
    await page.screenshot({ path: shotPath(testInfo, 'dividers-after-restart.png') })

    // Leave quad and split again: the split's divider is where it was
    await page.getByTestId('terminal-quad').click()
    await page.getByTestId('terminal-maximise').click()
    await expect(page.locator('.xterm:visible')).toHaveCount(1, { timeout: 10_000 })
    await splitButton(page).click()
    await expect(page.locator('.xterm:visible')).toHaveCount(2, { timeout: 10_000 })
    await expect.poll(async () => (await visiblePanes(page).first().boundingBox()).width).toBeGreaterThan(leftSplitWidth - 4)
    expect((await visiblePanes(page).first().boundingBox()).width).toBeLessThan(leftSplitWidth + 4)
    await splitButton(page).click()

    // A narrow window: the left quad panes keep their minimum width, and the saved position stays
    await page.getByTestId('terminal-quad').click()
    await page.getByTestId('terminal-maximise').click()
    await expect(page.locator('.xterm:visible')).toHaveCount(4, { timeout: 15_000 })
    await drag(page, await page.getByTestId('quad-divider-column').boundingBox(), 0, 300)
    await expect.poll(async () => (await savedLayout(page, name))?.quadRatios.column, { timeout: 5_000 }).toBeLessThan(25)
    const savedColumn = (await savedLayout(page, name)).quadRatios.column
    await setWindowSize(second.app, 1024, 677)
    await expect.poll(async () => (await pane(page, 0).boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(235)
    expect((await pane(page, 0).boundingBox()).width).toBeLessThan(260)
    await page.screenshot({ path: shotPath(testInfo, 'dividers-clamped-1024.png') })
    await page.waitForTimeout(500)
    expect((await savedLayout(page, name)).quadRatios.column).toBe(savedColumn)
  } finally {
    await second.app.close()
  }
})

test('each project keeps its own maximise and quad, across switches and a restart', async ({}, testInfo) => {
  test.setTimeout(120_000)
  const [a, b] = ['E2E Max A', 'E2E Docked B']
  const workspaceHeight = async (page) => (await page.getByTestId('workspace-panel').boundingBox())?.height ?? 0
  const expectMaximisedQuad = async (page, where) => {
    await expect(page.getByTestId('terminal-maximise'), where).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 })
    await expect.poll(() => workspaceHeight(page)).toBeLessThan(2)
    await expect(page.getByTestId('terminal-quad')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.xterm:visible')).toHaveCount(4, { timeout: 15_000 })
  }
  const expectDockedSingle = async (page) => {
    await expect(page.getByTestId('terminal-maximise')).toHaveAttribute('aria-pressed', 'false', { timeout: 10_000 })
    await expect.poll(() => workspaceHeight(page)).toBeGreaterThan(100)
    await expect(page.getByTestId('terminal-quad')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('.xterm:visible')).toHaveCount(1, { timeout: 10_000 })
    // The project view (its scripts) shows above the terminal
    await expect(page.getByText('Add Script').first()).toBeVisible()
  }

  const first = await launch(testInfo)
  try {
    const { page } = first
    await createProjects(page, testInfo, [a, b])
    await switchTo(page, a)
    await waitForTerminal(page)
    await page.getByTestId('terminal-quad').click()
    await page.getByTestId('terminal-maximise').click()
    await expectMaximisedQuad(page, 'A check 1')

    await switchTo(page, b)
    await expectDockedSingle(page)
    await switchTo(page, a)
    await expectMaximisedQuad(page, 'A check 2')
    await switchTo(page, b)
    await expectDockedSingle(page)
    await expect.poll(async () => (await savedLayout(page, a))?.terminalMaximised, { timeout: 5_000 }).toBe(true)
    expect((await savedLayout(page, b)).terminalMaximised).toBe(false)
    // A's docked size from before maximise is kept for when it is restored
    expect((await savedLayout(page, a)).terminalSize).toBeLessThan(80)
  } finally {
    await first.app.close()
  }

  const second = await launch(testInfo)
  try {
    const { page } = second
    await waitForTerminal(page)
    await expect.poll(() => activeName(page), { timeout: 20_000 }).toBe(b)
    await expectDockedSingle(page)
    await switchTo(page, a)
    await expectMaximisedQuad(page, 'A check 3')
    await page.screenshot({ path: shotPath(testInfo, 'project-a-maximised-quad.png') })
    await switchTo(page, b)
    await expectDockedSingle(page)
    await page.screenshot({ path: shotPath(testInfo, 'project-b-docked.png') })

    // Restoring A returns to its docked size from before maximise
    await switchTo(page, a)
    await expectMaximisedQuad(page, 'A check 4')
    await page.getByTestId('terminal-maximise').click()
    await expect.poll(() => workspaceHeight(page)).toBeGreaterThan(100)
  } finally {
    await second.app.close()
  }
})
