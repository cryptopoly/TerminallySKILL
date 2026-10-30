import { createServer } from 'node:http'
import { mkdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

// Built at run time so no token-shaped literal sits in the repository.
const FAKE_TOKEN = 'gh' + 'p_' + 'E2eFakeTokenForMaskingTest' + '0123456789'
const FAKE_PASSWORD = 'hunter2e2e'

/** A stand-in for Ollama on 127.0.0.1 that records every request body it receives. */
async function startMockOllama() {
  const bodies = []
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      res.setHeader('content-type', 'application/json')
      if (req.method === 'POST' && req.url === '/api/chat') {
        bodies.push(body)
        res.end(JSON.stringify({ message: { content: 'Summary\nThe command exited with 1.' } }))
        return
      }
      res.end(JSON.stringify({ models: [{ name: 'mock-model' }] }))
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { bodies, url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() }
}

test('a secret typed in a terminal is shown as typed but masked in the AI request and the saved log', async ({}, testInfo) => {
  test.setTimeout(90_000)
  const mock = await startMockOllama()
  const { app, page } = await launchTerminallySkill(testInfo)

  try {
    const workspaceDir = testInfo.outputPath('workspace')
    await mkdir(workspaceDir, { recursive: true })
    const project = await page.evaluate(
      async ({ cwd, baseUrl }) => {
        await window.electronAPI.updateProvider('ollama', { enabled: true, baseUrl, model: 'mock-model' })
        await window.electronAPI.updateSettings({ activeAIProvider: 'ollama', maskSecrets: true })
        const created = await window.electronAPI.createProject('E2E Masking', cwd, '#14b8a6', undefined, 'enabled', true)
        // A tall terminal panel: on a CI runner's ~1024x768 screen the default leaves the terminal one visible row.
        await window.electronAPI.updateProject(created.id, {
          workspaceLayout: { ...created.workspaceLayout, terminalSize: 75 }
        })
        return created
      },
      { cwd: workspaceDir, baseUrl: mock.url }
    )
    await page.reload()
    await page.waitForFunction(() => Boolean(window.electronAPI?.getAppVersion))
    await page.evaluate(() => {
      window.__ptyData = ''
      window.electronAPI.onTerminalData((_sessionId, data) => {
        window.__ptyData += data
      })
    })

    const input = page.locator('.xterm-helper-textarea').first()
    await input.waitFor({ state: 'attached', timeout: 20_000 })
    await page.waitForTimeout(2000)
    // Submit through the editor prompt so the app records the command block and its exit code.
    const editor = page.getByPlaceholder('Type a command and press Enter')
    await editor.click()
    await page.keyboard.type(`echo ${FAKE_TOKEN} --password ${FAKE_PASSWORD}; false`)
    await page.keyboard.press('Enter')

    // The live terminal is never altered: the renderer receives and draws the raw text.
    await expect
      .poll(() => page.evaluate(() => window.__ptyData), { timeout: 15_000 })
      .toContain(`${FAKE_TOKEN} --password ${FAKE_PASSWORD}`)
    await expect
      .poll(
        () => page.evaluate(() => Array.from(document.querySelectorAll('.xterm-rows')).map((r) => r.innerText).join('\n')),
        { timeout: 10_000 }
      )
      .toContain(FAKE_TOKEN)

    // Review Session sends the terminal transcript to the (mock) provider through the same
    // runAIAction path as Explain & fix (whose request shape is covered by unit tests).
    const review = page.getByRole('button', { name: 'Review Session' })
    await review.waitFor({ state: 'visible', timeout: 15_000 })
    await review.click()
    await expect.poll(() => mock.bodies.length, { timeout: 15_000 }).toBeGreaterThan(0)

    const sent = mock.bodies.join('\n')
    expect(sent).not.toContain(FAKE_TOKEN)
    expect(sent).not.toContain(FAKE_PASSWORD)
    expect(sent).toContain('[hidden: GitHub token]')
    expect(sent).toContain('[hidden: password]')

    // End the shell so the session log is written, then read it back.
    await input.focus()
    await page.keyboard.type('exit')
    await page.keyboard.press('Enter')

    const logIndex = () => page.evaluate((id) => window.electronAPI.getLogIndex(id), project.id)
    await expect.poll(logIndex, { timeout: 20_000 }).toHaveLength(1)
    const logs = await logIndex()
    const saved = await page.evaluate((path) => window.electronAPI.readLogContent(path), logs[0].logFilePath)
    expect(saved).not.toContain(FAKE_TOKEN)
    expect(saved).not.toContain(FAKE_PASSWORD)
    expect(saved).toContain('[hidden: GitHub token]')

    // The Privacy tab counts kinds only.
    const stats = await page.evaluate(() => window.electronAPI.getSecretMaskStats())
    expect(stats.ai['github-token']).toBeGreaterThanOrEqual(1)
    expect(stats.logs['github-token']).toBeGreaterThanOrEqual(1)
    expect(JSON.stringify(stats)).not.toContain(FAKE_TOKEN)

    await page.getByRole('button', { name: 'Close', exact: true }).click() // the AI review dialog
    await expect(page.locator('div.fixed.inset-0.z-\\[200\\]')).toHaveCount(0)
    await page.locator('button:has(svg.lucide-settings)').first().click()
    await page.getByRole('button', { name: 'Privacy' }).first().click()
    const summary = page.getByTestId('secret-mask-stats')
    await expect(summary).toContainText('Hidden from AI requests')
    await expect(summary).toContainText('GitHub token')
    await expect(summary).not.toContainText(FAKE_TOKEN)
    await expect(page.getByText('Hide secrets in logs and AI requests')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('privacy-tab.png') })
  } finally {
    await app.close()
    mock.close()
  }
})
