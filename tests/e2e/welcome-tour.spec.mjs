import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

// These specs start like a brand-new install (firstLaunch), so the tour is due.
// Every other spec gets settings.json with the tour marked as seen from the launcher.

const STEP_TITLES = [
  'Welcome to TerminallySKILL',
  'Commands',
  'Scripts',
  'Snippets and files',
  'Logs and search',
  'Terminal',
  'Help and settings'
]

// CI runners have about 1024x768 screens; check the tour fits a slightly smaller window
async function useSmallWindow(app, page) {
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(1024, 700))
  await expect.poll(() => page.evaluate(() => window.innerHeight)).toBeLessThanOrEqual(700)
}

function tourDialog(page) {
  return page.getByRole('dialog')
}

async function expectCardInsideWindow(page) {
  const box = await tourDialog(page).boundingBox()
  const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
  expect(box).not.toBeNull()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
}

test('first launch shows the tour once; keyboard walks every step and it stays closed after a relaunch', async ({}, testInfo) => {
  const first = await launchTerminallySkill(testInfo, {}, { firstLaunch: true })
  try {
    const { app, page } = first
    await useSmallWindow(app, page)

    const dialog = tourDialog(page)
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(dialog.getByRole('heading', { name: STEP_TITLES[0] })).toBeVisible()
    await expect(dialog).toContainText('Step 1 of 7')
    // Step 1 lights the real Create Project button of the empty screen
    await expect(page.getByTestId('welcome-tour-spotlight')).toBeVisible()
    await expect(page.getByTestId('welcome-tour-next')).toBeFocused()

    for (let index = 1; index < STEP_TITLES.length; index += 1) {
      await page.keyboard.press('Enter')
      await expect(dialog.getByRole('heading', { name: STEP_TITLES[index] })).toBeVisible()
      await expect(dialog).toContainText(`Step ${index + 1} of 7`)
      await expect(page.getByTestId('welcome-tour-spotlight')).toBeVisible()
      await expectCardInsideWindow(page)
    }

    // Back with the arrow key, forward again with the Next button
    await page.keyboard.press('ArrowLeft')
    await expect(dialog.getByRole('heading', { name: STEP_TITLES[5] })).toBeVisible()
    await dialog.getByRole('button', { name: 'Next' }).click()

    // Tab stays inside the dialog
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true)
    }

    await dialog.getByRole('button', { name: 'Get started' }).click()
    await expect(page.getByTestId('welcome-tour')).toHaveCount(0)
    await expect
      .poll(() => page.evaluate(() => window.electronAPI.getSettings().then((s) => s.hasSeenWelcomeTour)))
      .toBe(true)
  } finally {
    await first.app.close()
  }

  // Same data folder: the tour does not come back
  const second = await launchTerminallySkill(testInfo, {}, { firstLaunch: true })
  try {
    await expect(second.page.getByRole('button', { name: 'Commands', exact: true })).toBeVisible()
    await second.page.waitForTimeout(500)
    await expect(second.page.getByTestId('welcome-tour')).toHaveCount(0)
  } finally {
    await second.app.close()
  }
})

test('Escape skips the tour and the help guide can show it again', async ({}, testInfo) => {
  const { app, page } = await launchTerminallySkill(testInfo, {}, { firstLaunch: true })
  try {
    await useSmallWindow(app, page)
    await expect(tourDialog(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('welcome-tour')).toHaveCount(0)
    await expect
      .poll(() => page.evaluate(() => window.electronAPI.getSettings().then((s) => s.hasSeenWelcomeTour)))
      .toBe(true)

    await page.getByRole('button', { name: 'How it works' }).click()
    await page.getByTestId('show-welcome-tour').click()
    await expect(tourDialog(page).getByRole('heading', { name: STEP_TITLES[0] })).toBeVisible()

    await tourDialog(page).getByRole('button', { name: 'Skip tour' }).first().click()
    await expect(page.getByTestId('welcome-tour')).toHaveCount(0)
  } finally {
    await app.close()
  }
})

test('the Create Project action opens the real dialog and the tour carries on after it', async ({}, testInfo) => {
  const { app, page } = await launchTerminallySkill(testInfo, {}, { firstLaunch: true })
  try {
    await useSmallWindow(app, page)
    await page.getByTestId('welcome-tour-create-project').click()
    await expect(page.getByTestId('welcome-tour')).toHaveCount(0)

    const cancel = page.getByRole('button', { name: 'Cancel', exact: true })
    await expect(cancel).toBeVisible()
    await cancel.click()

    await expect(tourDialog(page).getByRole('heading', { name: STEP_TITLES[1] })).toBeVisible()
  } finally {
    await app.close()
  }
})

test('a target that is missing does not block the tour', async ({}, testInfo) => {
  const { app, page } = await launchTerminallySkill(testInfo, {}, { firstLaunch: true })
  try {
    await expect(tourDialog(page)).toBeVisible()
    // Remove the element step 2 points at: the card centres itself and still works
    await page.evaluate(() => document.querySelector('[data-tour="sidebar-tab-commands"]')?.removeAttribute('data-tour'))
    await page.keyboard.press('Enter')
    await expect(tourDialog(page).getByRole('heading', { name: STEP_TITLES[1] })).toBeVisible()
    await expect(page.getByTestId('welcome-tour-spotlight')).toHaveCount(0)
    await page.keyboard.press('Enter')
    await expect(tourDialog(page).getByRole('heading', { name: STEP_TITLES[2] })).toBeVisible()
  } finally {
    await app.close()
  }
})

test('users upgrading with existing data never see the tour', async ({}, testInfo) => {
  // settings.json from 0.9.103 (no flag)
  const upgradeDir = testInfo.outputPath('upgrade-user-data')
  await mkdir(join(upgradeDir, 'data'), { recursive: true })
  await writeFile(join(upgradeDir, 'data', 'settings.json'), JSON.stringify({ theme: 'void' }))
  // No settings.json, but projects from an older install
  const projectsOnlyDir = testInfo.outputPath('projects-only-user-data')
  await mkdir(join(projectsOnlyDir, 'data'), { recursive: true })
  await writeFile(
    join(projectsOnlyDir, 'data', 'projects.json'),
    JSON.stringify({ projects: [], activeProjectId: null })
  )

  for (const userDataDir of [upgradeDir, projectsOnlyDir]) {
    const { app, page } = await launchTerminallySkill(
      testInfo,
      { TERMINALLYSKILL_USER_DATA_DIR: userDataDir },
      { firstLaunch: true }
    )
    try {
      await expect(page.getByRole('button', { name: 'Commands', exact: true })).toBeVisible()
      expect(await page.evaluate(() => window.electronAPI.getSettings().then((s) => s.hasSeenWelcomeTour))).toBe(true)
      await expect(page.getByTestId('welcome-tour')).toHaveCount(0)
    } finally {
      await app.close()
    }
  }
})
