import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

// Running a script used to do nothing visible when its terminal could not start.
test('Run Script shows an error toast with the reason when the terminal cannot open', async ({}, testInfo) => {
  test.setTimeout(60_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    await page.evaluate(async () => {
      const script = await window.electronAPI.createScript('Toast test', null)
      await window.electronAPI.addStepToScript(script.id, 'echo never-runs', null)
    })
    // Every terminal fails to open from here on.
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('pty:create')
      ipcMain.handle('pty:create', () => {
        throw new Error('test: no pty available')
      })
    })
    await page.reload()
    await page.getByText('Toast test').first().waitFor({ timeout: 20_000 })

    // Close anything a terminal opened at launch reported, so the toast below comes from Run Script.
    const toasts = page.getByTestId('toast')
    for (const close of await toasts.getByRole('button').all()) await close.click()
    await expect(toasts).toHaveCount(0)

    await page.getByTitle(/^Run \d+ commands?$/).first().click()
    await expect(toasts).toHaveCount(1)
    await expect(toasts.first()).toHaveText('Could not open a terminal: test: no pty available')
    await page.screenshot({ path: testInfo.outputPath('terminal-open-error.png') })
  } finally {
    await app.close()
  }
})
