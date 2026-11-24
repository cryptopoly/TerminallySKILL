// TEMPORARY (branch fix/conpty-dll-server): quits the app with several terminals open, many times, and
// reports a quit that does not finish (main-process output, process tree, threads, stacks).
// Removed before the branch is finished.
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

test.skip(process.env.RUN_CONPTY_QUIT_STRESS !== '1', 'Set RUN_CONPTY_QUIT_STRESS=1 to run the quit stress.')

const ROUNDS = Number(process.env.QUIT_STRESS_ROUNDS ?? 40)
const TERMINALS = Number(process.env.QUIT_STRESS_TERMINALS ?? 3)
const CLOSE_LIMIT_MS = 25_000
const diagnose = resolve(dirname(fileURLToPath(import.meta.url)), '../../.github/conpty-debug/diagnose.ps1')
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

test('conpty debug: quit with terminals open, many times', async ({}, testInfo) => {
  test.setTimeout(ROUNDS * 90_000)
  const closeTimes = []
  const badExitCodes = []
  let hangs = 0

  for (let round = 1; round <= ROUNDS; round++) {
    const userDataDir = testInfo.outputPath(`user-data-${round}`)
    await mkdir(join(userDataDir, 'data'), { recursive: true })
    await writeFile(join(userDataDir, 'data', 'settings.json'), JSON.stringify({ hasSeenWelcomeTour: true }))
    const workspaceDir = testInfo.outputPath(`workspace-${round}`)
    await mkdir(workspaceDir, { recursive: true })

    const startedAt = Date.now()
    const lines = []
    const { app, page } = await launchTerminallySkill(testInfo, { TERMINALLYSKILL_USER_DATA_DIR: userDataDir })
    const record = (source) => (buffer) => {
      for (const line of buffer.toString().split(/\r?\n/)) {
        if (line.trim()) lines.push(`  [${source} +${Date.now() - startedAt}ms] ${line}`)
      }
    }
    // Playwright's handle to the process is gone once the app has closed.
    const child = app.process()
    child.stdout.on('data', record('main'))
    child.stderr.on('data', record('main:err'))

    await page.evaluate(async (cwd) => {
      await window.electronAPI.updateSettings({ terminalInputMode: 'classic' })
      await window.electronAPI.createProject('Quit stress', cwd, '#14b8a6', undefined, 'disabled', true)
    }, workspaceDir)
    await page.reload()
    await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 30_000 })
    await page.evaluate(
      async ({ cwd, extra }) => {
        for (let i = 0; i < extra; i++) await window.electronAPI.createTerminal(cwd)
      },
      { cwd: workspaceDir, extra: TERMINALS - 1 }
    )
    // Every shell at its prompt, as when someone quits after working in the app.
    const idle = await page
      .waitForFunction(
        async (count) => {
          for (let i = 1; i <= count; i++) {
            const info = await window.electronAPI.getSessionInfo(`term-${i}`)
            if (info?.shellState !== 'idle') return false
          }
          return true
        },
        TERMINALS,
        { timeout: 30_000, polling: 100 }
      )
      .then(() => true, () => false)

    const mainPid = await app.evaluate(() => process.pid)
    await app.evaluate(({ app }) => {
      const log = (message) => console.log(`[quit-debug] ${Date.now()} ${message}`)
      app.on('before-quit', (event) => log(`before-quit defaultPrevented=${event.defaultPrevented}`))
      app.on('will-quit', () => log('will-quit'))
      app.on('quit', () => log('quit'))
      process.on('exit', (code) => log(`process exit ${code}`))
      let last = Date.now()
      setInterval(() => {
        const now = Date.now()
        if (now - last > 300) log(`event loop was stalled for ${now - last}ms`)
        last = now
      }, 50)
      log('hooks installed')
    })

    const closeAt = Date.now()
    const closing = app.close().then(() => 'closed', (error) => `close error: ${error.message}`)
    const outcome = await Promise.race([closing, sleep(CLOSE_LIMIT_MS).then(() => 'HANG')])
    const closeMs = Date.now() - closeAt

    if (outcome !== 'closed') {
      hangs++
      console.log(`[quit-stress] round ${round}: ${outcome} after ${closeMs}ms (shells idle: ${idle}, main pid ${mainPid}, close began at ${closeAt})`)
      console.log(lines.join('\n'))
      try {
        const report = execFileSync(
          'powershell.exe',
          ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', diagnose, '-TargetPid', String(mainPid)],
          { encoding: 'utf8', timeout: 240_000, maxBuffer: 64 * 1024 * 1024 }
        )
        console.log(report)
      } catch (error) {
        console.log(`diagnose failed: ${error.message}`)
      }
      try {
        execFileSync('taskkill', ['/PID', String(mainPid), '/T', '/F'])
      } catch {
        // already gone
      }
      await closing
    } else {
      closeTimes.push(closeMs)
      // The app is started through cmd.exe on Windows, which passes the app's exit code on.
      const exitCode = child.exitCode
      if (exitCode !== 0) badExitCodes.push(`round ${round}: 0x${((exitCode ?? -1) >>> 0).toString(16).toUpperCase()}`)
      if (round <= 2 || closeMs > 4000 || !idle || exitCode !== 0) {
        console.log(`[quit-stress] round ${round}: closed in ${closeMs}ms, exit code ${exitCode} (shells idle: ${idle}, close began at ${closeAt})`)
        console.log(lines.filter((line) => /quit-debug|did not report|Creating terminal|Initial spawn|Error/.test(line)).join('\n'))
      }
    }
    if (round % 20 === 0) console.log(`[quit-stress] ${round}/${ROUNDS} rounds, ${hangs} hang(s), ${badExitCodes.length} bad exit code(s) so far`)
  }

  const sorted = [...closeTimes].sort((a, b) => a - b)
  console.log(
    `[quit-stress] SUMMARY ${JSON.stringify({
      dll: process.env.TSK_CONPTY_DLL !== '0',
      rounds: ROUNDS,
      terminals: TERMINALS,
      hangs,
      badExitCodes,
      closeMs: { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], max: sorted[sorted.length - 1] }
    })}`
  )
  expect({ hangs, badExitCodes }).toEqual({ hangs: 0, badExitCodes: [] })
})
