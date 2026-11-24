// TEMPORARY (branch fix/conpty-dll-server): opens terminals through the app's real IPC path and prints what
// the main process says. Removed before the branch is finished.
import { mkdir } from 'node:fs/promises'
import { test } from '@playwright/test'
import { launchPackagedTerminallySkill, launchTerminallySkill } from './electron-app.mjs'

test.skip(process.env.RUN_CONPTY_DEBUG !== '1', 'Set RUN_CONPTY_DEBUG=1 to run the conpty probe.')

test('conpty debug: open, use and close terminals through IPC', async ({}, testInfo) => {
  test.setTimeout(180_000)
  const t0 = Date.now()
  const { app, page } =
    process.env.PROBE_PACKAGED === '1' ? await launchPackagedTerminallySkill(testInfo) : await launchTerminallySkill(testInfo)
  const print = (source) => (buffer) => {
    for (const line of buffer.toString().split(/\r?\n/)) {
      if (line.trim()) console.log(`[${source} +${Date.now() - t0}ms] ${line}`)
    }
  }
  app.process().stdout.on('data', print('main'))
  app.process().stderr.on('data', print('main:err'))
  try {
    const cwd = testInfo.outputPath('workspace')
    await mkdir(cwd, { recursive: true })
    console.log(`[probe] usesBundledConpty in the renderer: ${await page.evaluate(() => window.electronAPI.usesBundledConpty)}`)
    for (let i = 1; i <= 3; i++) {
      const startedAt = Date.now()
      const result = await page.evaluate(async (dir) => {
        const output = []
        const stop = window.electronAPI.onTerminalData((id, data) => output.push(data))
        try {
          const sessionId = await window.electronAPI.createTerminal(dir)
          await new Promise((resolve) => setTimeout(resolve, 4000))
          const text = output.join('')
          return {
            sessionId,
            shellState: (await window.electronAPI.getSessionInfo(sessionId))?.shellState,
            outputChars: text.length,
            sawPrompt: /PS [^\r\n]*>/.test(text)
          }
        } catch (error) {
          return { error: String(error?.message ?? error) }
        } finally {
          stop()
        }
      }, cwd)
      console.log(`[probe] createTerminal #${i} after ${Date.now() - startedAt}ms -> ${JSON.stringify(result)}`)
      if (result.sessionId) {
        const killAt = Date.now()
        await page.evaluate((id) => window.electronAPI.killTerminal(id), result.sessionId)
        // A round trip through the main process: slow if closing the terminal blocks its thread.
        await page.evaluate(() => window.electronAPI.getAppVersion())
        console.log(`[probe] killTerminal #${i} and one main-process round trip took ${Date.now() - killAt}ms`)
      }
    }
    await page.waitForTimeout(2000)
  } finally {
    await app.close()
  }
})
