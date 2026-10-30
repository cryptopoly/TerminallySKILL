import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { delimiter, join } from 'node:path'
import { hostname as osHostname } from 'node:os'
import { promisify } from 'node:util'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'
import {
  createSshIsolationShim,
  isLocalSshdAvailable,
  startLocalOpenSshFixture
} from './local-openssh-fixture.mjs'

const execFileAsync = promisify(execFile)

// Real remote-session coverage without Docker: a throwaway user-space sshd on
// 127.0.0.1 (see local-openssh-fixture.mjs). Run with `npm run test:e2e:ssh-local`.

test.describe('local OpenSSH (user-space sshd)', () => {
  test.skip(
    process.env.RUN_LOCAL_SSH_E2E !== '1',
    'Set RUN_LOCAL_SSH_E2E=1 to run the local sshd SSH E2E tests.'
  )
  // Terminal tests need time for ssh + shell startup.
  test.setTimeout(90000)

  let ssh
  let skipReason = null

  test.beforeAll(async ({}, testInfo) => {
    if (!isLocalSshdAvailable()) {
      skipReason = 'Local sshd (/usr/sbin/sshd) is not available.'
      return
    }
    try {
      ssh = await startLocalOpenSshFixture(testInfo.outputPath('local-sshd'))
    } catch (error) {
      skipReason = `Could not start a user-space sshd: ${error instanceof Error ? error.message : error}`
    }
  })

  test.afterAll(async () => {
    if (ssh) await ssh.stop()
  })

  test.beforeEach(() => {
    test.skip(Boolean(skipReason), skipReason ?? '')
  })

  /**
   * Launches the app with a known_hosts file in a temp dir, plus a PATH `ssh` wrapper that
   * pins OpenSSH to that file. OpenSSH resolves "~" from the passwd database, not $HOME, so
   * overriding HOME would not redirect ~/.ssh/known_hosts on macOS (and Electron then fails to
   * exit on quit there); the wrapper is what keeps the developer's real ~/.ssh untouched. zsh
   * rc files likewise come from a temp ZDOTDIR.
   */
  async function launchApp(testInfo, { trustHost = true } = {}) {
    const sshHome = testInfo.outputPath('ssh-home')
    await mkdir(join(sshHome, '.ssh'), { recursive: true })
    const knownHostsFile = join(sshHome, '.ssh', 'known_hosts')
    await writeFile(knownHostsFile, trustHost ? ssh.knownHostsEntry : '', 'utf8')

    const shimLog = testInfo.outputPath('ssh-shim.log')
    const binDir = await createSshIsolationShim({
      zshDir: join(sshHome, 'zdotdir'),
      binDir: testInfo.outputPath('ssh-shim-bin'),
      knownHostsFile,
      logFile: shimLog
    })

    const launched = await launchTerminallySkill(testInfo, {
      ZDOTDIR: join(sshHome, 'zdotdir'),
      PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`
    })
    return { ...launched, shimLog }
  }

  /**
   * Closes the app. The window's close handler opens a blocking native "processes are
   * running" dialog while a terminal's shell is still `executing` (including during shell
   * start-up), and Playwright cannot click native dialogs. So wait for an idle prompt first,
   * and fall back to killing the Electron process this test launched (never any other).
   */
  async function closeApp(app, page) {
    if ((await page.locator('.xterm-rows').count().catch(() => 0)) > 0) {
      await page
        .waitForFunction(
          () =>
            Array.from(document.querySelectorAll('.xterm-rows')).some((rows) =>
              /[%$#][\s\u00a0]*$/m.test(rows.innerText)
            ),
          undefined,
          { timeout: 15000 }
        )
        .catch(() => {})
    }

    const closed = await Promise.race([
      app.close().then(() => true),
      new Promise((resolvePromise) => setTimeout(() => resolvePromise(false), 8000))
    ])
    if (!closed) {
      console.warn('App did not quit within 8s; killing the Electron process this test launched.')
      app.process().kill('SIGKILL')
    }
  }

  const sshTarget = (overrides = {}) => ({
    type: 'ssh',
    host: ssh.host,
    user: ssh.user,
    port: ssh.port,
    cwd: ssh.cwd,
    identityFile: ssh.identityFile,
    label: 'Local OpenSSH',
    vncPort: null,
    ...overrides
  })

  test('testWorkspaceTarget succeeds against a real sshd and reports the remote cwd', async ({}, testInfo) => {
    const { app, page } = await launchApp(testInfo)

    try {
      const result = await page.evaluate(
        (target) => window.electronAPI.testWorkspaceTarget(target),
        sshTarget()
      )

      // macOS reports the realpath (/private/var/...) for temp dirs under /var.
      expect(result.ok).toBe(true)
      expect(result.message).toMatch(/^SSH connection succeeded\. Remote cwd: /)
      expect(result.message.endsWith('remote-cwd')).toBe(true)
    } finally {
      await closeApp(app, page)
    }
  })

  test('testWorkspaceTarget rejects a key the server does not know', async ({}, testInfo) => {
    const { app, page } = await launchApp(testInfo)

    try {
      const result = await page.evaluate(
        (target) => window.electronAPI.testWorkspaceTarget(target),
        sshTarget({ identityFile: ssh.wrongIdentityFile })
      )

      expect(result).toEqual({
        ok: false,
        message: 'SSH authentication failed. Check your user, key, or agent.'
      })
    } finally {
      await closeApp(app, page)
    }
  })

  test('testWorkspaceTarget rejects an unknown host key (no silent trust)', async ({}, testInfo) => {
    const { app, page } = await launchApp(testInfo, { trustHost: false })

    try {
      const result = await page.evaluate(
        (target) => window.electronAPI.testWorkspaceTarget(target),
        sshTarget()
      )

      // The app runs ssh with BatchMode=yes and default StrictHostKeyChecking, so an
      // unknown key fails instead of being auto-accepted.
      expect(result).toEqual({
        ok: false,
        message: 'SSH host key verification failed.'
      })
    } finally {
      await closeApp(app, page)
    }
  })

  test('opens an SSH workspace terminal, runs commands remotely and closes cleanly', async ({}, testInfo) => {
    const { app, page, shimLog } = await launchApp(testInfo)
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    let crashed = false
    page.on('crash', () => {
      crashed = true
    })

    try {
      const project = await page.evaluate(
        (target) =>
          window.electronAPI.createProject(
            'E2E Local SSH',
            target.cwd,
            '#14b8a6',
            target,
            'disabled',
            true
          ),
        sshTarget()
      )
      expect(project.workspaceTarget.type).toBe('ssh')

      // Reload so the renderer picks up the active SSH project.
      await page.reload()
      await page.waitForFunction(() => Boolean(window.electronAPI?.getAppVersion))

      // Remember which PTY session carries the remote output so the exit event can be matched to it.
      await page.evaluate(() => {
        window.__sshSessionIds = new Set()
        window.electronAPI.onTerminalData((sessionId, data) => {
          if (data.includes('remote-ok-42')) window.__sshSessionIds.add(sessionId)
        })
      })

      // Open the interactive SSH shell with the Server button in the terminal tab bar.
      await page.locator('button.p-2:has(svg.lucide-server)').click()

      const terminalText = () =>
        page.evaluate(() =>
          Array.from(document.querySelectorAll('.xterm-rows'))
            .map((rows) => rows.innerText)
            .join('\n---\n')
        )

      // The remote login shell starts in the target cwd, so its prompt ends with the dir name (zsh prints %, bash $).
      await expect.poll(terminalText, { timeout: 30000 }).toMatch(/remote-cwd\s*[%$#] ?$/m)

      const terminalInput = page.locator('.xterm-helper-textarea').last()
      const typeLine = async (line) => {
        await terminalInput.focus()
        await page.keyboard.type(line)
        await page.keyboard.press('Enter')
      }

      // 1. Arithmetic is evaluated by the remote shell: the echoed command line still
      //    contains "$((20+22))", only real output contains "remote-ok-42".
      await typeLine('echo remote-ok-$((20+22))')
      await expect.poll(terminalText, { timeout: 15000 }).toContain('remote-ok-42')

      // 2. Output of `hostname` (sshd runs on this machine, so it matches the local name).
      const { stdout: localHostname } = await execFileAsync('hostname')
      await typeLine('hostname')
      await expect
        .poll(
          async () => (await terminalText()).split('\n').some((line) => line.trim() === localHostname.trim()),
          { timeout: 15000 }
        )
        .toBe(true)

      // 3. Long command line (~3000 chars) plus a large burst of output.
      await typeLine(`echo ${'a'.repeat(3000)} | wc -c`)
      await expect.poll(terminalText, { timeout: 20000 }).toMatch(/\b3001\b/)
      await typeLine('seq 1 20000 | tail -n 1; echo long-done-$((7*6))')
      await expect.poll(terminalText, { timeout: 20000 }).toContain('long-done-42')
      await typeLine('echo still-alive-$((1+1))')
      await expect.poll(terminalText, { timeout: 15000 }).toContain('still-alive-2')

      expect(crashed).toBe(false)
      expect(pageErrors).toEqual([])

      // The app launched ssh through the isolation shim with the interactive-shell flags.
      const shimCalls = (await readFile(shimLog, 'utf8')).trim().split('\n')
      expect(
        shimCalls.some((call) => call.startsWith('-t ') && call.includes(`${ssh.user}@127.0.0.1`))
      ).toBe(true)

      // 4. Close cleanly: `exit` ends the remote shell, ssh returns to the local shell,
      //    a second `exit` ends the PTY, which must be reported as a clean exit code 0.
      const sshSessionIds = await page.evaluate(() => Array.from(window.__sshSessionIds))
      expect(sshSessionIds).toHaveLength(1)
      const exited = page.evaluate(
        (sshSessionId) =>
          new Promise((resolve) => {
            const off = window.electronAPI.onTerminalExit((sessionId, exitCode) => {
              if (sessionId !== sshSessionId) return
              off()
              resolve({ sessionId, exitCode })
            })
          }),
        sshSessionIds[0]
      )
      await typeLine('exit')
      await expect.poll(terminalText, { timeout: 15000 }).toMatch(/Connection to 127\.0\.0\.1 closed/)
      await typeLine('exit')
      const { exitCode } = await exited
      expect(exitCode).toBe(0)
      expect(crashed).toBe(false)
      expect(pageErrors).toEqual([])
    } finally {
      await closeApp(app, page)
    }
  })
})
