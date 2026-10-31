import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

// sudo and apt flush the terminal's pending input, which throws away the step-result marker typed ahead
// of the next prompt. A step like that used to hang the whole workflow on "running".
test('a workflow continues past a command that flushes the terminal input', async ({}, testInfo) => {
  test.setTimeout(90_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    await page.evaluate(async () => {
      await window.electronAPI.updateSettings({ terminalInputMode: 'classic' })
      const script = await window.electronAPI.createScript('Flush test', null)
      await window.electronAPI.addStepToScript(
        script.id,
        `python3 -c "import termios; termios.tcflush(0, termios.TCIFLUSH)"; echo first-step-done`,
        null
      )
      await window.electronAPI.addStepToScript(script.id, 'echo second-step-ran', null)
    })
    await page.reload()
    await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {})
    await page.getByText('Flush test').first().click()
    await page.getByRole('button', { name: /Run Script/ }).click()

    await expect(page.locator('.xterm-rows:visible')).toContainText('second-step-ran', { timeout: 30_000 })
  } finally {
    await app.close()
  }
})

// The marker typed ahead of a running step is redrawn by the line editor a few characters per chunk.
test('the step marker never shows in the terminal or in shell history', async ({}, testInfo) => {
  test.setTimeout(90_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    await page.evaluate(async () => {
      await window.electronAPI.updateSettings({ terminalInputMode: 'classic' })
      const script = await window.electronAPI.createScript('Marker test', null)
      await window.electronAPI.addStepToScript(script.id, 'sleep 2; echo long-step-done', null)
      await window.electronAPI.addStepToScript(script.id, 'fc -ln -5; echo second-step-ran', null)
    })
    await page.reload()
    await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {})
    await page.getByText('Marker test').first().click()
    await page.getByRole('button', { name: /Run Script/ }).click()

    const rows = page.locator('.xterm-rows:visible')
    await expect(rows).toContainText('second-step-ran', { timeout: 30_000 })
    await expect(rows).toContainText('long-step-done')
    await expect(rows).not.toContainText('7337')
  } finally {
    await app.close()
  }
})
