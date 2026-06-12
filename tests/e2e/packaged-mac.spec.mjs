import { mkdir, readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import {
  launchPackagedTerminallySkill,
  resolvePackagedExecutablePath
} from './electron-app.mjs'

const packageJson = JSON.parse(
  await readFile(new URL('../../package.json', import.meta.url), 'utf8')
)

test.skip(process.env.RUN_PACKAGED_E2E !== '1', 'Set RUN_PACKAGED_E2E=1 to run packaged smoke tests.')
test.skip(process.platform !== 'darwin', 'macOS packaged smoke requires a macOS host.')

async function closeAndAssertExited(app) {
  const child = app.process()
  await app.close()

  await expect
    .poll(() => child.exitCode ?? child.signalCode ?? null, {
      message: 'packaged app process should exit cleanly',
      timeout: 5000
    })
    .not.toBeNull()
}

async function assertPackagedTerminalStarts(page, cwd) {
  const sessionId = await page.evaluate(
    (terminalCwd) => window.electronAPI.createTerminal(terminalCwd),
    cwd
  )

  expect(sessionId).toEqual(expect.any(String))
  expect(sessionId.length).toBeGreaterThan(0)

  const sessionInfo = await page.evaluate(
    (id) => window.electronAPI.getSessionInfo(id),
    sessionId
  )

  expect(sessionInfo).toMatchObject({ cwd })

  await page.evaluate((id) => window.electronAPI.killTerminal(id), sessionId)
}

test('macOS packaged app launches and persists settings across relaunch', async ({}, testInfo) => {
  const executablePath = resolvePackagedExecutablePath()
  const terminalCwd = testInfo.outputPath('terminal-cwd')
  await mkdir(terminalCwd, { recursive: true })

  const firstLaunch = await launchPackagedTerminallySkill(testInfo)

  try {
    await expect(firstLaunch.page).toHaveTitle('TerminallySKILL')

    const appVersion = await firstLaunch.page.evaluate(() =>
      window.electronAPI.getAppVersion()
    )
    expect(appVersion).toBe(packageJson.version)

    const updatedSettings = await firstLaunch.page.evaluate(() =>
      window.electronAPI.updateSettings({
        checkForUpdatesOnStartup: false,
        safePasteMode: false,
        saveTerminalLogs: false,
        showHelpTooltips: false,
        theme: 'stone'
      })
    )

    expect(updatedSettings).toMatchObject({
      checkForUpdatesOnStartup: false,
      safePasteMode: false,
      saveTerminalLogs: false,
      showHelpTooltips: false,
      theme: 'stone'
    })

    await assertPackagedTerminalStarts(firstLaunch.page, terminalCwd)
  } finally {
    await closeAndAssertExited(firstLaunch.app)
  }

  const secondLaunch = await launchPackagedTerminallySkill(testInfo, {
    userDataDir: firstLaunch.userDataDir
  })

  try {
    await expect(secondLaunch.page).toHaveTitle('TerminallySKILL')

    const persistedSettings = await secondLaunch.page.evaluate(() =>
      window.electronAPI.getSettings()
    )

    expect(persistedSettings).toMatchObject({
      checkForUpdatesOnStartup: false,
      safePasteMode: false,
      saveTerminalLogs: false,
      showHelpTooltips: false,
      theme: 'stone'
    })

    expect(executablePath).toContain('TerminallySKILL.app')
  } finally {
    await closeAndAssertExited(secondLaunch.app)
  }
})
