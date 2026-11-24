import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'
import { isWindows, shellCommand } from './shell-commands.mjs'

// sudo and apt flush the terminal's pending input, which throws away the step-result marker typed ahead
// of the next prompt. A step like that used to hang the whole workflow on "running".
test('a workflow continues past a command that flushes the terminal input', async ({}, testInfo) => {
  test.setTimeout(90_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    const flushStep = shellCommand(
      `python3 -c "import termios; termios.tcflush(0, termios.TCIFLUSH)"; echo first-step-done`,
      // The console's own input flush (FlushConsoleInputBuffer), what tcflush does on a tty.
      '$host.UI.RawUI.FlushInputBuffer(); echo first-step-done'
    )
    await page.evaluate(async (flushStep) => {
      await window.electronAPI.updateSettings({ terminalInputMode: 'classic' })
      const script = await window.electronAPI.createScript('Flush test', null)
      await window.electronAPI.addStepToScript(script.id, flushStep, null)
      await window.electronAPI.addStepToScript(script.id, 'echo second-step-ran', null)
    }, flushStep)
    await page.reload()
    await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {})
    await page.getByText('Flush test').first().click()
    await page.getByRole('button', { name: /Run Script/ }).click()

    await expect(page.locator('.xterm-rows:visible')).toContainText('second-step-ran', { timeout: 30_000 })
  } finally {
    await app.close()
  }
})

// Each line editor draws the typed-ahead marker its own way: zsh a few characters per chunk, readline in
// macOS /bin/bash 3.2 wraps a long line with " \r". On macOS and Linux the test runs in every shell found,
// with the user's own prompt and with a long one (like a CI runner's host name) that makes the marker line
// wrap inside its start, where the line editors redraw characters.
const markerShells = isWindows
  ? [null]
  : ['/bin/zsh', '/bin/bash', '/opt/homebrew/bin/bash', '/usr/local/bin/bash'].filter((shell) => existsSync(shell))
const longPrompt = 'runner@sat12-bq165-ee9ebc1c-cd16-42fd-b463-b074e0e23356-36AEEBC4AED3'

/** A home folder whose rc files draw a prompt that ends 18 columns before the window edge. */
async function longPromptHome(testInfo) {
  const home = testInfo.outputPath('home')
  await mkdir(home, { recursive: true })
  await writeFile(
    join(home, '.zshrc'),
    `precmd() { PROMPT="\${\${:-${longPrompt}\${(l:COLUMNS::-:)}}[1,COLUMNS-20]}%# " }\n`
  )
  await writeFile(
    join(home, '.bashrc'),
    `shopt -s checkwinsize\nPROMPT_COMMAND='p="${longPrompt}$(printf "%\${COLUMNS}s" | tr " " -)"; PS1="\${p:0:COLUMNS-20}\\$ "'\n`
  )
  return home
}

for (const shell of markerShells) for (const long of shell ? [false, true] : [false]) {
  const name = shell ? ` (${shell}${long ? ', long prompt' : ''})` : ''
  test(`the step marker never shows in the terminal or in shell history${name}`, async ({}, testInfo) => {
    test.setTimeout(90_000)
    const env = shell ? { SHELL: shell } : {}
    if (long) Object.assign(env, { HOME: await longPromptHome(testInfo), TV_USER_ZDOTDIR: '' })
    const { app, page } = await launchTerminallySkill(testInfo, env)
    try {
      const historyStep = shellCommand('fc -ln -5; echo second-step-ran', '(Get-History -Count 5).CommandLine; echo second-step-ran')
      await page.evaluate(async (historyStep) => {
        await window.electronAPI.updateSettings({ terminalInputMode: 'classic' })
        const script = await window.electronAPI.createScript('Marker test', null)
        await window.electronAPI.addStepToScript(script.id, 'sleep 2; echo long-step-done', null)
        await window.electronAPI.addStepToScript(script.id, historyStep, null)
      }, historyStep)
      await page.reload()
      await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {})
      await page.getByText('Marker test').first().click()
      await page.getByRole('button', { name: /Run Script/ }).click()

      const rows = page.locator('.xterm-rows:visible')
      await expect(rows).toContainText('second-step-ran', { timeout: 30_000 })
      await expect(rows).toContainText('long-step-done')
      await expect(rows).not.toContainText('7337')
      // The end of a wrapped marker line has no 7337 in it
      await expect(rows).not.toContainText('$?')
    } finally {
      await app.close()
    }
  })
}

// A step's marker draws its own prompt, which can arrive after the next step has started.
test('a long step is not marked done by the prompt of the step before it', async ({}, testInfo) => {
  test.setTimeout(90_000)
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    // PSReadLine colours a typed "third-$(...)" in pieces, so on PowerShell the typed line is found by 'third-'.
    const steps = shellCommand(
      ['echo first-$((1+1))', 'sleep 6; echo long-$((1+1))', 'echo third-$((1+1))'],
      ["echo ('first-' + (1+1))", "Start-Sleep 6; echo ('long-' + (1+1))", "echo ('third-' + (1+1))"]
    )
    const typedThird = shellCommand('third-$', "'third-'")
    await page.evaluate(async (steps) => {
      await window.electronAPI.updateSettings({ terminalInputMode: 'classic' })
      const script = await window.electronAPI.createScript('Long step test', null)
      for (const step of steps) await window.electronAPI.addStepToScript(script.id, step, null)
    }, steps)
    await page.reload()
    await page.locator('.xterm-helper-textarea').first().waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {})
    // Keep all output: on a small screen the long step's line scrolls out of the visible rows.
    await page.evaluate(() => {
      window.__output = ''
      window.electronAPI.onTerminalData((_sessionId, data) => {
        window.__output += data
      })
    })
    const output = () => page.evaluate(() => window.__output)
    await page.getByText('Long step test').first().click()
    await page.getByRole('button', { name: /Run Script/ }).click()

    const rows = page.locator('.xterm-rows:visible')
    await expect.poll(output, { timeout: 30_000 }).toContain('first-2')
    // The third step's command line must not be typed while the long step is still running
    await page.waitForTimeout(3_000)
    expect(await output()).not.toContain('long-2')
    expect(await output()).not.toContain(typedThird)

    await expect.poll(output, { timeout: 30_000 }).toContain('third-2')
    const done = await output()
    expect(done).toContain('long-2')
    expect(done.indexOf('long-2')).toBeLessThan(done.lastIndexOf(typedThird))
    await expect(rows).not.toContainText('7337')
  } finally {
    await app.close()
  }
})
